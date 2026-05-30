/**
 * Umbral por encima del cual un descuento manual requiere autorización de un
 * usuario con permiso `sales.discount.override`. Si el cajero no lo tiene,
 * debe escalar y el cliente envía las credenciales de un manager.
 *
 * Se aplica sobre la suma de descuentos MANUALES (líneas + orden, excluye
 * promociones automáticas) divida por el subtotal antes de impuestos.
 *
 * 15% es el default — si más adelante hace falta hacerlo configurable por
 * negocio, llevarlo a `business_settings.discount_override_threshold_pct`.
 */
export const DISCOUNT_OVERRIDE_THRESHOLD_PCT = 15;
