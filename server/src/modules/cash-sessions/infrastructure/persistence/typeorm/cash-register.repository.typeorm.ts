import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import type { CashRegister } from '../../../domain/entities/cash-register.entity';
import type { CashRegisterRepository } from '../../../domain/ports/cash-register.repository.port';
import { CashRegisterOrmEntity } from './cash-register.orm-entity';

function toDomain(e: CashRegisterOrmEntity): CashRegister {
  return {
    id: e.id,
    branchId: e.branchId,
    code: e.code,
    name: e.name,
    isActive: e.isActive,
  };
}

@Injectable()
export class CashRegisterRepositoryTypeOrm implements CashRegisterRepository {
  constructor(
    @InjectRepository(CashRegisterOrmEntity)
    private readonly repo: Repository<CashRegisterOrmEntity>,
  ) {}

  async list(filter?: { isActive?: boolean }): Promise<CashRegister[]> {
    const qb = this.repo
      .createQueryBuilder('r')
      .where('r.deleted_at IS NULL')
      .orderBy('r.code', 'ASC');
    if (filter && typeof filter.isActive === 'boolean') {
      qb.andWhere('r.is_active = :a', { a: filter.isActive });
    }
    const rows = await qb.getMany();
    return rows.map(toDomain);
  }

  async findById(id: string): Promise<CashRegister | null> {
    const r = await this.repo.findOne({ where: { id, deletedAt: IsNull() } });
    return r ? toDomain(r) : null;
  }
}
