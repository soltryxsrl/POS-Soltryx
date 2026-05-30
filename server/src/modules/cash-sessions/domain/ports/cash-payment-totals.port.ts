export const CASH_PAYMENT_TOTALS_PORT = Symbol('CASH_PAYMENT_TOTALS_PORT');

export interface SessionPaymentTotals {
  /** Suma de pagos en EFECTIVO de ventas COMPLETADAS en esta sesión. */
  cashSales: string;
  /** Reservado para Fase 5+: refunds / cancelaciones que devolvieron efectivo. */
  cashRefunds: string;
  /** Suma de pagos no-efectivo (CARD/TRANSFER/OTHER) de ventas completadas. */
  nonCashSales: string;
}

/**
 * Lee totales agregados de pagos por sesión.
 * Hoy devuelve ceros porque Sales no existe — pero la query ya filtra por
 * `payments.method = 'CASH'` y `sales.cash_session_id`, así que cuando se
 * inserten ventas en Fase 5 esto comenzará a sumar automáticamente.
 */
export interface CashPaymentTotalsPort {
  forSession(sessionId: string): Promise<SessionPaymentTotals>;
}
