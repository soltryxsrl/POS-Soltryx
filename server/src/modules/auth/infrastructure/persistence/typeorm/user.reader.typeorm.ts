import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthUser } from '../../../domain/entities/auth-user.entity';
import type { UserReader } from '../../../domain/ports/user-reader.port';
import { UserOrmEntity } from './user.orm-entity';

function toDomain(u: UserOrmEntity): AuthUser {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    fullName: u.fullName,
    passwordHash: u.passwordHash,
    isActive: u.isActive,
    roles: (u.roles ?? []).map((r) => r.code),
  };
}

@Injectable()
export class UserReaderTypeOrm implements UserReader {
  constructor(
    @InjectRepository(UserOrmEntity) private readonly repo: Repository<UserOrmEntity>,
  ) {}

  async findByEmailOrUsername(emailOrUsername: string): Promise<AuthUser | null> {
    const u = await this.repo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.roles', 'r')
      .where('u.email = :v OR u.username = :v', { v: emailOrUsername })
      .andWhere('u.deleted_at IS NULL')
      .getOne();
    return u ? toDomain(u) : null;
  }

  async findById(id: string): Promise<AuthUser | null> {
    const u = await this.repo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.roles', 'r')
      .where('u.id = :id', { id })
      .andWhere('u.deleted_at IS NULL')
      .getOne();
    return u ? toDomain(u) : null;
  }

  async markLogin(userId: string, at: Date): Promise<void> {
    await this.repo.update({ id: userId }, { lastLoginAt: at });
  }
}
