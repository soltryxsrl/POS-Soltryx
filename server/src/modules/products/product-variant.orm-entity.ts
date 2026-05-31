import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericString } from '../../common/persistence/numeric.transformer';
import { ProductOrmEntity } from './product.orm-entity';

@Entity({ name: 'product_variants' })
export class ProductVariantOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Sucursal dueña (denormalizado del producto padre; ver migración 046). */
  @Index()
  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId!: string | null;

  @Index()
  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @ManyToOne(() => ProductOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: ProductOrmEntity;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 64 })
  sku!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  barcode!: string | null;

  /** Si null, hereda del producto padre. */
  @Column({
    name: 'sale_price',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericString,
  })
  salePrice!: string | null;

  @Column({
    name: 'cost_price',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericString,
  })
  costPrice!: string | null;

  @Column({ type: 'numeric', precision: 14, scale: 3, default: 0, transformer: numericString })
  stock!: string;

  @Column({
    name: 'min_stock',
    type: 'numeric',
    precision: 14,
    scale: 3,
    default: 0,
    transformer: numericString,
  })
  minStock!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
