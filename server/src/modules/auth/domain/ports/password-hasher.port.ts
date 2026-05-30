/**
 * Hashea y verifica passwords. Adapter típico: bcrypt.
 * Mantener este puerto permite swappear a argon2 sin tocar use cases.
 */
export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}
