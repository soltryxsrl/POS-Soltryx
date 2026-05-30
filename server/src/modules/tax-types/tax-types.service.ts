import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaxTypeOrmEntity } from './tax-type.orm-entity';

export interface TaxTypeResponse {
  code: string;
  name: string;
  rate: string;
  isExempt: boolean;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class TaxTypesService {
  constructor(
    @InjectRepository(TaxTypeOrmEntity)
    private readonly repo: Repository<TaxTypeOrmEntity>,
  ) {}

  async list(activeOnly?: boolean): Promise<TaxTypeResponse[]> {
    const qb = this.repo
      .createQueryBuilder('t')
      .orderBy('t.sortOrder', 'ASC')
      .addOrderBy('t.rate', 'DESC');
    if (activeOnly) qb.andWhere('t.isActive = true');
    const rows = await qb.getMany();
    return rows.map(toResponse);
  }

  async setActive(code: string, isActive: boolean): Promise<TaxTypeResponse> {
    const row = await this.repo.findOne({ where: { code } });
    if (!row) throw new NotFoundException(`Tipo de ITBIS ${code} no existe`);
    if (!isActive && row.isDefault) {
      throw new ConflictException(
        'No se puede desactivar el tipo de ITBIS por defecto. Marca otro como default primero.',
      );
    }
    row.isActive = isActive;
    const saved = await this.repo.save(row);
    return toResponse(saved);
  }

  /** Marca un tipo como default (y limpia el anterior). El default queda activo. */
  async setDefault(code: string): Promise<TaxTypeResponse> {
    return this.repo.manager.transaction(async (m) => {
      const row = await m.findOne(TaxTypeOrmEntity, { where: { code } });
      if (!row) throw new NotFoundException(`Tipo de ITBIS ${code} no existe`);
      // Limpiar el default actual ANTES de setear el nuevo (índice único parcial).
      await m.update(TaxTypeOrmEntity, { isDefault: true }, { isDefault: false });
      row.isDefault = true;
      row.isActive = true;
      const saved = await m.save(row);
      return toResponse(saved);
    });
  }
}

function toResponse(e: TaxTypeOrmEntity): TaxTypeResponse {
  return {
    code: e.code,
    name: e.name,
    rate: e.rate,
    isExempt: e.isExempt,
    isActive: e.isActive,
    isDefault: e.isDefault,
    sortOrder: e.sortOrder,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}
