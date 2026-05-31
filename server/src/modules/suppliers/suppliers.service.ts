import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { resolveSort } from '../../common/dto/pagination-sort.query';
import {
  applyBranchFilter,
  assertSameBranch,
} from '../../common/branch/branch-scope.util';
import type { CreateSupplierDto } from './dto/create-supplier.dto';
import type { ListSuppliersQuery } from './dto/list-suppliers.query';
import type { UpdateSupplierDto } from './dto/update-supplier.dto';
import {
  toSupplierResponse,
  type SupplierResponse,
  type SuppliersListResponse,
} from './dto/supplier.response';
import { SupplierOrmEntity } from './supplier.orm-entity';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(SupplierOrmEntity)
    private readonly repo: Repository<SupplierOrmEntity>,
  ) {}

  async list(q: ListSuppliersQuery, branchId: string): Promise<SuppliersListResponse> {
    const limit = q.limit ?? 50;
    const offset = q.offset ?? 0;
    const sort = resolveSort(
      q.sort,
      q.sortDir,
      ['tradeName', 'rnc', 'createdAt'] as const,
      { column: 'tradeName', dir: 'asc' },
    );
    const sortColumnMap = {
      tradeName: 's.tradeName',
      rnc: 's.rnc',
      createdAt: 's.createdAt',
    } as const;
    const qb = this.repo
      .createQueryBuilder('s')
      .where('s.deletedAt IS NULL')
      .orderBy(sortColumnMap[sort.column], sort.dir.toUpperCase() as 'ASC' | 'DESC')
      .skip(offset)
      .take(limit);
    applyBranchFilter(qb, 's', branchId);

    if (q.q) {
      const search = `%${q.q.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(s.tradeName) LIKE :s OR LOWER(s.legalName) LIKE :s OR LOWER(s.rnc) LIKE :s OR LOWER(s.contactName) LIKE :s OR LOWER(s.phone) LIKE :s)',
        { s: search },
      );
    }
    if (q.isActive === 'true') qb.andWhere('s.isActive = true');
    if (q.isActive === 'false') qb.andWhere('s.isActive = false');

    const [items, total] = await qb.getManyAndCount();
    return { items: items.map(toSupplierResponse), total, limit, offset };
  }

  async findById(id: string, branchId: string): Promise<SupplierResponse> {
    const s = await this.loadById(id);
    assertSameBranch(s.branchId, branchId);
    return toSupplierResponse(s);
  }

  async create(dto: CreateSupplierDto, branchId: string): Promise<SupplierResponse> {
    if (dto.rnc) await this.assertRncAvailable(dto.rnc, branchId);
    const entity = this.repo.create({
      branchId,
      tradeName: dto.tradeName.trim(),
      legalName: dto.legalName?.trim() || null,
      rnc: dto.rnc?.trim() || null,
      contactName: dto.contactName?.trim() || null,
      phone: dto.phone?.trim() || null,
      email: dto.email?.trim().toLowerCase() || null,
      address: dto.address?.trim() || null,
      notes: dto.notes?.trim() || null,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.repo.save(entity);
    return toSupplierResponse(saved);
  }

  async update(id: string, dto: UpdateSupplierDto, branchId: string): Promise<SupplierResponse> {
    const current = await this.loadById(id);
    assertSameBranch(current.branchId, branchId);
    if (dto.rnc !== undefined && dto.rnc !== current.rnc) {
      if (dto.rnc) await this.assertRncAvailable(dto.rnc, branchId, id);
      current.rnc = dto.rnc?.trim() || null;
    }
    if (dto.tradeName !== undefined) current.tradeName = dto.tradeName.trim();
    if (dto.legalName !== undefined) current.legalName = dto.legalName?.trim() || null;
    if (dto.contactName !== undefined) current.contactName = dto.contactName?.trim() || null;
    if (dto.phone !== undefined) current.phone = dto.phone?.trim() || null;
    if (dto.email !== undefined) current.email = dto.email?.trim().toLowerCase() || null;
    if (dto.address !== undefined) current.address = dto.address?.trim() || null;
    if (dto.notes !== undefined) current.notes = dto.notes?.trim() || null;
    if (typeof dto.isActive === 'boolean') current.isActive = dto.isActive;

    const saved = await this.repo.save(current);
    return toSupplierResponse(saved);
  }

  async softDelete(id: string, branchId: string): Promise<void> {
    const s = await this.loadById(id);
    assertSameBranch(s.branchId, branchId);
    await this.repo.softRemove(s);
  }

  private async loadById(id: string): Promise<SupplierOrmEntity> {
    const s = await this.repo.findOne({ where: { id } });
    if (!s) throw new NotFoundException(`Proveedor ${id} no encontrado`);
    return s;
  }

  private async assertRncAvailable(
    rnc: string,
    branchId: string,
    excludeId?: string,
  ): Promise<void> {
    const qb = this.repo
      .createQueryBuilder('s')
      .where('s.rnc = :rnc', { rnc })
      .andWhere('s.branchId = :branchId', { branchId })
      .andWhere('s.deletedAt IS NULL');
    if (excludeId) qb.andWhere('s.id <> :id', { id: excludeId });
    const exists = await qb.getOne();
    if (exists) {
      throw new ConflictException(`RNC "${rnc}" ya está registrado en otro proveedor`);
    }
  }
}
