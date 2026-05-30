export type TaxRegime = 'ORDINARIO' | 'RST';

export interface BusinessInfo {
  name: string;
  legalName: string;
  rnc: string;
  address: string;
  phone: string;
  footerNote: string;
  /** Permite ventas con stock que quedaría negativo. Default false. */
  allowNegativeStock: boolean;
  /** Si true, los precios de venta ya incluyen ITBIS (se back-calcula). */
  priceIncludesTax: boolean;
  /** Activa propina al cobrar en POS. */
  tipEnabled: boolean;
  /** Porcentaje sugerido al cobrar (ej: "10.00"). */
  tipDefaultPct: string;
  /** Régimen tributario activo (ORDINARIO declara 606/607; RST no). */
  taxRegime: TaxRegime;
  /** % de descuento sobre el subtotal a partir del cual se requiere
   *  autorización de un usuario con permiso `sales.discount.override`. */
  discountOverrideThresholdPct: string;
  /** URL pública del logo (Cloudinary/CDN). Null = sin logo. */
  logoUrl: string | null;
  /** Eslogan corto del negocio que aparece bajo el nombre en el recibo. */
  tagline: string | null;
}

export type UpdateBusinessInput = BusinessInfo;
