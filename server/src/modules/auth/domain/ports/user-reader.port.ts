import type { AuthUser } from '../entities/auth-user.entity';

/**
 * Lectura de usuarios para Auth (login, validación de token).
 * Es solo-lectura intencional — los use cases de Auth no crean usuarios.
 * La creación/edición vive en el módulo Users.
 */
export const USER_READER = Symbol('USER_READER');

export interface UserReader {
  findByEmailOrUsername(emailOrUsername: string): Promise<AuthUser | null>;
  findById(id: string): Promise<AuthUser | null>;
  markLogin(userId: string, at: Date): Promise<void>;
}
