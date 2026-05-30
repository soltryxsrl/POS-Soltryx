import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export const FiscalDocAppliesTo = {
  SALE: 'SALE',
  PURCHASE: 'PURCHASE',
  BOTH: 'BOTH',
} as const;
export type FiscalDocAppliesTo =
  (typeof FiscalDocAppliesTo)[keyof typeof FiscalDocAppliesTo];

@Entity({ name: 'fiscal_doc_types' })
export class FiscalDocTypeOrmEntity {
  /** Código DGII corto: E31, E32, E33, E34, E41, E42, E43, E44, E45. */
  @PrimaryColumn({ type: 'varchar', length: 4 })
  code!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'requires_buyer_rnc', type: 'boolean', default: false })
  requiresBuyerRnc!: boolean;

  /** Si el tipo aplica a ventas, compras o ambos. */
  @Column({ name: 'applies_to', type: 'varchar', length: 16, default: 'SALE' })
  appliesTo!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
