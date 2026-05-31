import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerOrmEntity } from '../../customers/customer.orm-entity';
import { PaymentOrmEntity } from '../../sales/infrastructure/persistence/typeorm/payment.orm-entity';
import { SaleOrmEntity } from '../../sales/infrastructure/persistence/typeorm/sale.orm-entity';
import { FiscalDocumentOrmEntity } from '../documents/fiscal-document.orm-entity';

/**
 * Tipo de identificación DGII para el comprador en el 607:
 *   1 = RNC
 *   2 = Cédula
 *   3 = Pasaporte (rara vez se reporta; lo dejamos vacío en el TXT)
 */
function tipoIdentificacion(documentType: string | null): string {
  if (documentType === 'RNC') return '1';
  if (documentType === 'CEDULA') return '2';
  return '';
}

/**
 * Forma de pago DGII (607 columna "Forma de Pago"):
 *   01 = Efectivo
 *   02 = Cheque/Transferencia/Depósito
 *   03 = Tarjeta Débito/Crédito
 *   04 = Venta a Crédito (crédito)
 *   05 = Bonos o Certificados
 *   06 = Permuta
 *   07 = Otras
 *
 * Para ventas con pago mixto, devolvemos el código del método con mayor monto.
 * Si no hay pagos (raro), default '01'.
 */
function formaPago(payments: PaymentOrmEntity[]): string {
  if (payments.length === 0) return '01';
  const byMethod = new Map<string, number>();
  for (const p of payments) {
    const cents = Math.round(Number(p.amount) * 100);
    byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + cents);
  }
  const dominant = [...byMethod.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  switch (dominant) {
    case 'CASH':
      return '01';
    case 'TRANSFER':
      return '02';
    case 'CARD':
      return '03';
    case 'ACCOUNT':
      return '04';
    default:
      return '07';
  }
}

/** Normaliza un documento (cédula/RNC) a solo dígitos. */
function digits(s: string | null): string {
  return (s ?? '').replace(/\D+/g, '');
}

function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

export interface Fiscal607Row {
  /** Tipo de identificación (1=RNC, 2=Cédula, vacío si consumidor final). */
  tipoIdentificacion: string;
  /** Documento del comprador, solo dígitos. Vacío si consumidor final. */
  documento: string;
  ncf: string;
  /** NCF de la factura original, solo para notas crédito (E34/B04). Vacío si no aplica. */
  ncfModificado: string;
  /** Código DGII de tipo de ingreso. Default '01' = Ingresos por Operaciones. */
  tipoIngreso: string;
  /** YYYYMMDD del comprobante. */
  fechaComprobante: string;
  /** Subtotal facturado (bienes). */
  montoFacturado: string;
  /** ITBIS facturado. */
  itbisFacturado: string;
  /** Propina legal (Ley 16-92, 10% en establecimientos de consumo). */
  propinaLegal: string;
  /** Código de forma de pago DGII. */
  formaPago: string;
  // Helpers para la UI (no van al TXT DGII).
  saleId: string;
  saleNumber: string;
  docType: string;
  buyerName: string | null;
  total: string;
}

export interface Fiscal607Summary {
  totalRows: number;
  totalFacturado: string;
  totalItbis: string;
  totalPropina: string;
  /** Cantidad de notas de crédito en el periodo. */
  notasCredito: number;
}

@Injectable()
export class Fiscal607Service {
  constructor(
    @InjectRepository(FiscalDocumentOrmEntity)
    private readonly docs: Repository<FiscalDocumentOrmEntity>,
    @InjectRepository(SaleOrmEntity)
    private readonly sales: Repository<SaleOrmEntity>,
    @InjectRepository(PaymentOrmEntity)
    private readonly payments: Repository<PaymentOrmEntity>,
    @InjectRepository(CustomerOrmEntity)
    private readonly customers: Repository<CustomerOrmEntity>,
  ) {}

  /**
   * Genera las filas del 607 para el rango [from, to] (inclusive).
   * `from` y `to` son fechas ISO (YYYY-MM-DD).
   *
   * Incluye TODOS los comprobantes emitidos en el rango, sin importar el
   * status: el original (incluso CANCELLED) se reporta porque la NCF fue
   * asignada, y la nota de crédito se reporta como un row aparte que apunta
   * a la original via "NCF modificado".
   */
  async generate(from: string, to: string, branchId: string | null): Promise<{
    rows: Fiscal607Row[];
    summary: Fiscal607Summary;
  }> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      throw new BadRequestException(
        'from / to deben tener formato YYYY-MM-DD',
      );
    }
    if (from > to) {
      throw new BadRequestException('from no puede ser posterior a to');
    }

    // Cota superior inclusiva: ajustamos al fin del día.
    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T23:59:59.999Z`);

    // Solo comprobantes de venta. Las compras (E41/E43/B11/B13) van al 606.
    const SALE_TYPES = ['B01', 'B02', 'B03', 'B04', 'E31', 'E32', 'E33', 'E34'];

    const docsRaw = await this.docs
      .createQueryBuilder('d')
      .where('d.issueDate BETWEEN :from AND :to', { from: fromDate, to: toDate })
      // branchId null = consolidado (todas las sucursales).
      .andWhere('(:branchId::uuid IS NULL OR d.branchId = :branchId)', { branchId })
      .andWhere('d.docType IN (:...types)', { types: SALE_TYPES })
      .andWhere('d.saleId IS NOT NULL')
      .orderBy('d.issueDate', 'ASC')
      .addOrderBy('d.createdAt', 'ASC')
      .getMany();
    // Tipo narrow: por el WHERE saleId IS NOT NULL, ya garantizamos no-null.
    const docs = docsRaw as Array<typeof docsRaw[number] & { saleId: string }>;

    if (docs.length === 0) {
      return {
        rows: [],
        summary: {
          totalRows: 0,
          totalFacturado: '0.00',
          totalItbis: '0.00',
          totalPropina: '0.00',
          notasCredito: 0,
        },
      };
    }

    // Solo tipos de VENTA (B01-B04, E31-E34) — todos tienen sale_id no nulo.
    // El query ya filtra por SALE_TYPES, pero el campo es nullable a nivel
    // de schema (E41/E43/etc. no lo necesitan); aseguramos el cast aquí.
    const saleIds = [
      ...new Set(docs.map((d) => d.saleId).filter((v): v is string => !!v)),
    ];
    const sales = await this.sales.find({ where: saleIds.map((id) => ({ id })) });
    const saleById = new Map(sales.map((s) => [s.id, s]));

    // Pagos para deducir forma de pago dominante.
    const payments = await this.payments
      .createQueryBuilder('p')
      .where('p.saleId IN (:...ids)', { ids: saleIds })
      .getMany();
    const paymentsBySale = new Map<string, PaymentOrmEntity[]>();
    for (const p of payments) {
      const list = paymentsBySale.get(p.saleId) ?? [];
      list.push(p);
      paymentsBySale.set(p.saleId, list);
    }

    // Clientes para deducir tipo de identificación (cuando el comprobante
    // tiene buyerRnc solo lo tratamos como RNC; pero si NO tiene buyer info
    // y la venta sí tenía cliente con cédula, lo reportamos como cédula).
    const customerIds = [
      ...new Set(
        sales.map((s) => s.customerId).filter((c): c is string => !!c),
      ),
    ];
    const customers = customerIds.length
      ? await this.customers.find({ where: customerIds.map((id) => ({ id })) })
      : [];
    const customerById = new Map(customers.map((c) => [c.id, c]));

    // Para resolver "NCF modificado" en notas crédito: lookup del NCF original
    // a través del sale_id. Una nota crédito comparte sale_id con su factura.
    const originalNcfBySaleId = new Map<string, string>();
    for (const d of docs) {
      const isCreditNote = d.docType === 'E34' || d.docType === 'B04';
      const isOriginalFactura =
        d.docType === 'E31' ||
        d.docType === 'E32' ||
        d.docType === 'B01' ||
        d.docType === 'B02';
      if (isOriginalFactura) {
        originalNcfBySaleId.set(d.saleId, d.ncf);
      }
      // Si la nota crédito apunta a una factura emitida FUERA del rango,
      // tenemos que buscarla aparte.
      // (Lo manejamos abajo con una query extra si hace falta.)
      void isCreditNote;
    }

    // Notas crédito cuyo original no está en el rango actual: buscar el NCF
    // original en una query separada.
    const orphanedCreditNoteSaleIds: string[] = [];
    for (const d of docs) {
      if ((d.docType === 'E34' || d.docType === 'B04') && !originalNcfBySaleId.has(d.saleId)) {
        orphanedCreditNoteSaleIds.push(d.saleId);
      }
    }
    if (orphanedCreditNoteSaleIds.length > 0) {
      const originals = await this.docs
        .createQueryBuilder('d')
        .where('d.saleId IN (:...ids)', { ids: orphanedCreditNoteSaleIds })
        .andWhere('d.docType IN (:...types)', {
          types: ['B01', 'B02', 'E31', 'E32'],
        })
        .getMany();
      for (const o of originals) {
        if (o.saleId) originalNcfBySaleId.set(o.saleId, o.ncf);
      }
    }

    let totalFacturadoCents = 0;
    let totalItbisCents = 0;
    let totalPropinaCents = 0;
    let notasCredito = 0;

    const rows: Fiscal607Row[] = docs.map((d) => {
      const sale = saleById.get(d.saleId);
      const customer = sale?.customerId ? customerById.get(sale.customerId) : null;
      const isCreditNote = d.docType === 'E34' || d.docType === 'B04';
      if (isCreditNote) notasCredito += 1;

      // Tipo identificación: prioriza el snapshot del fiscal_document si tiene
      // RNC; si no, usa el documentType del cliente vinculado.
      let tipoId = '';
      let doc = '';
      if (d.buyerRnc) {
        tipoId = '1';
        doc = digits(d.buyerRnc);
      } else if (customer?.documentType && customer.document) {
        tipoId = tipoIdentificacion(customer.documentType);
        doc = digits(customer.document);
      }

      const ncfModificado = isCreditNote
        ? originalNcfBySaleId.get(d.saleId) ?? ''
        : '';

      const propinaLegal = sale?.tipTotal ?? '0.00';

      totalFacturadoCents += Math.round(Number(d.total) * 100);
      totalItbisCents += Math.round(Number(d.taxTotal) * 100);
      totalPropinaCents += Math.round(Number(propinaLegal) * 100);

      return {
        tipoIdentificacion: tipoId,
        documento: doc,
        ncf: d.ncf,
        ncfModificado,
        tipoIngreso: '01',
        fechaComprobante: ymd(d.issueDate),
        montoFacturado: d.subtotal,
        itbisFacturado: d.taxTotal,
        propinaLegal,
        formaPago: formaPago(paymentsBySale.get(d.saleId) ?? []),
        saleId: d.saleId,
        saleNumber: sale?.saleNumber ?? '',
        docType: d.docType,
        buyerName: d.buyerName,
        total: d.total,
      };
    });

    return {
      rows,
      summary: {
        totalRows: rows.length,
        totalFacturado: (totalFacturadoCents / 100).toFixed(2),
        totalItbis: (totalItbisCents / 100).toFixed(2),
        totalPropina: (totalPropinaCents / 100).toFixed(2),
        notasCredito,
      },
    };
  }

  /**
   * Genera el archivo TXT pipe-delimited en el formato que DGII espera para
   * el 607. Cada línea es un comprobante; columnas separadas por "|" y al
   * final de cada registro un newline.
   *
   * Columnas (orden DGII):
   *   1. RNC/Cédula
   *   2. Tipo Identificación (1=RNC, 2=Cédula)
   *   3. NCF
   *   4. NCF Modificado (si es nota de crédito; vacío si no)
   *   5. Tipo de Ingreso (01..06)
   *   6. Fecha del Comprobante (YYYYMMDD)
   *   7. Fecha de Retención (vacío — T1ET no retiene)
   *   8. Monto Facturado en Servicios (0)
   *   9. Monto Facturado en Bienes (subtotal)
   *  10. Total Monto Facturado (total con ITBIS)
   *  11. ITBIS Facturado
   *  12. ITBIS Retenido (0)
   *  13. ITBIS Percibido (0)
   *  14. Retención Renta (0)
   *  15. ISR Percibido (0)
   *  16. Impuesto Selectivo al Consumo (0)
   *  17. Otros Impuestos/Tasas (0)
   *  18. Monto Propina Legal
   *  19. Forma de Pago
   */
  toTxt(rows: Fiscal607Row[]): string {
    return rows
      .map((r) => {
        const subtotal = r.montoFacturado;
        const total = (
          Math.round(Number(r.montoFacturado) * 100) +
          Math.round(Number(r.itbisFacturado) * 100)
        ) / 100;
        const totalStr = total.toFixed(2);
        const cols = [
          r.documento,            // 1
          r.tipoIdentificacion,    // 2
          r.ncf,                   // 3
          r.ncfModificado,         // 4
          r.tipoIngreso,           // 5
          r.fechaComprobante,      // 6
          '',                      // 7 fecha retención (no aplica)
          '0.00',                  // 8 servicios
          subtotal,                // 9 bienes
          totalStr,                // 10 total
          r.itbisFacturado,        // 11
          '0.00',                  // 12
          '0.00',                  // 13
          '0.00',                  // 14
          '0.00',                  // 15
          '0.00',                  // 16
          '0.00',                  // 17
          r.propinaLegal,          // 18
          r.formaPago,             // 19
        ];
        return cols.join('|');
      })
      .join('\n');
  }
}
