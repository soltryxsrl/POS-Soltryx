import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'product_barcodes' })
@Index('ix_pb_product_id', ['productId'])
export class ProductBarcodeOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Sucursal dueña (denormalizado del producto padre; ver migración 046). */
  @Index()
  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId!: string | null;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({ type: 'varchar', length: 64 })
  barcode!: string;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
