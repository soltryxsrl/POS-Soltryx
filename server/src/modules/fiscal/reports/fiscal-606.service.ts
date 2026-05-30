import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseOrderOrmEntity } from '../../purchases/purchase-order.orm-entity';
import { SupplierOrmEntity } from '../../suppliers/supplier.orm-entity';
import { FiscalDocumentOrmEntity } from '../documents/fiscal-document.orm-entity';

/**
 * Tipo de identificación DGII para el proveedor:
 *   1 = RNC, 2 = Cédula, 3 = Pasaporte (raro).
 * El proveedor en el 606 normalmente es RNC; cédula solo aplica a proveedores
 * personas físicas con cédula registrada.
 */
function tipoBienesServicios(): string {
  // Default: '09' = Otras compras y gastos de mercancía. Sin más contexto del
  // negocio, este es el catch-all más usado para retail.
  return '09';
}

function digits(s: string | null): string {
  return (s ?? '').replace(/\D+/g, '');
}

function ymd(dateStr: string): string {
  // Acepta YYYY-MM-DD y devuelve YYYYMMDD.
  return dateStr.replace(/-/g, '');
}

export interface Fiscal606Row {
  /** RNC o cédula del proveedor (solo dígitos). */
  rncCedula: string;
  /** 1 = RNC, 2 = Cédula. */
  tipoIdentificacion: string;
  /** Tipo de bienes/servicios DGII (default '09' = Mercancía / otros). */
  tipoBienesServicios: string;
  /** NCF del comprobante recibido. */
  ncf: string;
  /** NCF que se está modificando, solo para notas de débito (no implementado). */
  ncfModificado: string;
  /** YYYYMMDD del comprobante del proveedor. */
  fechaComprobante: string;
  /** YYYYMMDD de pago (lo dejamos vacío — T1ET no rastrea pago de la factura aún). */
  fechaPago: string;
  /** Subtotal facturado (servicios). 0 por defecto en retail. */
  montoServicios: string;
  /** Subtotal facturado (bienes). */
  montoBienes: string;
  /** Total facturado con ITBIS. */
  totalFacturado: string;
  /** ITBIS facturado. */
  itbisFacturado: string;
  // Helpers para UI (no van al TXT DGII).
  purchaseOrderId: string;
  orderNumber: string;
  supplierName: string;
  supplierFiscalDocTypeCode: string;
}

export interface Fiscal606Summary {
  totalRows: number;
  totalFacturado: string;
  totalItbis: string;
  /** Cantidad de compras incluidas (con NCF de proveedor). */
  comprasConNcf: number;
}

@Injectable()
export class Fiscal606Service {
  constructor(
    @InjectRepository(PurchaseOrderOrmEntity)
    private readonly orders: Repository<PurchaseOrderOrmEntity>,
    @InjectRepository(SupplierOrmEntity)
    private readonly suppliers: Repository<SupplierOrmEntity>,
    @InjectRepository(FiscalDocumentOrmEntity)
    private readonly fiscalDocs: Repository<FiscalDocumentOrmEntity>,
  ) {}

  /**
   * Genera filas del 606 para el rango [from, to] (inclusive). Solo incluye
   * órdenes de compra que tengan un NCF de proveedor capturado (no cancelladas,
   * con `supplier_ncf` y `supplier_fiscal_doc_type_code` no nulos).
   */
  async generate(
    from: string,
    to: string,
  ): Promise<{ rows: Fiscal606Row[]; summary: Fiscal606Summary }> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      throw new BadRequestException(
        'from / to deben tener formato YYYY-MM-DD',
      );
    }
    if (from > to) {
      throw new BadRequestException('from no puede ser posterior a to');
    }

    const pos = await this.orders
      .createQueryBuilder('po')
      .where('po.supplierNcf IS NOT NULL')
      .andWhere('po.supplierFiscalDocTypeCode IS NOT NULL')
      .andWhere('po.supplierInvoiceDate BETWEEN :from AND :to', { from, to })
      .andWhere('po.status <> :cancelled', { cancelled: 'CANCELLED' })
      .orderBy('po.supplierInvoiceDate', 'ASC')
      .addOrderBy('po.createdAt', 'ASC')
      .getMany();

    // Standalone documents: E41/E43 (e-CF) y B11/B13 (NCF tradicional) que TÚ
    // emites para compras informales y gastos menores. Cuentan para el 606.
    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T23:59:59.999Z`);
    const standaloneDocs = await this.fiscalDocs
      .createQueryBuilder('d')
      .where('d.issueDate BETWEEN :from AND :to', { from: fromDate, to: toDate })
      .andWhere('d.docType IN (:...types)', {
        types: ['E41', 'E43', 'B11', 'B13'],
      })
      .andWhere('d.status <> :cancelled', { cancelled: 'CANCELLED' })
      .orderBy('d.issueDate', 'ASC')
      .addOrderBy('d.createdAt', 'ASC')
      .getMany();

    if (pos.length === 0 && standaloneDocs.length === 0) {
      return {
        rows: [],
        summary: {
          totalRows: 0,
          totalFacturado: '0.00',
          totalItbis: '0.00',
          comprasConNcf: 0,
        },
      };
    }

    const supplierIds = [...new Set(pos.map((p) => p.supplierId))];
    const suppliers = supplierIds.length
      ? await this.suppliers.find({
          where: supplierIds.map((id) => ({ id })),
        })
      : [];
    const supplierById = new Map(suppliers.map((s) => [s.id, s]));

    let totalFacturadoCents = 0;
    let totalItbisCents = 0;

    const poRows: Fiscal606Row[] = pos.map((po) => {
      const supplier = supplierById.get(po.supplierId);
      const supplierName = supplier?.tradeName ?? '?';
      const supplierRnc = supplier?.rnc ?? null;

      totalFacturadoCents += Math.round(Number(po.total) * 100);
      totalItbisCents += Math.round(Number(po.taxTotal) * 100);

      // Si el proveedor tiene RNC, el tipoIdentificación es 1; default a 1
      // aunque no haya RNC porque el tipo B01/B14 lo exige.
      const tipoId = supplierRnc ? '1' : '';

      return {
        rncCedula: digits(supplierRnc),
        tipoIdentificacion: tipoId,
        tipoBienesServicios: tipoBienesServicios(),
        ncf: po.supplierNcf!,
        ncfModificado: '',
        fechaComprobante: ymd(po.supplierInvoiceDate!),
        fechaPago: '',
        montoServicios: '0.00',
        montoBienes: po.subtotal,
        totalFacturado: po.total,
        itbisFacturado: po.taxTotal,
        purchaseOrderId: po.id,
        orderNumber: po.orderNumber,
        supplierName,
        supplierFiscalDocTypeCode: po.supplierFiscalDocTypeCode!,
      };
    });

    // Filas de E41/E43/B11/B13 — el "proveedor" vive en buyerName/buyerRnc del
    // fiscal_document (lo usamos como contraparte para estos casos).
    const standaloneRows: Fiscal606Row[] = standaloneDocs.map((d) => {
      totalFacturadoCents += Math.round(Number(d.total) * 100);
      totalItbisCents += Math.round(Number(d.taxTotal) * 100);
      const supplierRnc = d.buyerRnc;
      const tipoId = supplierRnc ? '1' : '';
      return {
        rncCedula: digits(supplierRnc),
        tipoIdentificacion: tipoId,
        // E43/B13 (gastos menores) → tipo '11' Gastos menores
        // E41/B11 (compras informales) → tipo '09' default
        tipoBienesServicios:
          d.docType === 'E43' || d.docType === 'B13' ? '11' : '09',
        ncf: d.ncf,
        ncfModificado: '',
        fechaComprobante: ymd(d.issueDate.toISOString().slice(0, 10)),
        fechaPago: '',
        montoServicios: '0.00',
        montoBienes: d.subtotal,
        totalFacturado: d.total,
        itbisFacturado: d.taxTotal,
        purchaseOrderId: d.id,
        orderNumber: d.ncf, // No hay PO; usamos el NCF como "número de referencia".
        supplierName: d.buyerName ?? 'Sin contraparte',
        supplierFiscalDocTypeCode: d.docType,
      };
    });

    // Combinar y ordenar por fechaComprobante (ya vienen ordenados por query).
    const rows: Fiscal606Row[] = [...poRows, ...standaloneRows].sort((a, b) =>
      a.fechaComprobante.localeCompare(b.fechaComprobante),
    );

    return {
      rows,
      summary: {
        totalRows: rows.length,
        totalFacturado: (totalFacturadoCents / 100).toFixed(2),
        totalItbis: (totalItbisCents / 100).toFixed(2),
        comprasConNcf: rows.length,
      },
    };
  }

  /**
   * Genera el TXT pipe-delimited del 606. Columnas (orden DGII):
   *
   *   1. RNC/Cédula del proveedor
   *   2. Tipo Identificación (1=RNC, 2=Cédula)
   *   3. Tipo Bienes y Servicios Comprados (código 01-12; default '09')
   *   4. NCF
   *   5. NCF Modificado (vacío para compras normales)
   *   6. Fecha del Comprobante (YYYYMMDD)
   *   7. Fecha de Pago (YYYYMMDD; vacío si no rastreado)
   *   8. Monto Facturado en Servicios
   *   9. Monto Facturado en Bienes
   *  10. Total Monto Facturado
   *  11. ITBIS Facturado
   *  12. ITBIS Retenido (0 — T1ET no retiene)
   *  13. ITBIS sujeto a Proporcionalidad (0)
   *  14. ITBIS llevado al Costo (0)
   *  15. ITBIS por Adelantar (0)
   *  16. ITBIS percibido (0)
   *  17. Tipo de Retención en ISR (vacío)
   *  18. Monto Retención Renta (0)
   *  19. ISR Percibido (0)
   *  20. Impuesto Selectivo al Consumo (0)
   *  21. Otros Impuestos/Tasas (0)
   *  22. Monto Propina Legal (0)
   *  23. Forma de Pago (default '01' efectivo — T1ET no rastrea la forma de
   *      pago a proveedores aún)
   */
  toTxt(rows: Fiscal606Row[]): string {
    return rows
      .map((r) => {
        const cols = [
          r.rncCedula,             // 1
          r.tipoIdentificacion,    // 2
          r.tipoBienesServicios,   // 3
          r.ncf,                   // 4
          r.ncfModificado,         // 5
          r.fechaComprobante,      // 6
          r.fechaPago,             // 7
          r.montoServicios,        // 8
          r.montoBienes,           // 9
          r.totalFacturado,        // 10
          r.itbisFacturado,        // 11
          '0.00',                  // 12 ITBIS Retenido
          '0.00',                  // 13 Proporcionalidad
          '0.00',                  // 14 Costo
          '0.00',                  // 15 Por adelantar
          '0.00',                  // 16 Percibido
          '',                      // 17 Tipo retención ISR
          '0.00',                  // 18 Retención Renta
          '0.00',                  // 19 ISR Percibido
          '0.00',                  // 20 Impuesto selectivo
          '0.00',                  // 21 Otros impuestos
          '0.00',                  // 22 Propina (no aplica en compras)
          '01',                    // 23 Forma de pago default
        ];
        return cols.join('|');
      })
      .join('\n');
  }
}
