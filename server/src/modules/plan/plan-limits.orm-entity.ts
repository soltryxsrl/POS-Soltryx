import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Topes del plan contratado. Singleton (id = 1, CHECK en DB).
 * `null` en un campo = SIN límite (ilimitado).
 */
@Entity({ name: 'plan_limits' })
export class PlanLimitsOrmEntity {
  @PrimaryColumn({ type: 'smallint' })
  id!: number;

  /** Máximo de usuarios que el cliente puede crear. NULL = ilimitado. */
  @Column({ name: 'max_users', type: 'int', nullable: true })
  maxUsers!: number | null;

  /** Máximo de sucursales que el cliente puede crear. NULL = ilimitado. */
  @Column({ name: 'max_branches', type: 'int', nullable: true })
  maxBranches!: number | null;

  /**
   * Interruptor de la función multi-sucursal. false = opera como mono-sucursal.
   * Default OFF: las instancias nuevas arrancan mono-sucursal; Soltryx lo enciende.
   */
  @Column({ name: 'multi_branch_enabled', type: 'boolean', default: false })
  multiBranchEnabled!: boolean;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
