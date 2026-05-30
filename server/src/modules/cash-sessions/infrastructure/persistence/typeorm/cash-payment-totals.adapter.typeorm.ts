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
 *      → cashSales (CASH, sale COMPLETED), nonCashSales (resto, sale COMPLETED),
 *        cashRefunds (CASH, sale CANCELLED).
 *   2) `cash_movements` group by type → paidIns, paidOuts.
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
      if (r.status === 'COMPLETED') {
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
