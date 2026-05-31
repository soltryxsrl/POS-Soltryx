import {
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'business_settings' })
export class BusinessSettingsOrmEntity {
  /** Singleton: siempre 1 (CHECK constraint en DB). */
  @PrimaryColumn({ type: 'smallint' })
  id!: number;

  @Column({ type: 'varchar', length: 180 })
  name!: string;

  @Column({ name: 'legal_name', type: 'varchar', length: 180 })
  legalName!: string;

  @Column({ type: 'varchar', length: 32 })
  rnc!: string;

  @Column({ type: 'varchar', length: 255 })
  address!: string;

  @Column({ type: 'varchar', length: 64 })
  phone!: string;

  @Column({ name: 'footer_note', type: 'varchar', length: 255 })
  footerNote!: string;

  /**
   * Logo del negocio: URL pública o un data URI (`data:image/...;base64,...`)
   * cuando se sube un archivo desde el dispositivo. `text` para alojar el base64.
   */
  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl!: string | null;

  /** Eslogan corto del negocio que aparece bajo el nombre en el recibo. */
  @Column({ type: 'varchar', length: 180, nullable: true })
  tagline!: string | null;

  /** Si true, permite que el stock vaya bajo cero en ventas/ajustes. */
  @Column({ name: 'allow_negative_stock', type: 'boolean', default: false })
  allowNegativeStock!: boolean;

  /**
   * Si true, los precios de venta YA incluyen ITBIS (norma del retail RD): el
   * sistema back-calcula el impuesto en vez de agregarlo encima del precio.
   */
  @Column({ name: 'price_includes_tax', type: 'boolean', default: false })
  priceIncludesTax!: boolean;

  /** Si true, el cobro permite agregar propina (sugerida al % indicado). */
  @Column({ name: 'tip_enabled', type: 'boolean', default: false })
  tipEnabled!: boolean;

  /** Porcentaje sugerido por defecto al cobrar (ej: 10.00). */
  @Column({
    name: 'tip_default_pct',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 10,
  })
  tipDefaultPct!: string;

  /**
   * Régimen tributario activo. Si es 'RST' los reportes 606/607 no aplican
   * (la UI esconde esa sección). Default ORDINARIO (la mayoría).
   */
  @Column({ name: 'tax_regime', type: 'varchar', length: 16, default: 'ORDINARIO' })
  taxRegime!: string;

  /** Porcentaje sobre el subtotal a partir del cual un descuento requiere
   *  autorización de un usuario con permiso `sales.discount.override`. */
  @Column({
    name: 'discount_override_threshold_pct',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 15,
  })
  discountOverrideThresholdPct!: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'updated_by_id', type: 'uuid', nullable: true })
  updatedById!: string | null;
}
