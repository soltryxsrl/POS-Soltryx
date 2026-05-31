import { ExecutionContext, createParamDecorator } from '@nestjs/common';

export interface CurrentUserPayload {
  id: string;
  username: string;
  roles: string[];
  permissions: string[];
  /** Sucursal HOME del usuario (de su JWT). Null para ADMIN sin sucursal. */
  branchId: string | null;
}

/**
 * Extrae el usuario autenticado del request (lo coloca JwtAuthGuard).
 */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): CurrentUserPayload | undefined => {
    const req = ctx.switchToHttp().getRequest<{ user?: CurrentUserPayload }>();
    return req.user;
  },
);
