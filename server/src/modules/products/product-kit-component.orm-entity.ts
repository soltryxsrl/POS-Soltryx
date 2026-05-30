import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericString } from '../../common/persistence/numeric.transformer';
import { ProductOrmEntity } from './product.orm-entity';

@Entity({ name: 'product_kit_components' })
export class ProductKitComponentOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'kit_product_id', type: 'uuid' })
  kitProductId!: string;

  @ManyToOne(() => ProductOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kit_product_id' })
  kit!: ProductOrmEntity;

  @Index()
  @Column({ name: 'component_product_id', type: 'uuid' })
  componentProductId!: string;

  @ManyToOne(() => ProductOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'component_product_id' })
  component!: ProductOrmEntity;

  @Column({ type: 'numeric', precision: 14, scale: 3, transformer: numericString })
  quantity!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
