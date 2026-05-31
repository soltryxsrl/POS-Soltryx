import { ConflictException, Injectable } from '@nestjs/common';
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

  async list(filter?: { isActive?: boolean; branchId?: string }): Promise<CashRegister[]> {
    const qb = this.repo
      .createQueryBuilder('r')
      .where('r.deleted_at IS NULL')
      .orderBy('r.code', 'ASC');
    if (filter?.branchId) {
      qb.andWhere('r.branch_id = :branchId', { branchId: filter.branchId });
    }
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

  async create(input: {
    name: string;
    code?: string;
    branchId: string;
  }): Promise<CashRegister> {
    const code = input.code?.trim()
      ? input.code.trim().toUpperCase()
      : await this.nextCode();
    const dup = await this.repo.findOne({ where: { code }, withDeleted: true });
    if (dup) throw new ConflictException(`Ya existe una caja con código "${code}"`);
    const saved = await this.repo.save(
      this.repo.create({
        code,
        name: input.name.trim(),
        branchId: input.branchId,
        isActive: true,
      }),
    );
    return toDomain(saved);
  }

  /** Genera el siguiente código CR-NNN libre (considera cajas eliminadas). */
  private async nextCode(): Promise<string> {
    const count = await this.repo.count({ withDeleted: true });
    let n = count + 1;
    // Salta huecos / códigos manuales hasta encontrar uno libre.
    for (;;) {
      const code = `CR-${String(n).padStart(3, '0')}`;
      const exists = await this.repo.findOne({
        where: { code },
        withDeleted: true,
      });
      if (!exists) return code;
      n += 1;
    }
  }
}
