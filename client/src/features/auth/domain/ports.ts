import type { AuthSession, AuthUser, LoginInput } from './types';

/**
 * Puerto del feature Auth.
 *
 * Cualquier adapter compatible puede sustituirse:
 *   - `AuthApiHttp` — backend NestJS
 *   - `AuthApiMock` — tests
 */
export interface AuthApi {
  login(input: LoginInput): Promise<AuthSession>;
  /** Devuelve null si no hay sesión válida (cookie ausente o refresh inválido). */
  refresh(): Promise<AuthSession | null>;
  /** Idempotente — no falla si no hay sesión. */
  logout(): Promise<void>;
  me(): Promise<{ user: AuthUser }>;
  /** Self-service: el usuario actual cambia su propia contraseña. */
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
}
