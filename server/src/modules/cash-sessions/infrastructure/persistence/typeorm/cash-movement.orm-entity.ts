import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericString } from '../../../../../common/persistence/numeric.transformer';

@Entity({ name: 'cash_movements' })
@Index('ix_cm_session_created', ['cashSessionId', 'createdAt'])
export class CashMovementOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'cash_session_id', type: 'uuid' })
  cashSessionId!: string;

  @Column({ type: 'varchar', length: 16 })
  type!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericString })
  amount!: string;

  @Column({ type: 'varchar', length: 255 })
  reason!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
