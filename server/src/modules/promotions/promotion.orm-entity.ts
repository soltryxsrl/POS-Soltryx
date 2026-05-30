import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericString } from '../../common/persistence/numeric.transformer';

export const PromotionType = {
  PRODUCT_PERCENT_OFF: 'PRODUCT_PERCENT_OFF',
  PRODUCT_AMOUNT_OFF: 'PRODUCT_AMOUNT_OFF',
  PRODUCT_BUY_X_GET_Y: 'PRODUCT_BUY_X_GET_Y',
  ORDER_PERCENT_OFF: 'ORDER_PERCENT_OFF',
  ORDER_AMOUNT_OFF: 'ORDER_AMOUNT_OFF',
} as const;
export type PromotionType = (typeof PromotionType)[keyof typeof PromotionType];

@Entity({ name: 'promotions' })
@Index('ix_promotions_active', ['isActive', 'validFrom', 'validUntil'])
export class PromotionOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId!: string | null;

  @Column({ type: 'varchar', length: 180 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 32 })
  type!: string;

  /** Si el scope es producto-específico. Null si aplica a todo el catálogo o categoría. */
  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId!: string | null;

  /**
   * Si se setea, la promo aplica SOLO a esta variante específica.
   * Debe pertenecer al `productId` si ambos están seteados.
   */
  @Column({ name: 'variant_id', type: 'uuid', nullable: true })
  variantId!: string | null;

  /** Si el scope es categoría completa. Null si aplica a producto o a todo. */
  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId!: string | null;

  /** Para *_PERCENT_OFF. Ej: 10.00 = 10%. */
  @Column({
    name: 'percent_off',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: numericString,
  })
  percentOff!: string | null;

  /** Para *_AMOUNT_OFF. RD$ off. */
  @Column({
    name: 'amount_off',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericString,
  })
  amountOff!: string | null;

  /** Para BUY_X_GET_Y: cantidad total que debe comprar. */
  @Column({ name: 'min_quantity', type: 'int', nullable: true })
  minQuantity!: number | null;

  /** Para BUY_X_GET_Y: cuántas son gratis (free < min). */
  @Column({ name: 'free_quantity', type: 'int', nullable: true })
  freeQuantity!: number | null;

  /** Para ORDER_*: total mínimo de la orden para que aplique. */
  @Column({
    name: 'min_order_total',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericString,
  })
  minOrderTotal!: string | null;

  @Column({ name: 'valid_from', type: 'timestamptz', nullable: true })
  validFrom!: Date | null;

  @Column({ name: 'valid_until', type: 'timestamptz', nullable: true })
  validUntil!: Date | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  /** Mayor prioridad se evalúa primero (default 0). Útil para encadenar promos. */
  @Column({ type: 'int', default: 0 })
  priority!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt!: Date | null;
}
