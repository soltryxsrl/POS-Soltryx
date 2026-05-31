import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StockCountItemOrmEntity } from './stock-count-item.orm-entity';

export const StockCountStatus = {
  OPEN: 'OPEN',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type StockCountStatus =
  (typeof StockCountStatus)[keyof typeof StockCountStatus];

@Entity({ name: 'stock_counts' })
export class StockCountOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'count_number', type: 'varchar', length: 32 })
  countNumber!: string;

  @Index()
  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @Column({ type: 'varchar', length: 16, default: 'OPEN' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'created_by_id', type: 'uuid' })
  createdById!: string;

  @Column({ name: 'completed_by_id', type: 'uuid', nullable: true })
  completedById!: string | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => StockCountItemOrmEntity, (i) => i.count, { cascade: false })
  items!: StockCountItemOrmEntity[];
}
