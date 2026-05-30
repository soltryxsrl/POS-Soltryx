import { Inject, Injectable } from '@nestjs/common';
import {
  CurrentPasswordWrongError,
  NewPasswordSameAsCurrentError,
} from '../../domain/errors/change-password.errors';
import { InvalidCredentialsError } from '../../domain/errors/auth.errors';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../../domain/ports/password-hasher.port';
import {
  USER_PASSWORD_UPDATER,
  type UserPasswordUpdater,
} from '../../domain/ports/user-password-updater.port';
import { USER_READER, type UserReader } from '../../domain/ports/user-reader.port';

export interface ChangePasswordInput {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject(USER_READER) private readonly users: UserReader,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(USER_PASSWORD_UPDATER) private readonly updater: UserPasswordUpdater,
  ) {}

  async execute(input: ChangePasswordInput): Promise<void> {
    const user = await this.users.findById(input.userId);
    if (!user) throw new InvalidCredentialsError();

    const ok = await this.hasher.verify(input.currentPassword, user.passwordHash);
    if (!ok) throw new CurrentPasswordWrongError();

    if (input.currentPassword === input.newPassword) {
      throw new NewPasswordSameAsCurrentError();
    }

    const newHash = await this.hasher.hash(input.newPassword);
    await this.updater.updatePasswordHash(user.id, newHash);
  }
}
