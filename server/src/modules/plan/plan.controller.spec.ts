import { ForbiddenException } from '@nestjs/common';
import { PlanController } from './plan.controller';
import type { PlanLimitsService, PlanUsage } from './plan-limits.service';

const USAGE: PlanUsage = {
  maxUsers: 5,
  maxBranches: 10,
  multiBranchEnabled: true,
  usedUsers: 1,
  usedBranches: 1,
};

function makeController() {
  const updateLimits = jest.fn(async () => undefined);
  const svc = {
    getUsage: async () => USAGE,
    updateLimits,
  } as unknown as PlanLimitsService;
  return { ctrl: new PlanController(svc), updateLimits };
}

describe('PlanController.update (candado super-admin)', () => {
  const ORIG = process.env.SUPERADMIN_SECRET;
  afterEach(() => {
    if (ORIG === undefined) delete process.env.SUPERADMIN_SECRET;
    else process.env.SUPERADMIN_SECRET = ORIG;
  });

  it('deshabilitado si no hay SUPERADMIN_SECRET en el entorno', async () => {
    delete process.env.SUPERADMIN_SECRET;
    const { ctrl, updateLimits } = makeController();
    await expect(ctrl.update('cualquier', { maxUsers: 5 })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(updateLimits).not.toHaveBeenCalled();
  });

  it('rechaza un secreto inválido', async () => {
    process.env.SUPERADMIN_SECRET = 'correcto';
    const { ctrl, updateLimits } = makeController();
    await expect(ctrl.update('incorrecto', { maxUsers: 5 })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(updateLimits).not.toHaveBeenCalled();
  });

  it('rechaza si falta el header del secreto', async () => {
    process.env.SUPERADMIN_SECRET = 'correcto';
    const { ctrl } = makeController();
    await expect(ctrl.update(undefined, { maxUsers: 5 })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('con el secreto correcto actualiza y devuelve el uso', async () => {
    process.env.SUPERADMIN_SECRET = 'correcto';
    const { ctrl, updateLimits } = makeController();
    const res = await ctrl.update('correcto', { maxUsers: 5, maxBranches: 10 });
    expect(updateLimits).toHaveBeenCalledWith(
      expect.objectContaining({ maxUsers: 5, maxBranches: 10 }),
    );
    expect(res).toEqual(USAGE);
  });
});
