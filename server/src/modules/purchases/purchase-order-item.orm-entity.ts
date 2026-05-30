import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericString } from '../../common/persistence/numeric.transformer';
import { PurchaseOrderOrmEntity } from './purchase-order.orm-entity';

@Entity({ name: 'purchase_order_items' })
export class PurchaseOrderItemOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'purchase_order_id', type: 'uuid' })
  purchaseOrderId!: string;

  @ManyToOne(() => PurchaseOrderOrmEntity, (po) => po.items)
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder!: PurchaseOrderOrmEntity;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({ name: 'product_name_snapshot', type: 'varchar', length: 180 })
  productNameSnapshot!: string;

  @Column({ name: 'product_sku_snapshot', type: 'varchar', length: 64 })
  productSkuSnapshot!: string;

  @Column({
    name: 'ordered_quantity',
    type: 'numeric',
    precision: 14,
    scale: 3,
    transformer: numericString,
  })
  orderedQuantity!: string;

  @Column({
    name: 'received_quantity',
    type: 'numeric',
    precision: 14,
    scale: 3,
    default: 0,
    transformer: numericString,
  })
  receivedQuantity!: string;

  @Column({
    name: 'unit_cost',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericString,
  })
  unitCost!: string;

  @Column({
    name: 'tax_rate',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0,
    transformer: numericString,
  })
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

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
