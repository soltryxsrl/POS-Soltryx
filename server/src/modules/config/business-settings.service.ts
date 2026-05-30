import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessSettingsOrmEntity } from './business-settings.orm-entity';

export type TaxRegime = 'ORDINARIO' | 'RST';

export interface BusinessInfo {
  name: string;
  legalName: string;
  rnc: string;
  address: string;
  phone: string;
  footerNote: string;
  /** URL pública del logo. Null = sin logo. */
  logoUrl: string | null;
  /** Eslogan corto. Aparece en el header del recibo. */
  tagline: string | null;
  allowNegativeStock: boolean;
  /** Si true, los precios de venta ya incluyen ITBIS (se back-calcula). */
  priceIncludesTax: boolean;
  tipEnabled: boolean;
  tipDefaultPct: string;
  taxRegime: TaxRegime;
  /** % del subtotal sobre el cual el descuento requiere override de manager. */
  discountOverrideThresholdPct: string;
}

export interface UpdateBusinessInput {
  name: string;
  legalName: string;
  rnc: string;
  address: string;
  phone: string;
  footerNote: string;
  logoUrl?: string | null;
  tagline?: string | null;
  allowNegativeStock?: boolean;
  tipEnabled?: boolean;
  tipDefaultPct?: string;
  taxRegime?: TaxRegime;
  discountOverrideThresholdPct?: string;
  priceIncludesTax?: boolean;
  /** Usuario que está realizando el cambio (auditoría). */
  updatedById: string | null;
}

const SINGLETON_ID = 1;

@Injectable()
export class BusinessSettingsService {
  constructor(
    @InjectRepository(BusinessSettingsOrmEntity)
    private readonly repo: Repository<BusinessSettingsOrmEntity>,
  ) {}

  async get(): Promise<BusinessInfo> {
    const row = await this.repo.findOne({ where: { id: SINGLETON_ID } });
    // La migración inserta el row inicial. Si por alguna razón se borró,
    // lo regeneramos al vuelo con defaults para no romper el recibo.
    if (!row) {
      const seeded = await this.repo.save(
        this.repo.create({
          id: SINGLETON_ID,
          name: 'T1ET POS',
          legalName: '',
          rnc: '',
          address: '',
          phone: '',
          footerNote: '*** Gracias por su compra ***',
          allowNegativeStock: false,
          priceIncludesTax: false,
          tipEnabled: false,
          tipDefaultPct: '10.00',
          taxRegime: 'ORDINARIO',
          discountOverrideThresholdPct: '15.00',
          logoUrl: null,
          tagline: null,
        }),
      );
      return toInfo(seeded);
    }
    return toInfo(row);
  }

  async update(input: UpdateBusinessInput): Promise<BusinessInfo> {
    const current = await this.get();
    await this.repo.upsert(
      {
        id: SINGLETON_ID,
        name: input.name,
        legalName: input.legalName,
        rnc: input.rnc,
        address: input.address,
        phone: input.phone,
        footerNote: input.footerNote,
        allowNegativeStock:
          input.allowNegativeStock ?? current.allowNegativeStock,
        priceIncludesTax:
          input.priceIncludesTax ?? current.priceIncludesTax,
        tipEnabled: input.tipEnabled ?? current.tipEnabled,
        tipDefaultPct: input.tipDefaultPct ?? current.tipDefaultPct,
        taxRegime: input.taxRegime ?? current.taxRegime,
        discountOverrideThresholdPct:
          input.discountOverrideThresholdPct ??
          current.discountOverrideThresholdPct,
        logoUrl: input.logoUrl !== undefined ? input.logoUrl : current.logoUrl,
        tagline: input.tagline !== undefined ? input.tagline : current.tagline,
        updatedById: input.updatedById,
      },
      ['id'],
    );
    return this.get();
  }
}

function toInfo(r: BusinessSettingsOrmEntity): BusinessInfo {
  return {
    name: r.name,
    legalName: r.legalName,
    rnc: r.rnc,
    address: r.address,
    phone: r.phone,
    footerNote: r.footerNote,
    logoUrl: r.logoUrl,
    tagline: r.tagline,
    allowNegativeStock: r.allowNegativeStock,
    priceIncludesTax: r.priceIncludesTax,
    tipEnabled: r.tipEnabled,
    tipDefaultPct: r.tipDefaultPct,
    taxRegime: (r.taxRegime as TaxRegime) ?? 'ORDINARIO',
    discountOverrideThresholdPct: r.discountOverrideThresholdPct ?? '15.00',
  };
}
