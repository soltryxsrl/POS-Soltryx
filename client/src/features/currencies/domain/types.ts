export interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  isActive: boolean;
  isBase: boolean;
  /** Tasa contra la moneda base. '1.000000' si esta moneda ES la base. */
  rateToBase: string | null;
  rateUpdatedAt: string | null;
}

export interface SetRateInput {
  rate: string;
}

export interface ToggleCurrencyInput {
  isActive: boolean;
}
