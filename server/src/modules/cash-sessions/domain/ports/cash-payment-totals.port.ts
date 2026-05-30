export const CASH_PAYMENT_TOTALS_PORT = Symbol('CASH_PAYMENT_TOTALS_PORT');

export interface SessionPaymentTotals {
  /** Suma de pagos en EFECTIVO de ventas COMPLETADAS en esta sesión. */
  cashSales: string;
  /** Devoluciones a efectivo (ventas CANCELLED en esta sesión que tenían CASH). */
  cashRefunds: string;
  /** Suma de pagos no-efectivo (CARD/TRANSFER/OTHER) de ventas completadas. */
  nonCashSales: string;
  /** Σ pay-ins (entradas) de efectivo durante el turno. */
  paidIns: string;
  /** Σ pay-outs (salidas) de efectivo durante el turno. */
  paidOuts: string;
}

/**
 * Lee totales agregados de pagos + movements por sesión.
 * El expected_amount al cerrar la sesión es:
 *   opening + cashSales − cashRefunds + paidIns − paidOuts
 */
export interface CashPaymentTotalsPort {
  forSession(sessionId: string): Promise<SessionPaymentTotals>;
}
