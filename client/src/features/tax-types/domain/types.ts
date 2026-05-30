export interface TaxType {
  /** Código corto: ITBIS18, ITBIS16, ITBIS0, EXENTO. */
  code: string;
  name: string;
  /** Tasa en % (string para evitar imprecisión de float). "18.00". */
  rate: string;
  /** Exento (fuera del ámbito ITBIS) vs tasa 0% gravada. Ambos rate=0. */
  isExempt: boolean;
  isActive: boolean;
  /** Tipo aplicado por defecto a productos nuevos. Solo uno. */
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
