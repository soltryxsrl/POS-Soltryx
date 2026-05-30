import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericString } from '../../../../../common/persistence/numeric.transformer';

@Entity({ name: 'cash_sessions' })
@Index('ix_cs_register_status', ['cashRegisterId', 'status'])
export class CashSessionOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId!: string | null;

  @Column({ name: 'cash_register_id', type: 'uuid' })
  cashRegisterId!: string;

  @Column({ name: 'opened_by_id', type: 'uuid' })
  openedById!: string;

  @Column({ name: 'closed_by_id', type: 'uuid', nullable: true })
  closedById!: string | null;

  @Column({ name: 'opened_at', type: 'timestamptz' })
  openedAt!: Date;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt!: Date | null;

  @Column({
    name: 'opening_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericString,
  })
  openingAmount!: string;

  @Column({
    name: 'expected_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericString,
  })
  expectedAmount!: string | null;

  @Column({
    name: 'counted_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericString,
  })
  countedAmount!: string | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericString,
  })
  difference!: string | null;

  @Column({ type: 'varchar', length: 16, default: 'OPEN' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
