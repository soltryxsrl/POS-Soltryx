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

  @Column({ type: 'varchar', length: 16, default: 'COMPLETED' })
  status!: string;

  @Column({ name: 'fiscal_status', type: 'varchar', length: 16, default: 'NOT_REQUIRED' })
  fiscalStatus!: string;

  @Column({ name: 'fiscal_document_id', type: 'uuid', nullable: true })
  fiscalDocumentId!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

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

  @OneToMany(() => SaleItemOrmEntity, (i) => i.sale, { cascade: false })
  items!: SaleItemOrmEntity[];

  @OneToMany(() => PaymentOrmEntity, (p) => p.sale, { cascade: false })
  payments!: PaymentOrmEntity[];
}
