import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericString } from '../../common/persistence/numeric.transformer';
import { SaleReturnItemOrmEntity } from './sale-return-item.orm-entity';

export const RefundMethod = {
  CASH: 'CASH',
  CARD: 'CARD',
  TRANSFER: 'TRANSFER',
  /** Crédito a cuenta del cliente (genera REVERSAL en el ledger). */
  STORE_CREDIT: 'STORE_CREDIT',
  /** Reduce el saldo de crédito del cliente (solo si la venta fue a crédito). */
  ACCOUNT: 'ACCOUNT',
  OTHER: 'OTHER',
} as const;
export type RefundMethod = (typeof RefundMethod)[keyof typeof RefundMethod];

@Entity({ name: 'sale_returns' })
@Index('ix_sale_returns_sale', ['saleId'])
export class SaleReturnOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId!: string | null;

  @Index({ unique: true })
  @Column({ name: 'return_number', type: 'varchar', length: 32 })
  returnNumber!: string;

  @Column({ name: 'sale_id', type: 'uuid' })
  saleId!: string;

  @Column({ name: 'cash_session_id', type: 'uuid' })
  cashSessionId!: string;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId!: string | null;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'refund_method', type: 'varchar', length: 16 })
  refundMethod!: string;

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

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  /** Clave de idempotencia: evita duplicar la devolución si se reintenta. */
  @Column({ name: 'idempotency_key', type: 'uuid', nullable: true })
  idempotencyKey!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => SaleReturnItemOrmEntity, (i) => i.saleReturn, { cascade: false })
  items!: SaleReturnItemOrmEntity[];
}
