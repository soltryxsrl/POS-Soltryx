import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericString } from '../../common/persistence/numeric.transformer';
import { PurchaseOrderItemOrmEntity } from './purchase-order-item.orm-entity';

export const PurchaseOrderStatus = {
  PENDING: 'PENDING',
  PARTIAL: 'PARTIAL',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED',
} as const;
export type PurchaseOrderStatus =
  (typeof PurchaseOrderStatus)[keyof typeof PurchaseOrderStatus];

@Entity({ name: 'purchase_orders' })
@Index('ix_po_status_created_at', ['status', 'createdAt'])
export class PurchaseOrderOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId!: string | null;

  @Index({ unique: true })
  @Column({ name: 'order_number', type: 'varchar', length: 32 })
  orderNumber!: string;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId!: string;

  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status!: string;

  @Column({ name: 'expected_date', type: 'date', nullable: true })
  expectedDate!: string | null;

  @Column({ name: 'supplier_invoice', type: 'varchar', length: 120, nullable: true })
  supplierInvoice!: string | null;

  /** Código DGII del tipo de comprobante del proveedor (B01/B14/B11/E41/E43). */
  @Column({
    name: 'supplier_fiscal_doc_type_code',
    type: 'varchar',
    length: 4,
    nullable: true,
  })
  supplierFiscalDocTypeCode!: string | null;

  /** NCF que aparece en la factura del proveedor. Va al 606. */
  @Column({ name: 'supplier_ncf', type: 'varchar', length: 32, nullable: true })
  supplierNcf!: string | null;

  /** Fecha del comprobante del proveedor (YYYY-MM-DD). Va al 606. */
  @Column({ name: 'supplier_invoice_date', type: 'date', nullable: true })
  supplierInvoiceDate!: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericString })
  subtotal!: string;

  @Column({
    name: 'tax_total',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericString,
  })
  taxTotal!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericString })
  total!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'created_by_id', type: 'uuid' })
  createdById!: string;

  @Column({ name: 'received_at', type: 'timestamptz', nullable: true })
  receivedAt!: Date | null;

  @Column({ name: 'received_by_id', type: 'uuid', nullable: true })
  receivedById!: string | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: 'cancelled_by_id', type: 'uuid', nullable: true })
  cancelledById!: string | null;

  @Column({ name: 'cancel_reason', type: 'varchar', length: 255, nullable: true })
  cancelReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => PurchaseOrderItemOrmEntity, (i) => i.purchaseOrder, { cascade: false })
  items!: PurchaseOrderItemOrmEntity[];
}
