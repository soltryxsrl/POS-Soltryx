import { ForbiddenException, type CallHandler, type ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { BranchContextInterceptor } from './branch-context.interceptor';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface FakeReq {
  user?: { branchId: string | null; permissions: string[] };
  branchId?: string | null;
  headers: Record<string, string | string[] | undefined>;
}

function makeCtx(req: FakeReq): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as any;
}

const next: CallHandler = { handle: () => of(null) } as any;

describe('BranchContextInterceptor (resolución de sucursal activa)', () => {
  const isActiveBranch = jest.fn();
  const getDefaultBranchId = jest.fn();
  const branches = { isActiveBranch, getDefaultBranchId } as any;
  let interceptor: BranchContextInterceptor;

  beforeEach(() => {
    jest.clearAllMocks();
    interceptor = new BranchContextInterceptor(branches);
  });

  it('cajero sin header → su sucursal HOME', async () => {
    const req: FakeReq = { user: { branchId: 'B1', permissions: [] }, headers: {} };
    await interceptor.intercept(makeCtx(req), next);
    expect(req.branchId).toBe('B1');
    expect(isActiveBranch).not.toHaveBeenCalled();
  });

  it('cajero con header de su propia sucursal → HOME', async () => {
    const req: FakeReq = {
      user: { branchId: 'B1', permissions: [] },
      headers: { 'x-branch-id': 'B1' },
    };
    await interceptor.intercept(makeCtx(req), next);
    expect(req.branchId).toBe('B1');
  });

  it('cajero con header de OTRA sucursal → 403 (candado del cajero)', async () => {
    const req: FakeReq = {
      user: { branchId: 'B1', permissions: [] },
      headers: { 'x-branch-id': 'B2' },
    };
    await expect(interceptor.intercept(makeCtx(req), next)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('admin con branches.switch + header válido → esa sucursal', async () => {
    isActiveBranch.mockResolvedValue(true);
    const req: FakeReq = {
      user: { branchId: 'B1', permissions: ['branches.switch'] },
      headers: { 'x-branch-id': 'B2' },
    };
    await interceptor.intercept(makeCtx(req), next);
    expect(req.branchId).toBe('B2');
    expect(isActiveBranch).toHaveBeenCalledWith('B2');
  });

  it('admin con branches.switch + header inválido/inactivo → 403', async () => {
    isActiveBranch.mockResolvedValue(false);
    const req: FakeReq = {
      user: { branchId: 'B1', permissions: ['branches.switch'] },
      headers: { 'x-branch-id': 'BAD' },
    };
    await expect(interceptor.intercept(makeCtx(req), next)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('admin sin sucursal home y sin header → sucursal por defecto', async () => {
    getDefaultBranchId.mockResolvedValue('PRINCIPAL');
    const req: FakeReq = {
      user: { branchId: null, permissions: ['branches.switch'] },
      headers: {},
    };
    await interceptor.intercept(makeCtx(req), next);
    expect(req.branchId).toBe('PRINCIPAL');
    expect(getDefaultBranchId).toHaveBeenCalled();
  });

  it('header como array (proxy) → toma el primer valor', async () => {
    isActiveBranch.mockResolvedValue(true);
    const req: FakeReq = {
      user: { branchId: 'B1', permissions: ['branches.switch'] },
      headers: { 'x-branch-id': ['B2', 'B3'] },
    };
    await interceptor.intercept(makeCtx(req), next);
    expect(req.branchId).toBe('B2');
  });

  it('request sin user (ruta pública) → no asigna branchId', async () => {
    const req: FakeReq = { headers: {} };
    await interceptor.intercept(makeCtx(req), next);
    expect(req.branchId).toBeUndefined();
  });
});
