import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthUser } from '../../../domain/entities/auth-user.entity';
import type { UserReader } from '../../../domain/ports/user-reader.port';
import { UserOrmEntity } from './user.orm-entity';

function toDomain(u: UserOrmEntity): AuthUser {
  const roles = u.roles ?? [];
  const permissions = new Set<string>();
  for (const r of roles) {
    for (const p of r.permissions ?? []) permissions.add(p.code);
  }
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    fullName: u.fullName,
    passwordHash: u.passwordHash,
    isActive: u.isActive,
    roles: roles.map((r) => r.code),
    permissions: [...permissions],
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
      .leftJoinAndSelect('r.permissions', 'p')
      .where('u.email = :v OR u.username = :v', { v: emailOrUsername })
      .andWhere('u.deleted_at IS NULL')
      .getOne();
    return u ? toDomain(u) : null;
  }

  async findById(id: string): Promise<AuthUser | null> {
    const u = await this.repo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.roles', 'r')
      .leftJoinAndSelect('r.permissions', 'p')
      .where('u.id = :id', { id })
      .andWhere('u.deleted_at IS NULL')
      .getOne();
    return u ? toDomain(u) : null;
  }

  async markLogin(userId: string, at: Date): Promise<void> {
    await this.repo.update({ id: userId }, { lastLoginAt: at });
  }
}
