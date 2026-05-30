import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type {
  CashPaymentTotalsPort,
  SessionPaymentTotals,
} from '../../../domain/ports/cash-payment-totals.port';

/**
 * Lee totales por método desde `payments + sales` filtrando por la sesión.
 *
 * Estado actual: la tabla `payments` existe pero está vacía hasta Fase 5.
 * Cuando Fase 5 inserte pagos, esta query empezará a devolver sumas reales
 * sin ningún cambio de código aquí.
 */
@Injectable()
export class CashPaymentTotalsAdapterTypeOrm implements CashPaymentTotalsPort {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async forSession(sessionId: string): Promise<SessionPaymentTotals> {
    const rows: Array<{ method: string; total: string | null }> = await this.ds.query(
      `SELECT p.method::text AS method, COALESCE(SUM(p.amount), 0)::text AS total
       FROM payments p
       JOIN sales s ON s.id = p.sale_id
       WHERE s.cash_session_id = $1
         AND p.status = 'COMPLETED'
         AND s.status = 'COMPLETED'
       GROUP BY p.method`,
      [sessionId],
    );

    let cashSales = '0.00';
    let nonCashSales = '0.00';
    for (const r of rows) {
      const v = r.total ?? '0.00';
      if (r.method === 'CASH') cashSales = v;
      else nonCashSales = sumStringDecimals(nonCashSales, v);
    }

    // Fase 5+: cuando exista lógica de refunds/cancelaciones a efectivo,
    // aquí se restará. Por ahora devolvemos 0.
    return { cashSales, cashRefunds: '0.00', nonCashSales };
  }
}

function sumStringDecimals(a: string, b: string): string {
  const factor = 100;
  const sum = Math.round(parseFloat(a) * factor) + Math.round(parseFloat(b) * factor);
  const whole = Math.trunc(sum / factor);
  const frac = Math.abs(sum % factor).toString().padStart(2, '0');
  return `${whole}.${frac}`;
}
