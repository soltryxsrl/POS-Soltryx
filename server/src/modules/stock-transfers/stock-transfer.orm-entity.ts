import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StockTransferItemOrmEntity } from './stock-transfer-item.orm-entity';

export const StockTransferStatus = {
  IN_TRANSIT: 'IN_TRANSIT',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED',
} as const;
export type StockTransferStatus =
  (typeof StockTransferStatus)[keyof typeof StockTransferStatus];

@Entity({ name: 'stock_transfers' })
export class StockTransferOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'transfer_number', type: 'varchar', length: 32 })
  transferNumber!: string;

  @Index()
  @Column({ name: 'source_branch_id', type: 'uuid' })
  sourceBranchId!: string;

  @Index()
  @Column({ name: 'dest_branch_id', type: 'uuid' })
  destBranchId!: string;

  @Column({ type: 'varchar', length: 16, default: 'IN_TRANSIT' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'created_by_id', type: 'uuid' })
  createdById!: string;

  @Column({ name: 'received_by_id', type: 'uuid', nullable: true })
  receivedById!: string | null;

  @Column({ name: 'received_at', type: 'timestamptz', nullable: true })
  receivedAt!: Date | null;

  @Column({ name: 'cancelled_by_id', type: 'uuid', nullable: true })
  cancelledById!: string | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: 'cancel_reason', type: 'varchar', length: 255, nullable: true })
  cancelReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => StockTransferItemOrmEntity, (i) => i.transfer, { cascade: false })
  items!: StockTransferItemOrmEntity[];
}
