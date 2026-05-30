import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UserPasswordUpdater } from '../../../domain/ports/user-password-updater.port';
import { UserOrmEntity } from './user.orm-entity';

@Injectable()
export class UserPasswordUpdaterTypeOrm implements UserPasswordUpdater {
  constructor(
    @InjectRepository(UserOrmEntity) private readonly repo: Repository<UserOrmEntity>,
  ) {}

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.repo.update({ id: userId }, { passwordHash });
  }
}
