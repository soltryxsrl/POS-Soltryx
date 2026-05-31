/**
 * Usuario tal como lo consume el dominio de Auth.
 * Sin decoradores TypeORM ni dependencias del framework.
 * El adapter de persistencia mapea desde el ORM entity hacia este tipo.
 */
export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly fullName: string;
  readonly passwordHash: string;
  readonly isActive: boolean;
  readonly branchId: string | null; // sucursal HOME (null = ADMIN sin sucursal)
  readonly roles: ReadonlyArray<string>; // códigos de rol (ADMIN, MANAGER, CASHIER)
  readonly permissions: ReadonlyArray<string>; // permisos efectivos (unión de roles)
}

/**
 * Vista pública del usuario (sin passwordHash). Lo que devolvemos al frontend.
 */
export interface AuthUserPublic {
  id: string;
  email: string;
  username: string;
  fullName: string;
  branchId: string | null;
  roles: string[];
  permissions: string[];
}

export function toPublic(user: AuthUser): AuthUserPublic {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    fullName: user.fullName,
    branchId: user.branchId,
    roles: [...user.roles],
    permissions: [...user.permissions],
  };
}
