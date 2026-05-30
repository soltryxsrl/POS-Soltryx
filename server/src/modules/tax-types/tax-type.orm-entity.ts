import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericString } from '../../common/persistence/numeric.transformer';

@Entity({ name: 'tax_types' })
export class TaxTypeOrmEntity {
  /** Código corto: ITBIS18, ITBIS16, ITBIS0, EXENTO. */
  @PrimaryColumn({ type: 'varchar', length: 16 })
  code!: string;

  @Column({ type: 'varchar', length: 80 })
  name!: string;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0,
    transformer: numericString,
  })
  rate!: string;

  /**
   * Exento (fuera del ámbito del ITBIS) vs tasa 0% (gravado a 0). Ambos rate=0
   * pero la DGII los reporta distinto en 606/607.
   */
  @Column({ name: 'is_exempt', type: 'boolean', default: false })
  isExempt!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  /** Tipo aplicado por defecto a productos nuevos. Solo uno (índice parcial). */
  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
