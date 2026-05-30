import type { FiscalDocumentOrmEntity } from './fiscal-document.orm-entity';

/**
 * Adaptador para publicar el comprobante fiscal al sistema externo que lo
 * envía a DGII. T1ET genera el NCF localmente y deja el documento en estado
 * `ISSUED`; el provider externo lo recoge (por API o cola) y se encarga del
 * XML firmado, llamadas a DGII, etc.
 *
 * Reemplazar el adapter no-op cuando el contrato del API externo esté listo.
 */
export const FISCAL_PROVIDER_PORT = Symbol('FISCAL_PROVIDER_PORT');

export interface FiscalProviderPort {
  /**
   * Notifica al proveedor externo que se emitió un comprobante. Idempotente
   * por (`fiscalDocumentId`). Si lanza, la venta NO debe revertirse — el
   * caller decide qué hacer (retry async, marcar pending, alertar). Para el
   * adapter no-op no lanza nunca.
   */
  publish(doc: FiscalDocumentOrmEntity): Promise<void>;
}
