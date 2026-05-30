import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericString } from '../../../common/persistence/numeric.transformer';
import { FiscalDocumentOrmEntity } from './fiscal-document.orm-entity';

@Entity({ name: 'fiscal_document_items' })
export class FiscalDocumentItemOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'fiscal_document_id', type: 'uuid' })
  fiscalDocumentId!: string;

  @ManyToOne(() => FiscalDocumentOrmEntity, (d) => d.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fiscal_document_id' })
  fiscalDocument!: FiscalDocumentOrmEntity;

  @Column({ type: 'int' })
  sequence!: number;

  @Column({ type: 'varchar', length: 255 })
  description!: string;

  @Column({ type: 'numeric', precision: 14, scale: 3, transformer: numericString })
  quantity!: string;

  @Column({ name: 'unit_price', type: 'numeric', precision: 12, scale: 2, transformer: numericString })
  unitPrice!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericString })
  discount!: string;

  @Column({ name: 'tax_rate', type: 'numeric', precision: 5, scale: 2, default: 0, transformer: numericString })
  taxRate!: string;

  @Column({ name: 'tax_total', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numericString })
  taxTotal!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericString })
  total!: string;
}
