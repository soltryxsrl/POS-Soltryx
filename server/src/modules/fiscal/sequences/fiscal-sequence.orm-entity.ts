import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Rango de NCF autorizado por DGII para un tipo de comprobante.
 *
 * El NCF visible se forma como: `${prefix}${nextNumber.padStart(N)}`.
 * Ejemplo: prefix="B02" + nextNumber=15 → "B0200000015" (estilo NCF clásico)
 *          prefix="E32" + nextNumber=15 → "E3200000015" (e-CF)
 * Cuando un rango se agota o vence se desactiva (is_active=false) y se crea
 * uno nuevo. Esto preserva la historia para auditoría / DGII.
 */
@Entity({ name: 'fiscal_sequences' })
export class FiscalSequenceOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId!: string | null;

  /** Código DGII del tipo (E31, E32...). FK lógica a fiscal_doc_types.code. */
  @Column({ name: 'doc_type', type: 'varchar', length: 4 })
  docType!: string;

  /** Prefijo que se antepone al número (ej: "B02", "E32"). */
  @Column({ type: 'varchar', length: 8 })
  prefix!: string;

  @Column({ name: 'range_from', type: 'bigint' })
  rangeFrom!: string;

  @Column({ name: 'range_to', type: 'bigint' })
  rangeTo!: string;

  /**
   * Próximo número a entregar. Iguala `rangeFrom` al crear; se incrementa
   * en cada `getNextNCF` (atómico vía SELECT FOR UPDATE en el servicio).
   */
  @Column({ name: 'next_number', type: 'bigint' })
  nextNumber!: string;

  @Column({ name: 'valid_until', type: 'date', nullable: true })
  validUntil!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
