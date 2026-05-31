import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericString } from '../../common/persistence/numeric.transformer';
import { StockCountOrmEntity } from './stock-count.orm-entity';

@Entity({ name: 'stock_count_items' })
export class StockCountItemOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'count_id', type: 'uuid' })
  countId!: string;

  @ManyToOne(() => StockCountOrmEntity, (c) => c.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'count_id' })
  count!: StockCountOrmEntity;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({ name: 'product_name_snapshot', type: 'varchar', length: 180 })
  productNameSnapshot!: string;

  @Column({ type: 'varchar', length: 64 })
  sku!: string;

  /** Cantidad contada físicamente. */
  @Column({ name: 'counted_qty', type: 'numeric', precision: 14, scale: 3, transformer: numericString })
  countedQty!: string;

  /** Stock del sistema al completar (snapshot). Null mientras OPEN. */
  @Column({ name: 'system_qty', type: 'numeric', precision: 14, scale: 3, nullable: true, transformer: numericString })
  systemQty!: string | null;

  /** contado − sistema (al completar). */
  @Column({ type: 'numeric', precision: 14, scale: 3, nullable: true, transformer: numericString })
  variance!: string | null;

  /** Costo unitario al completar — para valorar la merma. */
  @Column({ name: 'unit_cost', type: 'numeric', precision: 12, scale: 2, nullable: true, transformer: numericString })
  unitCost!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
