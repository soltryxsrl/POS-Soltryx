import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'currencies' })
export class CurrencyOrmEntity {
  /** Código ISO 4217: 'DOP', 'USD', 'EUR', ... */
  @PrimaryColumn({ type: 'varchar', length: 3 })
  code!: string;

  @Column({ type: 'varchar', length: 60 })
  name!: string;

  @Column({ type: 'varchar', length: 8 })
  symbol!: string;

  @Column({ type: 'int', default: 2 })
  decimals!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  /** Solo una moneda puede tener is_base=true (constraint UNIQUE parcial). */
  @Column({ name: 'is_base', type: 'boolean', default: false })
  isBase!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
