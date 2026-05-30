import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Restringe un handler a uno o varios códigos de rol (ADMIN, MANAGER, CASHIER).
 * Aplicado junto al RolesGuard global.
 */
export const Roles = (...roles: string[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
