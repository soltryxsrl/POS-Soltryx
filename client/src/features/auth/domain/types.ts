export interface AuthUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  roles: string[];
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
