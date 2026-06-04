import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { numericString } from '../../../../../common/persistence/numeric.transformer';

@Entity({ name: 'stock_movements' })
export class StockMovementOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId!: string | null;

  @Index()
  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Index()
  @Column({ name: 'variant_id', type: 'uuid', nullable: true })
  variantId!: string | null;

  @Column({ type: 'varchar', length: 24 })
  type!: string;

  @Column({ type: 'numeric', precision: 14, scale: 3, transformer: numericString })
  quantity!: string;

  @Column({
    name: 'previous_stock',
    type: 'numeric',
    precision: 14,
    scale: 3,
    transformer: numericString,
  })
  previousStock!: string;

  @Column({
    name: 'new_stock',
    type: 'numeric',
    precision: 14,
    scale: 3,
    transformer: numericString,
  })
  newStock!: string;

  /**
   * Costo unitario del movimiento (base de costo promedio móvil al momento;
   * para compras, el costo recibido). NULL = histórico/desconocido.
   */
  @Column({
    name: 'unit_cost',
    type: 'numeric',
    precision: 14,
    scale: 4,
    nullable: true,
    transformer: numericString,
  })
  unitCost!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason!: string | null;

  @Column({ name: 'sale_id', type: 'uuid', nullable: true })
  saleId!: string | null;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
