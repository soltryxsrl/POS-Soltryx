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
import { StockTransferOrmEntity } from './stock-transfer.orm-entity';

@Entity({ name: 'stock_transfer_items' })
export class StockTransferItemOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'transfer_id', type: 'uuid' })
  transferId!: string;

  @ManyToOne(() => StockTransferOrmEntity, (t) => t.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transfer_id' })
  transfer!: StockTransferOrmEntity;

  /** Producto en la sucursal ORIGEN. */
  @Column({ name: 'source_product_id', type: 'uuid' })
  sourceProductId!: string;

  /** Producto equivalente (mismo SKU) en la sucursal DESTINO. */
  @Column({ name: 'dest_product_id', type: 'uuid' })
  destProductId!: string;

  @Column({ name: 'product_name_snapshot', type: 'varchar', length: 180 })
  productNameSnapshot!: string;

  @Column({ type: 'varchar', length: 64 })
  sku!: string;

  @Column({ type: 'numeric', precision: 14, scale: 3, transformer: numericString })
  quantity!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
