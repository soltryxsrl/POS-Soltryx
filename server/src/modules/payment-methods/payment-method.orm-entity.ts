import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Forma de pago configurable. `code` es la clase de comportamiento que maneja
 * la lógica (CASH = arqueo/vuelto, ACCOUNT = crédito/CxC, etc.).
 */
@Entity({ name: 'payment_methods' })
export class PaymentMethodOrmEntity {
  /** Clase de comportamiento: CASH / CARD / TRANSFER / ACCOUNT / OTHER. */
  @PrimaryColumn({ type: 'varchar', length: 16 })
  code!: string;

  /** Etiqueta visible en el POS y recibos. */
  @Column({ type: 'varchar', length: 60 })
  name!: string;

  /** Si true, el POS pide una referencia (voucher, últimos 4 dígitos, etc.). */
  @Column({ name: 'requires_reference', type: 'boolean', default: false })
  requiresReference!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  /** Forma de pago preseleccionada al cobrar. Solo una (índice parcial). */
  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
