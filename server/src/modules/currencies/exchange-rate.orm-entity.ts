import {
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericString } from '../../common/persistence/numeric.transformer';

@Entity({ name: 'exchange_rates' })
export class ExchangeRateOrmEntity {
  /** Moneda no-base. Su tasa convierte UN unidad de esta moneda a base. */
  @PrimaryColumn({ name: 'currency_code', type: 'varchar', length: 3 })
  currencyCode!: string;

  /**
   * `rate_to_base`: cuánto vale 1 unidad de esta moneda en la base.
   * Ej: USD→DOP rate=60 significa US$1 = DOP60.
   */
  @Column({
    name: 'rate_to_base',
    type: 'numeric',
    precision: 14,
    scale: 6,
    transformer: numericString,
  })
  rateToBase!: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'updated_by_id', type: 'uuid', nullable: true })
  updatedById!: string | null;
}
