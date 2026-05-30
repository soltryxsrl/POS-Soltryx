import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import type { CurrentUserPayload } from './current-user.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<{ user?: CurrentUserPayload }>();
    const user = req.user;
    if (!user) throw new ForbiddenException('No autenticado');

    const has = user.roles.some((r) => required.includes(r));
    if (!has) throw new ForbiddenException('Rol insuficiente');
    return true;
  }
}
