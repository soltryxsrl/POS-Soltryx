import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  UNIT_OF_WORK,
  type UnitOfWork,
  type TransactionContext,
} from '../../../common/persistence/unit-of-work.port';
import { FiscalDocTypeOrmEntity } from '../doc-types/fiscal-doc-type.orm-entity';
import { FiscalSequenceOrmEntity } from './fiscal-sequence.orm-entity';
import type { CreateFiscalSequenceRequestDto } from './dto/create-sequence.request-dto';
import type { RenewFiscalSequenceRequestDto } from './dto/renew-sequence.request-dto';

export interface FiscalSequenceResponse {
  id: string;
  docType: string;
  prefix: string;
  rangeFrom: string;
  rangeTo: string;
  nextNumber: string;
  validUntil: string | null;
  isActive: boolean;
  /** Cantidad de NCFs ya consumidos (= nextNumber − rangeFrom). */
  consumed: number;
  /** Cantidad de NCFs disponibles (= rangeTo − nextNumber + 1). */
  remaining: number;
  /** Días restantes hasta vencimiento (null si no vence). */
  daysToExpire: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface NextNcfResult {
  ncf: string;
  sequenceId: string;
  remaining: number;
}

/**
 * Errores de dominio (mapeados a HTTP en el controller).
 */
export class FiscalSequenceExhaustedError extends Error {
  constructor(public docType: string) {
    super(`No hay secuencia activa con NCF disponibles para tipo ${docType}`);
    this.name = 'FiscalSequenceExhaustedError';
  }
}

export class FiscalSequenceExpiredError extends Error {
  constructor(public docType: string, public validUntil: string) {
    super(`La secuencia para ${docType} venció el ${validUntil}`);
    this.name = 'FiscalSequenceExpiredError';
  }
}

/**
 * Arma el NCF completo a partir del prefijo, el tipo y el serial.
 * DGII RD: e-CF (E31..E45) usa 10 dígitos de serial → 13 chars (E + 2 + 10);
 * NCF tradicional (B01..B16) usa 8 dígitos → 11 chars (B + 2 + 8).
 */
export function formatNcf(prefix: string, docType: string, serial: bigint): string {
  const padLength = docType.startsWith('E') ? 10 : 8;
  return `${prefix}${serial.toString().padStart(padLength, '0')}`;
}

@Injectable()
export class FiscalSequencesService {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @InjectRepository(FiscalSequenceOrmEntity)
    private readonly repo: Repository<FiscalSequenceOrmEntity>,
    @InjectRepository(FiscalDocTypeOrmEntity)
    private readonly docTypes: Repository<FiscalDocTypeOrmEntity>,
  ) {}

  async list(filter?: { docType?: string; activeOnly?: boolean }): Promise<FiscalSequenceResponse[]> {
    const qb = this.repo
      .createQueryBuilder('s')
      .orderBy('s.isActive', 'DESC')
      .addOrderBy('s.docType', 'ASC')
      .addOrderBy('s.createdAt', 'DESC');
    if (filter?.docType) qb.andWhere('s.docType = :dt', { dt: filter.docType });
    if (filter?.activeOnly) qb.andWhere('s.isActive = true');
    const rows = await qb.getMany();
    return rows.map(toResponse);
  }

  async findById(id: string): Promise<FiscalSequenceResponse> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`Secuencia ${id} no encontrada`);
    return toResponse(row);
  }

  async create(dto: CreateFiscalSequenceRequestDto): Promise<FiscalSequenceResponse> {
    await this.assertDocTypeExists(dto.docType);
    if (dto.rangeTo < dto.rangeFrom) {
      throw new BadRequestException('rangeTo debe ser >= rangeFrom');
    }

    return this.uow.run(async ({ manager }) => {
      // Desactivar cualquier secuencia activa previa del mismo (docType, prefix)
      // — el índice único parcial uq_fiscal_sequences_doc_type_prefix así lo exige.
      await manager
        .createQueryBuilder()
        .update(FiscalSequenceOrmEntity)
        .set({ isActive: false })
        .where('doc_type = :dt AND prefix = :p AND is_active = true', {
          dt: dto.docType,
          p: dto.prefix,
        })
        .execute();

      const saved = await manager.save(
        manager.create(FiscalSequenceOrmEntity, {
          docType: dto.docType,
          prefix: dto.prefix,
          rangeFrom: String(dto.rangeFrom),
          rangeTo: String(dto.rangeTo),
          nextNumber: String(dto.rangeFrom),
          validUntil: dto.validUntil ?? null,
          isActive: true,
        }),
      );
      return toResponse(saved);
    });
  }

  async renew(
    docType: string,
    dto: RenewFiscalSequenceRequestDto,
  ): Promise<FiscalSequenceResponse> {
    await this.assertDocTypeExists(docType);
    if (dto.rangeTo < dto.rangeFrom) {
      throw new BadRequestException('rangeTo debe ser >= rangeFrom');
    }
    // Si no se pasa prefix, reusamos el del rango activo (o último si ninguno activo).
    const previous = await this.repo
      .createQueryBuilder('s')
      .where('s.docType = :dt', { dt: docType })
      .orderBy('s.isActive', 'DESC')
      .addOrderBy('s.createdAt', 'DESC')
      .getOne();
    const prefix = dto.prefix ?? previous?.prefix ?? docType;

    return this.create({
      docType,
      prefix,
      rangeFrom: dto.rangeFrom,
      rangeTo: dto.rangeTo,
      validUntil: dto.validUntil,
    });
  }

  /**
   * Devuelve el siguiente NCF para `docType` e incrementa el contador en la
   * misma transacción del caller. Usar SIEMPRE desde dentro de un `uow.run()`.
   * Lanza si la secuencia no existe / está agotada / venció.
   */
  async getNextNCF(ctx: TransactionContext, docType: string): Promise<NextNcfResult> {
    const repo = ctx.manager.getRepository(FiscalSequenceOrmEntity);

    // Lock pesimista — evita carrera entre cajeros concurrentes.
    const seq = await repo
      .createQueryBuilder('s')
      .setLock('pessimistic_write')
      .where('s.docType = :dt AND s.isActive = true', { dt: docType })
      .orderBy('s.createdAt', 'DESC')
      .getOne();

    if (!seq) throw new FiscalSequenceExhaustedError(docType);

    const today = new Date().toISOString().slice(0, 10);
    if (seq.validUntil && seq.validUntil < today) {
      throw new FiscalSequenceExpiredError(docType, seq.validUntil);
    }

    const next = BigInt(seq.nextNumber);
    const max = BigInt(seq.rangeTo);
    if (next > max) throw new FiscalSequenceExhaustedError(docType);

    const ncf = formatNcf(seq.prefix, seq.docType, next);

    await repo.update(
      { id: seq.id },
      { nextNumber: (next + 1n).toString() },
    );

    const remaining = Number(max - next);
    return { ncf, sequenceId: seq.id, remaining };
  }

  private async assertDocTypeExists(code: string): Promise<void> {
    const dt = await this.docTypes.findOne({ where: { code } });
    if (!dt) {
      throw new BadRequestException(`Tipo de comprobante ${code} no existe`);
    }
    if (!dt.isActive) {
      throw new ConflictException(
        `Tipo ${code} está desactivado — actívalo en Tipos de Comprobantes antes`,
      );
    }
  }
}

function toResponse(s: FiscalSequenceOrmEntity): FiscalSequenceResponse {
  const next = BigInt(s.nextNumber);
  const from = BigInt(s.rangeFrom);
  const to = BigInt(s.rangeTo);
  const consumed = Number(next - from);
  const remaining = Math.max(0, Number(to - next + 1n));
  let daysToExpire: number | null = null;
  if (s.validUntil) {
    const v = new Date(s.validUntil);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    daysToExpire = Math.floor((v.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }
  return {
    id: s.id,
    docType: s.docType,
    prefix: s.prefix,
    rangeFrom: s.rangeFrom,
    rangeTo: s.rangeTo,
    nextNumber: s.nextNumber,
    validUntil: s.validUntil,
    isActive: s.isActive,
    consumed,
    remaining,
    daysToExpire,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}
