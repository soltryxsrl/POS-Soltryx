/**
 * Port para actualizar el password_hash de un usuario.
 *
 * Se separa de UserReader porque éste es solo-lectura por contrato.
 * Lo usa el caso de uso ChangePassword (self-service).
 */
export const USER_PASSWORD_UPDATER = Symbol('USER_PASSWORD_UPDATER');

export interface UserPasswordUpdater {
  updatePasswordHash(userId: string, passwordHash: string): Promise<void>;
}
