import { ForbiddenException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { PlanLimitsService } from './plan-limits.service';
import type { PlanLimitsOrmEntity } from './plan-limits.orm-entity';
import type { UserOrmEntity } from '../auth/infrastructure/persistence/typeorm/user.orm-entity';
import type { BranchOrmEntity } from '../branches/branch.orm-entity';

function makeService(
  limits: { maxUsers: number | null; maxBranches: number | null } | null,
  userCount: number,
  branchCount: number,
): PlanLimitsService {
  const repo = { findOne: async () => limits } as unknown as Repository<PlanLimitsOrmEntity>;
  const users = { count: async () => userCount } as unknown as Repository<UserOrmEntity>;
  const branches = { count: async () => branchCount } as unknown as Repository<BranchOrmEntity>;
  return new PlanLimitsService(repo, users, branches);
}

describe('PlanLimitsService', () => {
  it('plan ilimitado (null) nunca bloquea, aunque haya muchos', async () => {
    const s = makeService({ maxUsers: null, maxBranches: null }, 100, 100);
    await expect(s.assertCanCreateUser()).resolves.toBeUndefined();
    await expect(s.assertCanCreateBranch()).resolves.toBeUndefined();
  });

  it('permite crear cuando se está por debajo del tope', async () => {
    const s = makeService({ maxUsers: 5, maxBranches: 10 }, 4, 9);
    await expect(s.assertCanCreateUser()).resolves.toBeUndefined();
    await expect(s.assertCanCreateBranch()).resolves.toBeUndefined();
  });

  it('bloquea usuarios al alcanzar el tope (used >= max)', async () => {
    const s = makeService({ maxUsers: 5, maxBranches: 10 }, 5, 0);
    await expect(s.assertCanCreateUser()).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('bloquea sucursales al alcanzar el tope', async () => {
    const s = makeService({ maxUsers: null, maxBranches: 10 }, 0, 10);
    await expect(s.assertCanCreateBranch()).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('getUsage devuelve límites + uso actual', async () => {
    const s = makeService({ maxUsers: 5, maxBranches: 10 }, 3, 7);
    await expect(s.getUsage()).resolves.toEqual({
      maxUsers: 5,
      maxBranches: 10,
      usedUsers: 3,
      usedBranches: 7,
    });
  });

  it('sin fila de plan_limits → ilimitado', async () => {
    const s = makeService(null, 50, 50);
    await expect(s.getLimits()).resolves.toEqual({ maxUsers: null, maxBranches: null });
    await expect(s.assertCanCreateUser()).resolves.toBeUndefined();
  });

  it('updateLimits modifica solo los campos provistos y guarda', async () => {
    const row = { id: 1, maxUsers: null, maxBranches: null };
    const save = jest.fn(async (r: typeof row) => r);
    const repo = {
      findOne: async () => row,
      create: (x: Partial<typeof row>) => ({ ...row, ...x }),
      save,
    } as unknown as Repository<PlanLimitsOrmEntity>;
    const noop = { count: async () => 0 } as unknown as Repository<UserOrmEntity>;
    const s = new PlanLimitsService(repo, noop, noop as unknown as Repository<BranchOrmEntity>);

    await s.updateLimits({ maxUsers: 5 });
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ maxUsers: 5, maxBranches: null }),
    );
  });
});
