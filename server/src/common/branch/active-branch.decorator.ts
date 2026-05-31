import {
  ExecutionContext,
  ForbiddenException,
  createParamDecorator,
} from '@nestjs/common';

/**
 * Lee la sucursal activa que resolvió `BranchContextInterceptor` y dejó en
 * `request.branchId`. Devuelve siempre un id (no-null): las rutas scoped
 * requieren sucursal, así que lanza 403 si por alguna razón no se resolvió.
 */
export const ActiveBranch = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<{ branchId?: string | null }>();
    if (!req.branchId) {
      throw new ForbiddenException('No hay una sucursal activa para esta operación');
    }
    return req.branchId;
  },
);
