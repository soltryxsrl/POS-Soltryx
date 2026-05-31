export interface AuthUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  /** Sucursal HOME del usuario. Null para ADMIN sin sucursal. */
  branchId: string | null;
  roles: string[];
  permissions: string[];
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  accessTokenExpiresInSec: number;
}

export interface LoginInput {
  emailOrUsername: string;
  password: string;
}
