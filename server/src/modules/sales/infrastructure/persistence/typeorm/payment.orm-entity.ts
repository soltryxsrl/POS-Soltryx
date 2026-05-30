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

  /** Monto en MONEDA BASE (DOP). Es la cantidad canónica que cuenta para el total. */
  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericString })
  amount!: string;

  /** Moneda en que el cliente entregó el tender. Default 'DOP' (base). */
  @Column({ name: 'currency_code', type: 'varchar', length: 3, default: 'DOP' })
  currencyCode!: string;

  /** Si currencyCode != base: monto ORIGINAL en esa moneda. Null si pagó en DOP. */
  @Column({
    name: 'foreign_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericString,
  })
  foreignAmount!: string | null;

  /** Tasa usada (1 moneda extranjera = X DOP). Null si pagó en DOP. */
  @Column({
    name: 'exchange_rate',
    type: 'numeric',
    precision: 14,
    scale: 6,
    nullable: true,
    transformer: numericString,
  })
  exchangeRate!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  reference!: string | null;

  @Column({ type: 'varchar', length: 16, default: 'COMPLETED' })
  status!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
