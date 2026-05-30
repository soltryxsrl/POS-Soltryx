import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import type { TransactionContext } from '../../../common/persistence/unit-of-work.port';
import { FiscalDocTypeOrmEntity } from '../doc-types/fiscal-doc-type.orm-entity';
import { FiscalSequencesService } from '../sequences/fiscal-sequences.service';
import { FiscalDocumentItemOrmEntity } from './fiscal-document-item.orm-entity';
import { FiscalDocumentOrmEntity } from './fiscal-document.orm-entity';
import {
  FISCAL_PROVIDER_PORT,
  type FiscalProviderPort,
} from './fiscal-provider.port';

export interface IssueFiscalDocumentInput {
  /** Código DGII del tipo de comprobante (B01/B02/E31/E32/etc.). */
  docTypeCode: string;
  saleId: string;
  branchId: string | null;
  /** Datos del comprador para snapshot en el doc fiscal. */
  buyerName: string | null;
  buyerRnc: string | null;
  subtotal: string;
  taxTotal: string;
  total: string;
  items: Array<{
    description: string;
    quantity: string;
    unitPrice: string;
    discount: string;
    taxRate: string;
    taxTotal: string;
    total: string;
  }>;
}

/**
 * Standalone (sin venta): para compras informales (E41/B11) y gastos menores
 * (E43/B13). El "comprador" en estos casos somos NOSOTROS, y el `buyerName/
 * buyerRnc` actúa como contraparte (proveedor informal, persona del gasto).
 */
export interface IssueStandaloneDocumentInput {
  docTypeCode: string;
  branchId: string | null;
  counterpartyName: string | null;
  counterpartyRnc: string | null;
  subtotal: string;
  taxTotal: string;
  total: string;
  items: Array<{
    description: string;
    quantity: string;
    unitPrice: string;
    discount: string;
    taxRate: string;
    taxTotal: string;
    total: string;
  }>;
}

const STANDALONE_TYPES = new Set(['E41', 'E43', 'B11', 'B13']);

export interface ListFiscalDocumentsParams {
  /** Búsqueda por NCF parcial. */
  q?: string;
  docType?: string;
  status?: string;
  /** Rango por issue_date (ISO date). */
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface FiscalDocumentListItem {
  id: string;
  /** Null para documentos standalone (E41/E43/B11/B13). */
  saleId: string | null;
  docType: string;
  ncf: string;
  issueDate: string;
  buyerName: string | null;
  buyerRnc: string | null;
  subtotal: string;
  taxTotal: string;
  total: string;
  status: string;
  createdAt: string;
}

export interface FiscalDocumentsListResponse {
  items: FiscalDocumentListItem[];
  total: number;
}

@Injectable()
export class FiscalDocumentsService {
  constructor(
    @InjectRepository(FiscalDocTypeOrmEntity)
    private readonly docTypes: Repository<FiscalDocTypeOrmEntity>,
    @InjectRepository(FiscalDocumentOrmEntity)
    private readonly docs: Repository<FiscalDocumentOrmEntity>,
    private readonly sequences: FiscalSequencesService,
    @Inject(FISCAL_PROVIDER_PORT)
    private readonly provider: FiscalProviderPort,
  ) {}

  async list(params: ListFiscalDocumentsParams): Promise<FiscalDocumentsListResponse> {
    const limit = Math.min(params.limit ?? 50, 200);
    const offset = params.offset ?? 0;
    const qb = this.docs
      .createQueryBuilder('d')
      .orderBy('d.issueDate', 'DESC')
      .addOrderBy('d.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    if (params.q) {
      const term = `%${params.q.toUpperCase()}%`;
      qb.andWhere(
        new Brackets((b) => {
          b.where('UPPER(d.ncf) LIKE :t', { t: term })
            .orWhere('UPPER(d.buyerName) LIKE :t', { t: term })
            .orWhere('d.buyerRnc LIKE :t', { t: term });
        }),
      );
    }
    if (params.docType) qb.andWhere('d.docType = :dt', { dt: params.docType });
    if (params.status) qb.andWhere('d.status = :st', { st: params.status });
    if (params.from) qb.andWhere('d.issueDate >= :from', { from: params.from });
    if (params.to) qb.andWhere('d.issueDate <= :to', { to: params.to });

    const [rows, total] = await qb.getManyAndCount();
    return {
      items: rows.map((d) => ({
        id: d.id,
        saleId: d.saleId,
        docType: d.docType,
        ncf: d.ncf,
        issueDate: d.issueDate.toISOString(),
        buyerName: d.buyerName,
        buyerRnc: d.buyerRnc,
        subtotal: d.subtotal,
        taxTotal: d.taxTotal,
        total: d.total,
        status: d.status,
        createdAt: d.createdAt.toISOString(),
      })),
      total,
    };
  }

  /**
   * Emite un comprobante fiscal asociado a una venta — DEBE llamarse dentro
   * de la transacción de creación de la venta. Pasos:
   *
   *   1. Valida que el tipo exista, esté activo y aplique a SALE.
   *   2. Si el tipo `requiresBuyerRnc=true`, exige `buyerRnc` no-null.
   *   3. Reserva el siguiente NCF con lock pesimista (concurrent-safe).
   *   4. Persiste `fiscal_documents` + sus items.
   *   5. Publica al proveedor externo (en este sprint: no-op + log).
   *
   * Devuelve la entity persistida. El caller debe linkear
   * `sales.fiscal_document_id` con `result.id`.
   */
  async issueForSale(
    ctx: TransactionContext,
    input: IssueFiscalDocumentInput,
  ): Promise<FiscalDocumentOrmEntity> {
    const docType = await this.docTypes.findOne({
      where: { code: input.docTypeCode },
    });
    if (!docType) {
      throw new NotFoundException(
        `Tipo de comprobante ${input.docTypeCode} no encontrado`,
      );
    }
    if (!docType.isActive) {
      throw new ConflictException(
        `Tipo ${docType.code} está desactivado. Actívalo en Tipos de Comprobantes.`,
      );
    }
    if (docType.appliesTo !== 'SALE' && docType.appliesTo !== 'BOTH') {
      throw new BadRequestException(
        `Tipo ${docType.code} no aplica a ventas (appliesTo=${docType.appliesTo})`,
      );
    }
    if (docType.requiresBuyerRnc && !input.buyerRnc) {
      throw new BadRequestException(
        `Tipo ${docType.code} requiere RNC del comprador. Asigna un cliente con documento RNC.`,
      );
    }

    const next = await this.sequences.getNextNCF(ctx, docType.code);

    const repo = ctx.manager.getRepository(FiscalDocumentOrmEntity);
    const itemsRepo = ctx.manager.getRepository(FiscalDocumentItemOrmEntity);

    const doc = await repo.save(
      repo.create({
        branchId: input.branchId,
        saleId: input.saleId,
        docType: docType.code,
        ncf: next.ncf,
        issueDate: new Date(),
        buyerRnc: input.buyerRnc,
        buyerName: input.buyerName,
        subtotal: input.subtotal,
        taxTotal: input.taxTotal,
        total: input.total,
        status: 'ISSUED',
      }),
    );

    const itemEntities = input.items.map((it, idx) =>
      itemsRepo.create({
        fiscalDocumentId: doc.id,
        sequence: idx + 1,
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discount: it.discount,
        taxRate: it.taxRate,
        taxTotal: it.taxTotal,
        total: it.total,
      }),
    );
    await itemsRepo.save(itemEntities);

    // Publicar al proveedor — no bloquea la transacción si falla el adapter
    // real (futuro). El no-op solo loggea.
    try {
      await this.provider.publish(doc);
    } catch (err) {
      // No revertimos la venta — el NCF ya está asignado y persistido. La
      // publicación es una preocupación separada que se retentará por otro
      // mecanismo (cron / worker) cuando exista el provider real.
      // eslint-disable-next-line no-console
      console.error(`[fiscal] publish failed for ncf=${doc.ncf}:`, err);
    }

    return doc;
  }

  /**
   * Emite un comprobante standalone (sin venta): E41/B11 compras informales
   * o E43/B13 gastos menores. Usa una transacción propia porque no depende
   * de otra operación (a diferencia de issueForSale que se acopla a la venta).
   */
  async issueStandalone(
    input: IssueStandaloneDocumentInput,
  ): Promise<FiscalDocumentOrmEntity> {
    if (!STANDALONE_TYPES.has(input.docTypeCode)) {
      throw new BadRequestException(
        `Tipo ${input.docTypeCode} no aplica para documentos standalone. ` +
          `Usa E41/E43 (e-CF) o B11/B13 (NCF tradicional).`,
      );
    }
    const docType = await this.docTypes.findOne({
      where: { code: input.docTypeCode },
    });
    if (!docType) {
      throw new NotFoundException(
        `Tipo de comprobante ${input.docTypeCode} no encontrado`,
      );
    }
    if (!docType.isActive) {
      throw new ConflictException(
        `Tipo ${docType.code} está desactivado. Actívalo en Tipos de Comprobantes.`,
      );
    }
    if (docType.appliesTo !== 'PURCHASE' && docType.appliesTo !== 'BOTH') {
      throw new BadRequestException(
        `Tipo ${docType.code} no aplica a compras (appliesTo=${docType.appliesTo})`,
      );
    }

    // Usamos una transacción nueva via la conexión por defecto del repo. Esto
    // garantiza atomicidad entre getNextNCF + insert (concurrent-safe).
    return this.docs.manager.transaction(async (manager) => {
      const ctx = { manager };
      const next = await this.sequences.getNextNCF(ctx, docType.code);

      const repo = manager.getRepository(FiscalDocumentOrmEntity);
      const itemsRepo = manager.getRepository(FiscalDocumentItemOrmEntity);

      const doc = await repo.save(
        repo.create({
          branchId: input.branchId,
          saleId: null,
          docType: docType.code,
          ncf: next.ncf,
          issueDate: new Date(),
          buyerRnc: input.counterpartyRnc,
          buyerName: input.counterpartyName,
          subtotal: input.subtotal,
          taxTotal: input.taxTotal,
          total: input.total,
          status: 'ISSUED',
        }),
      );

      if (input.items.length > 0) {
        const itemEntities = input.items.map((it, idx) =>
          itemsRepo.create({
            fiscalDocumentId: doc.id,
            sequence: idx + 1,
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discount: it.discount,
            taxRate: it.taxRate,
            taxTotal: it.taxTotal,
            total: it.total,
          }),
        );
        await itemsRepo.save(itemEntities);
      }

      try {
        await this.provider.publish(doc);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[fiscal] publish failed for ncf=${doc.ncf}:`, err);
      }
      return doc;
    });
  }
}
