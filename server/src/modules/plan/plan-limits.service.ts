import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SUPERADMIN_ROLE_CODE } from '../auth/domain/permissions.catalog';
import { UserOrmEntity } from '../auth/infrastructure/persistence/typeorm/user.orm-entity';
import { BranchOrmEntity } from '../branches/branch.orm-entity';
import { PlanLimitsOrmEntity } from './plan-limits.orm-entity';

/** Topes del plan. `null` = ilimitado. */
export interface PlanLimits {
  maxUsers: number | null;
  maxBranches: number | null;
  /** Interruptor de la función multi-sucursal. false = opera mono-sucursal. */
  multiBranchEnabled: boolean;
}

/** Topes + uso actual, para mostrar al cliente (solo lectura). */
export interface PlanUsage extends PlanLimits {
  usedUsers: number;
  usedBranches: number;
}

const SINGLETON_ID = 1;

@Injectable()
export class PlanLimitsService {
  constructor(
    @InjectRepository(PlanLimitsOrmEntity)
    private readonly repo: Repository<PlanLimitsOrmEntity>,
    @InjectRepository(UserOrmEntity)
    private readonly users: Repository<UserOrmEntity>,
    @InjectRepository(BranchOrmEntity)
    private readonly branches: Repository<BranchOrmEntity>,
  ) {}

  /**
   * Lee los topes del plan. SIN cache: se consulta la fila singleton en cada
   * llamada (es un PK lookup trivial y se llama poco — solo al crear o al pintar
   * el badge). Así un cambio de plan por SQL surte efecto al instante, sin
   * reiniciar el servidor.
   */
  async getLimits(): Promise<PlanLimits> {
    const row = await this.repo.findOne({ where: { id: SINGLETON_ID } });
    return {
      maxUsers: row?.maxUsers ?? null,
      maxBranches: row?.maxBranches ?? null,
      multiBranchEnabled: row?.multiBranchEnabled ?? true,
    };
  }

  /** ¿Está habilitada la función multi-sucursal en esta instancia? */
  async isMultiBranchEnabled(): Promise<boolean> {
    return (await this.getLimits()).multiBranchEnabled;
  }

  /**
   * Cuenta los usuarios del CLIENTE: no-borrados y SIN el rol SUPERADMIN (las
   * cuentas de Soltryx no consumen el cupo del plan del cliente).
   */
  private countClientUsers(): Promise<number> {
    return this.users
      .createQueryBuilder('u')
      .where('u.deletedAt IS NULL')
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM user_roles ur
          JOIN roles rr ON rr.id = ur.role_id
          WHERE ur.user_id = u.id AND rr.code = :superadmin
        )`,
        { superadmin: SUPERADMIN_ROLE_CODE },
      )
      .getCount();
  }

  /**
   * Uso actual. Usuarios = cuentas del cliente (excluye Soltryx); sucursales =
   * `count()` (excluye borradas vía @DeleteDateColumn). Borrar libera cupo.
   */
  async getUsage(): Promise<PlanUsage> {
    const [limits, usedUsers, usedBranches] = await Promise.all([
      this.getLimits(),
      this.countClientUsers(),
      this.branches.count(),
    ]);
    return { ...limits, usedUsers, usedBranches };
  }

  /**
   * Cambia los topes del plan (upsell). Solo los campos provistos se modifican;
   * `null` = ilimitado. Lo invoca el endpoint super-admin.
   */
  async updateLimits(patch: {
    maxUsers?: number | null;
    maxBranches?: number | null;
    multiBranchEnabled?: boolean;
  }): Promise<void> {
    let row = await this.repo.findOne({ where: { id: SINGLETON_ID } });
    if (!row) {
      row = this.repo.create({
        id: SINGLETON_ID,
        maxUsers: null,
        maxBranches: null,
        multiBranchEnabled: true,
      });
    }
    if (patch.maxUsers !== undefined) row.maxUsers = patch.maxUsers;
    if (patch.maxBranches !== undefined) row.maxBranches = patch.maxBranches;
    if (patch.multiBranchEnabled !== undefined) {
      row.multiBranchEnabled = patch.multiBranchEnabled;
    }
    await this.repo.save(row);
  }

  /** Lanza 403 si crear un usuario excedería el plan. No-op si es ilimitado. */
  async assertCanCreateUser(): Promise<void> {
    const { maxUsers } = await this.getLimits();
    if (maxUsers == null) return;
    const used = await this.countClientUsers();
    if (used >= maxUsers) {
      throw new ForbiddenException({
        code: 'PLAN_LIMIT_REACHED',
        resource: 'users',
        max: maxUsers,
        used,
        message: `Tu plan permite hasta ${maxUsers} usuario(s) (ya tienes ${used}). Contacta a Soltryx para ampliarlo.`,
      });
    }
  }

  /**
   * Lanza 403 si no se puede crear una sucursal: porque la función multi-sucursal
   * está apagada, o porque se alcanzó el tope del plan.
   */
  async assertCanCreateBranch(): Promise<void> {
    const { maxBranches, multiBranchEnabled } = await this.getLimits();
    if (!multiBranchEnabled) {
      throw new ForbiddenException({
        code: 'MULTI_BRANCH_DISABLED',
        message:
          'La función multi-sucursal está desactivada en esta instancia. No se pueden crear sucursales.',
      });
    }
    if (maxBranches == null) return;
    const used = await this.branches.count();
    if (used >= maxBranches) {
      throw new ForbiddenException({
        code: 'PLAN_LIMIT_REACHED',
        resource: 'branches',
        max: maxBranches,
        used,
        message: `Tu plan permite hasta ${maxBranches} sucursal(es) (ya tienes ${used}). Contacta a Soltryx para ampliarlo.`,
      });
    }
  }
}
