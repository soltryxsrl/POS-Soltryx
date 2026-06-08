import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type {
  CashPaymentTotalsPort,
  SessionPaymentTotals,
} from '../../../domain/ports/cash-payment-totals.port';

/**
 * Agrega 3 fuentes para el cuadre de caja:
 *   1) `payments` × `sales` de la sesión, group by method/status
 *      → cashSales (CASH, sale COMPLETED/REFUNDED), nonCashSales (resto,
 *        COMPLETED/REFUNDED), cashRefunds (CASH, sale CANCELLED).
 *   2) `cash_movements` group by type → paidIns, paidOuts.
 *
 * IMPORTANTE — devoluciones (REFUNDED) vs. anulaciones (CANCELLED):
 *   - Una venta DEVUELTA por completo (REFUNDED) cuenta como COMPLETED aquí: su
 *     efectivo SÍ entró al cajón en su momento. La SALIDA del dinero la modela el
 *     PAID_OUT que inserta la devolución (método CASH), o el ledger del cliente
 *     (STORE_CREDIT/ACCOUNT) cuando no hay efectivo. Restarla en cashRefunds
 *     descontaría dos veces (PAID_OUT + cashRefunds) y la caja saldría corta.
 *   - Una venta ANULADA (CANCELLED) NO inserta PAID_OUT: su reembolso en efectivo
 *     se modela exclusivamente con cashRefunds. Por eso solo CANCELLED va ahí.
 *
 * Una sola pasada por tabla, joinable a futuro si añadimos más métodos
 * de devolución (notas de crédito, etc.).
 */
@Injectable()
export class CashPaymentTotalsAdapterTypeOrm implements CashPaymentTotalsPort {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async forSession(sessionId: string): Promise<SessionPaymentTotals> {
    const paymentRows: Array<{ method: string; status: string; total: string | null }> =
      await this.ds.query(
        `SELECT p.method::text AS method, s.status::text AS status, COALESCE(SUM(p.amount), 0)::text AS total
         FROM payments p
         JOIN sales s ON s.id = p.sale_id
         WHERE s.cash_session_id = $1
           AND p.status = 'COMPLETED'
         GROUP BY p.method, s.status`,
        [sessionId],
      );

    let cashSales = '0.00';
    let cashRefunds = '0.00';
    let nonCashSales = '0.00';
    for (const r of paymentRows) {
      const v = r.total ?? '0.00';
      // REFUNDED se trata como COMPLETED: el efectivo entró al cajón; la salida la
      // registra el PAID_OUT de la devolución (ver nota del encabezado).
      if (r.status === 'COMPLETED' || r.status === 'REFUNDED') {
        if (r.method === 'CASH') cashSales = sumStringDecimals(cashSales, v);
        else nonCashSales = sumStringDecimals(nonCashSales, v);
      } else if (r.status === 'CANCELLED' && r.method === 'CASH') {
        cashRefunds = sumStringDecimals(cashRefunds, v);
      }
    }

    const movementRows: Array<{ type: string; total: string | null }> = await this.ds.query(
      `SELECT type::text AS type, COALESCE(SUM(amount), 0)::text AS total
       FROM cash_movements
       WHERE cash_session_id = $1
       GROUP BY type`,
      [sessionId],
    );
    let paidIns = '0.00';
    let paidOuts = '0.00';
    for (const r of movementRows) {
      const v = r.total ?? '0.00';
      if (r.type === 'PAID_IN') paidIns = v;
      else if (r.type === 'PAID_OUT') paidOuts = v;
    }

    return { cashSales, cashRefunds, nonCashSales, paidIns, paidOuts };
  }
}

function sumStringDecimals(a: string, b: string): string {
  const factor = 100;
  const sum = Math.round(parseFloat(a) * factor) + Math.round(parseFloat(b) * factor);
  const whole = Math.trunc(sum / factor);
  const frac = Math.abs(sum % factor).toString().padStart(2, '0');
  return `${whole}.${frac}`;
}
