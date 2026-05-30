import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Restringe un handler a uno o varios códigos de permiso.
 * El usuario debe tener al menos uno de los listados (ANY, no ALL).
 * Aplicado junto al PermissionsGuard global. Los handlers `@Public()`
 * se saltan este chequeo.
 *
 * @example
 *   @RequirePermissions('users.create')
 *   create(@Body() dto: CreateUserDto) { ... }
 */
export const RequirePermissions = (
  ...permissions: string[]
): MethodDecorator & ClassDecorator => SetMetadata(PERMISSIONS_KEY, permissions);
