import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import type {
  RefreshTokenRepository,
  SaveRefreshTokenInput,
  StoredRefreshToken,
} from '../../../domain/ports/refresh-token.repository.port';
import { RefreshTokenOrmEntity } from './refresh-token.orm-entity';

function toDomain(r: RefreshTokenOrmEntity): StoredRefreshToken {
  return {
    id: r.id,
    userId: r.userId,
    tokenHash: r.tokenHash,
    expiresAt: r.expiresAt,
    revokedAt: r.revokedAt,
    userAgent: r.userAgent,
    ipAddress: r.ipAddress,
    createdAt: r.createdAt,
  };
}

@Injectable()
export class RefreshTokenRepositoryTypeOrm implements RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshTokenOrmEntity)
    private readonly repo: Repository<RefreshTokenOrmEntity>,
  ) {}

  async save(input: SaveRefreshTokenInput): Promise<void> {
    await this.repo.insert({
      id: input.id,
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
      revokedAt: null,
    });
  }

  async findById(id: string): Promise<StoredRefreshToken | null> {
    const r = await this.repo.findOne({ where: { id } });
    return r ? toDomain(r) : null;
  }

  async revoke(id: string, at: Date): Promise<void> {
    await this.repo.update({ id, revokedAt: IsNull() }, { revokedAt: at });
  }

  async revokeAllForUser(userId: string, at: Date): Promise<void> {
    await this.repo.update({ userId, revokedAt: IsNull() }, { revokedAt: at });
  }
}
