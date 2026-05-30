import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type {
  CashSession,
  DenominationCounts,
} from '../../domain/entities/cash-session.entity';
import type { CashMovement } from '../../domain/entities/cash-movement.entity';
import { CashSessionNotFoundError } from '../../domain/errors/cash-session.errors';
import {
  CASH_MOVEMENT_REPOSITORY,
  type CashMovementRepository,
} from '../../domain/ports/cash-movement.repository.port';
import {
  CASH_PAYMENT_TOTALS_PORT,
  type CashPaymentTotalsPort,
} from '../../domain/ports/cash-payment-totals.port';
import {
  CASH_SESSION_REPOSITORY,
  type CashSessionRepository,
} from '../../domain/ports/cash-session.repository.port';
import { CashSessionStatus } from '../../domain/value-objects/cash-session-status';
import { addMoney, subMoney } from '../math/money';

export interface SaleByMethodRow {
  method: string;
  count: number;
  /** Total registrado por el sistema (POS). */
  total: string;
  /** Monto declarado por el cajero al cerrar. Null si no se declaró. */
  declared: string | null;
  /** Diferencia declared − total. Null si declared es null. */
  difference: string | null;
}

export interface SaleItemAggRow {
  productNameSnapshot: string;
  productSkuSnapshot: string;
  /** Cantidad total vendida en el turno (suma sobre líneas COMPLETED). */
  quantity: string;
  /** Total facturado por ese producto (suma de `total` de las líneas). */
  total: string;
}

export interface SessionReport {
  /**
   * X = sesión abierta (snapshot intra-turno, no cierra).
   * Z = sesión cerrada (snapshot post-cierre, incluye contado y diferencia).
   */
  kind: 'X' | 'Z';
  session: CashSession;
  generatedAt: Date;

  // Aperture
  openingAmount: string;
  openingDenominations: DenominationCounts | null;

  // Ventas
  salesCount: number;
  salesCancelled: number;
  cashSales: string;
  cashRefunds: string;
  nonCashSales: string;
  taxTotal: string;
  discountTotal: string;
  byMethod: SaleByMethodRow[];
  /** Items vendidos en el turno, agregados por producto. */
  itemsSold: SaleItemAggRow[];

  // Movements
  paidIns: string;
  paidOuts: string;
  movements: CashMovement[];

  // Cierre / esperado
  expectedAmount: string;
  countedAmount: string | null;
  closingDenominations: DenominationCounts | null;
  difference: string | null;
}

@Injectable()
export class GetSessionReportUseCase {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    @Inject(CASH_SESSION_REPOSITORY) private readonly sessions: CashSessionRepository,
    @Inject(CASH_PAYMENT_TOTALS_PORT) private readonly totals: CashPaymentTotalsPort,
    @Inject(CASH_MOVEMENT_REPOSITORY) private readonly movements: CashMovementRepository,
  ) {}

  async execute(sessionId: string): Promise<SessionReport> {
    const session = await this.sessions.findById(sessionId);
    if (!session) throw new CashSessionNotFoundError(sessionId);

    const { cashSales, cashRefunds, nonCashSales, paidIns, paidOuts } =
      await this.totals.forSession(session.id);
    const afterSales = subMoney(addMoney(session.openingAmount, cashSales), cashRefunds);
    const expected = subMoney(addMoney(afterSales, paidIns), paidOuts);

    const salesAgg: Array<{ status: string; count: string; total: string; tax: string; discount: string }> =
      await this.ds.query(
        `SELECT s.status::text AS status,
                COUNT(*)::text AS count,
                COALESCE(SUM(s.total), 0)::text AS total,
                COALESCE(SUM(s.tax_total), 0)::text AS tax,
                COALESCE(SUM(s.discount_total + s.order_discount), 0)::text AS discount
         FROM sales s
         WHERE s.cash_session_id = $1
         GROUP BY s.status`,
        [sessionId],
      );
    let salesCount = 0;
    let salesCancelled = 0;
    let taxTotal = '0.00';
    let discountTotal = '0.00';
    for (const r of salesAgg) {
      const c = parseInt(r.count, 10);
      if (r.status === 'COMPLETED') {
        salesCount = c;
        taxTotal = r.tax;
        discountTotal = r.discount;
      } else if (r.status === 'CANCELLED') {
        salesCancelled = c;
      }
    }

    const byMethodRows: Array<{ method: string; count: string; total: string }> =
      await this.ds.query(
        `SELECT p.method::text AS method,
                COUNT(*)::text AS count,
                COALESCE(SUM(p.amount), 0)::text AS total
         FROM payments p
         JOIN sales s ON s.id = p.sale_id
         WHERE s.cash_session_id = $1
           AND p.status = 'COMPLETED'
           AND s.status = 'COMPLETED'
         GROUP BY p.method
         ORDER BY p.method`,
        [sessionId],
      );
    const declaredMap = session.closingDeclaredByMethod ?? null;
    const byMethod: SaleByMethodRow[] = byMethodRows.map((r) => {
      const declared = declaredMap?.[r.method] ?? null;
      const difference = declared !== null ? subMoney(declared, r.total) : null;
      return {
        method: r.method,
        count: parseInt(r.count, 10),
        total: r.total,
        declared,
        difference,
      };
    });

    // Items vendidos agregados por producto (solo ventas COMPLETED del turno).
    // Si la venta fue una variante, mostramos "producto · variante" como nombre.
    const itemsAgg: Array<{ name: string; sku: string; quantity: string; total: string }> =
      await this.ds.query(
        `SELECT CASE
                  WHEN si.variant_name_snapshot IS NULL THEN si.product_name_snapshot
                  ELSE si.product_name_snapshot || ' · ' || si.variant_name_snapshot
                END AS name,
                si.product_sku_snapshot AS sku,
                COALESCE(SUM(si.quantity), 0)::text AS quantity,
                COALESCE(SUM(si.total), 0)::text AS total
         FROM sale_items si
         JOIN sales s ON s.id = si.sale_id
         WHERE s.cash_session_id = $1
           AND s.status = 'COMPLETED'
         GROUP BY name, si.product_sku_snapshot
         ORDER BY SUM(si.total) DESC`,
        [sessionId],
      );
    const itemsSold: SaleItemAggRow[] = itemsAgg.map((r) => ({
      productNameSnapshot: r.name,
      productSkuSnapshot: r.sku,
      quantity: r.quantity,
      total: r.total,
    }));

    const movements = await this.movements.listForSession(session.id);

    return {
      kind: session.status === CashSessionStatus.OPEN ? 'X' : 'Z',
      session,
      generatedAt: new Date(),
      openingAmount: session.openingAmount,
      openingDenominations: session.openingDenominations,
      salesCount,
      salesCancelled,
      cashSales,
      cashRefunds,
      nonCashSales,
      taxTotal,
      discountTotal,
      byMethod,
      itemsSold,
      paidIns,
      paidOuts,
      movements,
      expectedAmount: session.expectedAmount ?? expected,
      countedAmount: session.countedAmount,
      closingDenominations: session.closingDenominations,
      difference: session.difference,
    };
  }
}
