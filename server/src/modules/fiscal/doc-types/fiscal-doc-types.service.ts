import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  FiscalDocAppliesTo,
  FiscalDocTypeOrmEntity,
} from './fiscal-doc-type.orm-entity';

export interface FiscalDocTypeResponse {
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  requiresBuyerRnc: boolean;
  appliesTo: FiscalDocAppliesTo;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class FiscalDocTypesService {
  constructor(
    @InjectRepository(FiscalDocTypeOrmEntity)
    private readonly repo: Repository<FiscalDocTypeOrmEntity>,
  ) {}

  async list(filter?: {
    activeOnly?: boolean;
    appliesTo?: FiscalDocAppliesTo;
  }): Promise<FiscalDocTypeResponse[]> {
    const qb = this.repo.createQueryBuilder('t').orderBy('t.code', 'ASC');
    if (filter?.activeOnly) qb.andWhere('t.isActive = true');
    if (filter?.appliesTo) {
      qb.andWhere('(t.appliesTo = :a OR t.appliesTo = :both)', {
        a: filter.appliesTo,
        both: FiscalDocAppliesTo.BOTH,
      });
    }
    const rows = await qb.getMany();
    return rows.map(toResponse);
  }

  async setActive(code: string, isActive: boolean): Promise<FiscalDocTypeResponse> {
    const row = await this.repo.findOne({ where: { code } });
    if (!row) throw new NotFoundException(`Tipo ${code} no existe`);
    row.isActive = isActive;
    const saved = await this.repo.save(row);
    return toResponse(saved);
  }
}

function toResponse(e: FiscalDocTypeOrmEntity): FiscalDocTypeResponse {
  return {
    code: e.code,
    name: e.name,
    description: e.description,
    isActive: e.isActive,
    requiresBuyerRnc: e.requiresBuyerRnc,
    appliesTo: e.appliesTo as FiscalDocAppliesTo,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}
