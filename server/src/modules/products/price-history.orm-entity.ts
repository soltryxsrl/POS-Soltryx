import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { numericString } from '../../common/persistence/numeric.transformer';

/** Una fila por cada cambio de precio (venta/costo) de un producto o variante. */
@Entity({ name: 'price_history' })
export class PriceHistoryOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @Index()
  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({ name: 'variant_id', type: 'uuid', nullable: true })
  variantId!: string | null;

  /** 'sale_price' | 'cost_price'. */
  @Column({ type: 'varchar', length: 16 })
  field!: string;

  @Column({ name: 'old_value', type: 'numeric', precision: 14, scale: 2, transformer: numericString })
  oldValue!: string;

  @Column({ name: 'new_value', type: 'numeric', precision: 14, scale: 2, transformer: numericString })
  newValue!: string;

  /** 'manual' | 'bulk'. */
  @Column({ type: 'varchar', length: 16 })
  source!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason!: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
