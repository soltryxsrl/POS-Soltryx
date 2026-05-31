import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericString } from '../../../../../common/persistence/numeric.transformer';
import { SaleOrmEntity } from './sale.orm-entity';

@Entity({ name: 'sale_items' })
export class SaleItemOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'sale_id', type: 'uuid' })
  saleId!: string;

  @ManyToOne(() => SaleOrmEntity, (s) => s.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sale_id' })
  sale!: SaleOrmEntity;

  @Index()
  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId!: string | null;

  @Index()
  @Column({ name: 'variant_id', type: 'uuid', nullable: true })
  variantId!: string | null;

  @Column({
    name: 'variant_name_snapshot',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  variantNameSnapshot!: string | null;

  @Column({ name: 'product_name_snapshot', type: 'varchar', length: 180 })
  productNameSnapshot!: string;

  @Column({ name: 'product_sku_snapshot', type: 'varchar', length: 64 })
  productSkuSnapshot!: string;

  @Column({ type: 'numeric', precision: 14, scale: 3, transformer: numericString })
  quantity!: string;

  @Column({ name: 'unit_price', type: 'numeric', precision: 12, scale: 2, transformer: numericString })
  unitPrice!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericString })
  discount!: string;

  @Column({ name: 'tax_rate', type: 'numeric', precision: 5, scale: 2, default: 0, transformer: numericString })
  taxRate!: string;

  @Column({
    name: 'tax_total',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericString,
  })
  taxTotal!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericString })
  total!: string;

  /** Costo unitario vigente al vender (promedio móvil). Para margen histórico exacto. */
  @Column({
    name: 'unit_cost_snapshot',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericString,
  })
  unitCostSnapshot!: string | null;

  /**
   * Si esta línea era un producto-kit al venderse, snapshot de la receta usada.
   * Permite que la cancelación/devolución reverse exactamente lo que se descontó,
   * aunque la receta haya cambiado después.
   */
  @Column({
    name: 'kit_components_snapshot',
    type: 'jsonb',
    nullable: true,
  })
  kitComponentsSnapshot!: Array<{ componentProductId: string; quantity: string }> | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
