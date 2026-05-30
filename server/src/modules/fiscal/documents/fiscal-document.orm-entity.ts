import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericString } from '../../../common/persistence/numeric.transformer';
import { FiscalDocumentItemOrmEntity } from './fiscal-document-item.orm-entity';

/**
 * Estados del fiscal_document a nivel T1ET (independiente del flujo externo
 * de DGII que maneja otro sistema).
 *
 *   ISSUED    — NCF asignado y persistido localmente. Listo para publicar.
 *   PUBLISHED — el sistema externo confirmó el envío al provider (futuro).
 *   REJECTED  — DGII rechazó (futuro).
 *   CANCELLED — venta anulada; el doc queda como histórico.
 */
export type FiscalDocumentStatus = 'ISSUED' | 'PUBLISHED' | 'REJECTED' | 'CANCELLED';

@Entity({ name: 'fiscal_documents' })
export class FiscalDocumentOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId!: string | null;

  @Index()
  @Column({ name: 'sale_id', type: 'uuid', nullable: true })
  saleId!: string | null;

  @Column({ name: 'doc_type', type: 'varchar', length: 4 })
  docType!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32 })
  ncf!: string;

  @Column({ name: 'issue_date', type: 'timestamptz' })
  issueDate!: Date;

  @Column({ name: 'buyer_rnc', type: 'varchar', length: 16, nullable: true })
  buyerRnc!: string | null;

  @Column({ name: 'buyer_name', type: 'varchar', length: 180, nullable: true })
  buyerName!: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericString })
  subtotal!: string;

  @Column({ name: 'tax_total', type: 'numeric', precision: 12, scale: 2, transformer: numericString })
  taxTotal!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericString })
  total!: string;

  @Column({ type: 'varchar', length: 16, default: 'ISSUED' })
  status!: FiscalDocumentStatus;

  @Column({ name: 'track_id', type: 'varchar', length: 64, nullable: true })
  trackId!: string | null;

  @Column({ name: 'xml_payload', type: 'text', nullable: true })
  xmlPayload!: string | null;

  @Column({ name: 'xml_signed', type: 'text', nullable: true })
  xmlSigned!: string | null;

  @Column({ name: 'qr_url', type: 'varchar', length: 255, nullable: true })
  qrUrl!: string | null;

  @Column({ name: 'dgii_response', type: 'jsonb', nullable: true })
  dgiiResponse!: Record<string, unknown> | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt!: Date | null;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt!: Date | null;

  @Column({ name: 'rejected_at', type: 'timestamptz', nullable: true })
  rejectedAt!: Date | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => FiscalDocumentItemOrmEntity, (i) => i.fiscalDocument)
  @JoinColumn({ name: 'id', referencedColumnName: 'fiscalDocumentId' })
  items!: FiscalDocumentItemOrmEntity[];
}
