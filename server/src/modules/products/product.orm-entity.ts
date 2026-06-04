import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CategoryOrmEntity } from '../categories/category.orm-entity';
import { numericString } from '../../common/persistence/numeric.transformer';

@Entity({ name: 'products' })
export class ProductOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId!: string | null;

  @Column({ type: 'varchar', length: 180 })
  name!: string;

  @Column({ type: 'varchar', length: 64 })
  sku!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  barcode!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl!: string | null;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId!: string | null;

  @ManyToOne(() => CategoryOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category!: CategoryOrmEntity | null;

  @Column({
    name: 'cost_price',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericString,
  })
  costPrice!: string;

  @Column({
    name: 'sale_price',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericString,
  })
  salePrice!: string;

  @Column({
    name: 'tax_rate',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0,
    transformer: numericString,
  })
  taxRate!: string;

  /**
   * Tipo de ITBIS del catálogo `tax_types`. Fuente de la tasa: al asignarlo, el
   * servicio copia su `rate` a `tax_rate` (snapshot que usa el cálculo de venta).
   * Null = producto legacy con tasa libre en `tax_rate`.
   */
  @Column({ name: 'tax_type_code', type: 'varchar', length: 16, nullable: true })
  taxTypeCode!: string | null;

  /**
   * Cache del stock actual. La fuente de verdad es la suma de `stock_movements`.
   * Solo el módulo Inventory escribe este campo (via ProductStockPort).
   */
  @Column({
    type: 'numeric',
    precision: 14,
    scale: 3,
    default: 0,
    transformer: numericString,
  })
  stock!: string;

  @Column({
    name: 'min_stock',
    type: 'numeric',
    precision: 14,
    scale: 3,
    default: 0,
    transformer: numericString,
  })
  minStock!: string;

  /** Stock máximo deseado (para reposición). 0 = sin tope definido. */
  @Column({
    name: 'max_stock',
    type: 'numeric',
    precision: 14,
    scale: 3,
    default: 0,
    transformer: numericString,
  })
  maxStock!: string;

  /** Punto de reorden: cuando el stock baja a este nivel, conviene reabastecer.
   *  0 = usar min_stock como umbral de alerta. */
  @Column({
    name: 'reorder_point',
    type: 'numeric',
    precision: 14,
    scale: 3,
    default: 0,
    transformer: numericString,
  })
  reorderPoint!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  /** Marca este producto como kit/combo (su venta explota a componentes). */
  @Column({ name: 'is_kit', type: 'boolean', default: false })
  isKit!: boolean;

  /** Si true, este producto se vende a través de sus variantes (no directo). */
  @Column({ name: 'has_variants', type: 'boolean', default: false })
  hasVariants!: boolean;

  /** Si true, se vende por peso (kg): el POS muestra unidad y admite decimales. */
  @Column({ name: 'sold_by_weight', type: 'boolean', default: false })
  soldByWeight!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
