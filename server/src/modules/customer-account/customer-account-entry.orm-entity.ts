import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericString } from '../../common/persistence/numeric.transformer';

export const AccountEntryType = {
  CHARGE: 'CHARGE',
  PAYMENT: 'PAYMENT',
  REVERSAL: 'REVERSAL',
} as const;
export type AccountEntryType = (typeof AccountEntryType)[keyof typeof AccountEntryType];

@Entity({ name: 'customer_account_entries' })
@Index('ix_cae_customer_created_at', ['customerId', 'createdAt'])
export class CustomerAccountEntryOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @Column({ type: 'varchar', length: 16 })
  type!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericString })
  amount!: string;

  @Column({ name: 'sale_id', type: 'uuid', nullable: true })
  saleId!: string | null;

  @Column({ name: 'cash_session_id', type: 'uuid', nullable: true })
  cashSessionId!: string | null;

  @Column({ name: 'payment_method', type: 'varchar', length: 16, nullable: true })
  paymentMethod!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  reference!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
