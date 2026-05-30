import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface ParkedCartPayload {
  items: Array<{
    /** Null en ítems de "monto libre" (sin producto del catálogo). */
    productId: string | null;
    /** Si la línea era una variante. Backward-compat: opcional. */
    variantId?: string | null;
    variantName?: string | null;
    productName: string;
    sku: string;
    unitPrice: string;
    taxRate: string;
    quantity: number;
    discount: string;
    /** Nota libre de la línea — backward-compat: opcional. */
    notes?: string | null;
  }>;
  orderDiscount: string;
}

@Entity({ name: 'parked_carts' })
@Index('ix_pc_user_session', ['userId', 'cashSessionId'])
export class ParkedCartOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'cash_session_id', type: 'uuid' })
  cashSessionId!: string;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  label!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'jsonb' })
  payload!: ParkedCartPayload;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
