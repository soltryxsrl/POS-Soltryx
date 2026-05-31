import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericString } from '../../../../../common/persistence/numeric.transformer';
import { PaymentOrmEntity } from './payment.orm-entity';
import { SaleItemOrmEntity } from './sale-item.orm-entity';

@Entity({ name: 'sales' })
export class SaleOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId!: string | null;

  @Index({ unique: true })
  @Column({ name: 'sale_number', type: 'varchar', length: 32 })
  saleNumber!: string;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId!: string | null;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'cash_session_id', type: 'uuid' })
  cashSessionId!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericString })
  subtotal!: string;

  @Column({
    name: 'discount_total',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericString,
  })
  discountTotal!: string;

  @Column({
    name: 'order_discount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericString,
  })
  orderDiscount!: string;

  @Column({
    name: 'tip_total',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericString,
  })
  tipTotal!: string;

  /** UUID público para compartir recibo sin login (URL `/r/{token}`). */
  @Index({ unique: true })
  @Column({ name: 'public_token', type: 'uuid' })
  publicToken!: string;

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

  /** Snapshot del modo de precio al cobrar: true = los montos ya incluían ITBIS. */
  @Column({ name: 'price_includes_tax', type: 'boolean', default: false })
  priceIncludesTax!: boolean;

  @Column({ type: 'varchar', length: 16, default: 'COMPLETED' })
  status!: string;

  @Column({ name: 'fiscal_status', type: 'varchar', length: 16, default: 'NOT_REQUIRED' })
  fiscalStatus!: string;

  @Column({ name: 'fiscal_document_id', type: 'uuid', nullable: true })
  fiscalDocumentId!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  /** Clave de idempotencia (POS offline) — única; evita duplicar al sincronizar. */
  @Column({ name: 'idempotency_key', type: 'uuid', nullable: true })
  idempotencyKey!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: 'cancelled_by_id', type: 'uuid', nullable: true })
  cancelledById!: string | null;

  @Column({ name: 'cancel_reason', type: 'varchar', length: 255, nullable: true })
  cancelReason!: string | null;

  /** Manager que autorizó un descuento sobre el umbral. Null si no aplicó. */
  @Column({ name: 'discount_authorized_by_id', type: 'uuid', nullable: true })
  discountAuthorizedById!: string | null;

  /** Nombre del autorizador al momento de la venta (para evitar lookups). */
  @Column({
    name: 'discount_authorized_by_snapshot',
    type: 'varchar',
    length: 180,
    nullable: true,
  })
  discountAuthorizedBySnapshot!: string | null;

  @OneToMany(() => SaleItemOrmEntity, (i) => i.sale, { cascade: false })
  items!: SaleItemOrmEntity[];

  @OneToMany(() => PaymentOrmEntity, (p) => p.sale, { cascade: false })
  payments!: PaymentOrmEntity[];
}
