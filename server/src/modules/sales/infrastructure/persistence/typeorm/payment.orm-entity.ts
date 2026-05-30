import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericString } from '../../../../../common/persistence/numeric.transformer';
import { SaleOrmEntity } from './sale.orm-entity';

@Entity({ name: 'payments' })
export class PaymentOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'sale_id', type: 'uuid' })
  saleId!: string;

  @ManyToOne(() => SaleOrmEntity, (s) => s.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sale_id' })
  sale!: SaleOrmEntity;

  @Column({ type: 'varchar', length: 16 })
  method!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericString })
  amount!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  reference!: string | null;

  @Column({ type: 'varchar', length: 16, default: 'COMPLETED' })
  status!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
