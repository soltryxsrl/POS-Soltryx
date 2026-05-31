import { ForbiddenException } from '@nestjs/common';
import {
  applyBranchFilter,
  assertSameBranch,
  resolveReportBranchScope,
} from './branch-scope.util';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('assertSameBranch', () => {
  it('pasa si la entidad pertenece a la sucursal activa', () => {
    expect(() => assertSameBranch('B1', 'B1')).not.toThrow();
  });

  it('lanza 403 si la entidad es de otra sucursal', () => {
    expect(() => assertSameBranch('B1', 'B2')).toThrow(ForbiddenException);
  });

  it('lanza 403 si la entidad no tiene sucursal (null)', () => {
    expect(() => assertSameBranch(null, 'B2')).toThrow(ForbiddenException);
  });
});

describe('applyBranchFilter', () => {
  it('agrega andWhere `<alias>.branchId = :branchId`', () => {
    const qb = { andWhere: jest.fn().mockReturnThis() } as any;
    applyBranchFilter(qb, 'p', 'B1');
    expect(qb.andWhere).toHaveBeenCalledWith('p.branchId = :branchId', {
      branchId: 'B1',
    });
  });
});

describe('resolveReportBranchScope', () => {
  it('`all` + permiso branches.switch → null (consolidado)', () => {
    expect(resolveReportBranchScope('all', 'B1', ['branches.switch'])).toBeNull();
  });

  it('`all` SIN permiso → cae a la sucursal activa (no consolida)', () => {
    expect(resolveReportBranchScope('all', 'B1', [])).toBe('B1');
  });

  it('sin parámetro → sucursal activa', () => {
    expect(resolveReportBranchScope(undefined, 'B1', ['branches.switch'])).toBe('B1');
  });

  it('un id arbitrario distinto de `all` → se ignora, usa la activa', () => {
    expect(resolveReportBranchScope('B2', 'B1', ['branches.switch'])).toBe('B1');
  });
});
