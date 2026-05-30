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
  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

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

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
