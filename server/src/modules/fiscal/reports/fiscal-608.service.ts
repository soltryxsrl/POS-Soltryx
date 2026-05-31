import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FiscalDocumentOrmEntity } from '../documents/fiscal-document.orm-entity';

function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

export interface Fiscal608Row {
  ncf: string;
  /** YYYYMMDD de la anulación. */
  fechaAnulacion: string;
  /** Tipo de anulación DGII (01..09). */
  tipoAnulacion: string;
  // Helpers UI (no van al TXT).
  docType: string;
  buyerName: string | null;
}

export interface Fiscal608Summary {
  totalRows: number;
}

/**
 * Reporte 608 — Comprobantes ANULADOS. Lista los NCF marcados como anulados
 * (voided) en el período. Son NCF quemados sin transacción (no van al 606/607).
 */
@Injectable()
export class Fiscal608Service {
  constructor(
    @InjectRepository(FiscalDocumentOrmEntity)
    private readonly docs: Repository<FiscalDocumentOrmEntity>,
  ) {}

  async generate(
    from: string,
    to: string,
    branchId: string | null,
  ): Promise<{ rows: Fiscal608Row[]; summary: Fiscal608Summary }> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      throw new BadRequestException('from / to deben tener formato YYYY-MM-DD');
    }
    if (from > to) {
      throw new BadRequestException('from no puede ser posterior a to');
    }
    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T23:59:59.999Z`);

    const docs = await this.docs
      .createQueryBuilder('d')
      .where('d.voidedAt BETWEEN :from AND :to', { from: fromDate, to: toDate })
      // branchId null = consolidado (todas las sucursales).
      .andWhere('(:branchId::uuid IS NULL OR d.branchId = :branchId)', { branchId })
      .orderBy('d.voidedAt', 'ASC')
      .getMany();

    const rows: Fiscal608Row[] = docs.map((d) => ({
      ncf: d.ncf,
      fechaAnulacion: d.voidedAt ? ymd(d.voidedAt) : '',
      tipoAnulacion: d.voidType ?? '',
      docType: d.docType,
      buyerName: d.buyerName,
    }));

    return { rows, summary: { totalRows: rows.length } };
  }

  /**
   * TXT pipe-delimited del 608. Columnas DGII:
   *   1. NCF / e-NCF
   *   2. Fecha de Anulación (YYYYMMDD)
   *   3. Tipo de Anulación (01..09)
   */
  toTxt(rows: Fiscal608Row[]): string {
    return rows
      .map((r) => [r.ncf, r.fechaAnulacion, r.tipoAnulacion].join('|'))
      .join('\n');
  }
}
