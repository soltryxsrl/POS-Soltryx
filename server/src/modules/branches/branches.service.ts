import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { resolveSort } from '../../common/dto/pagination-sort.query';
import { PlanLimitsService } from '../plan/plan-limits.service';
import { BranchOrmEntity } from './branch.orm-entity';
import type { CreateBranchDto } from './dto/create-branch.dto';
import type { ListBranchesQuery } from './dto/list-branches.query';
import type { UpdateBranchDto } from './dto/update-branch.dto';
import {
  toBranchResponse,
  type BranchResponse,
  type BranchesListResponse,
} from './dto/branch.response';

/** Código de la sucursal por defecto sembrada por la migración/seed. */
export const DEFAULT_BRANCH_CODE = 'PRINCIPAL';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(BranchOrmEntity)
    private readonly repo: Repository<BranchOrmEntity>,
    private readonly plan: PlanLimitsService,
  ) {}

  // Cache corto de IDs de sucursales activas, para que el interceptor de
  // contexto no golpee la BD en cada request.
  private activeCache: { ids: Set<string>; at: number } | null = null;
  private static readonly CACHE_TTL_MS = 30_000;

  async list(q: ListBranchesQuery): Promise<BranchesListResponse> {
    const limit = q.limit ?? 50;
    const offset = q.offset ?? 0;
    const sort = resolveSort(
      q.sort,
      q.sortDir,
      ['name', 'code', 'createdAt'] as const,
      { column: 'name', dir: 'asc' },
    );
    const sortColumnMap = {
      name: 'b.name',
      code: 'b.code',
      createdAt: 'b.createdAt',
    } as const;

    const qb = this.repo
      .createQueryBuilder('b')
      .where('b.deletedAt IS NULL')
      .orderBy(sortColumnMap[sort.column], sort.dir.toUpperCase() as 'ASC' | 'DESC')
      .skip(offset)
      .take(limit);

    if (q.q) {
      const s = `%${q.q.toLowerCase()}%`;
      qb.andWhere('(LOWER(b.name) LIKE :s OR LOWER(b.code) LIKE :s)', { s });
    }
    if (q.isActive === 'true') qb.andWhere('b.isActive = true');
    if (q.isActive === 'false') qb.andWhere('b.isActive = false');

    const [items, total] = await qb.getManyAndCount();
    return { items: items.map(toBranchResponse), total, limit, offset };
  }

  async findById(id: string): Promise<BranchResponse> {
    return toBranchResponse(await this.loadById(id));
  }

  async create(dto: CreateBranchDto): Promise<BranchResponse> {
    await this.plan.assertCanCreateBranch();
    await this.assertCodeAvailable(dto.code);
    const entity = this.repo.create({
      code: dto.code.toUpperCase(),
      name: dto.name.trim(),
      rnc: dto.rnc?.trim() || null,
      address: dto.address?.trim() || null,
      phone: dto.phone?.trim() || null,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.repo.save(entity);
    this.activeCache = null;
    return toBranchResponse(saved);
  }

  async update(id: string, dto: UpdateBranchDto): Promise<BranchResponse> {
    const current = await this.loadById(id);
    if (dto.name !== undefined) current.name = dto.name.trim();
    if (dto.rnc !== undefined) current.rnc = dto.rnc?.trim() || null;
    if (dto.address !== undefined) current.address = dto.address?.trim() || null;
    if (dto.phone !== undefined) current.phone = dto.phone?.trim() || null;
    if (typeof dto.isActive === 'boolean') current.isActive = dto.isActive;
    const saved = await this.repo.save(current);
    this.activeCache = null;
    return toBranchResponse(saved);
  }

  async softDelete(id: string): Promise<void> {
    const b = await this.loadById(id);
    await this.repo.softRemove(b);
    this.activeCache = null;
  }

  /** Conjunto de IDs de sucursales activas (cacheado ~30s) para el interceptor. */
  async getActiveBranchIds(): Promise<Set<string>> {
    const now = Date.now();
    if (this.activeCache && now - this.activeCache.at < BranchesService.CACHE_TTL_MS) {
      return this.activeCache.ids;
    }
    const rows = await this.repo.find({
      where: { isActive: true },
      select: { id: true },
    });
    const ids = new Set(rows.map((r) => r.id));
    this.activeCache = { ids, at: now };
    return ids;
  }

  async isActiveBranch(id: string): Promise<boolean> {
    return (await this.getActiveBranchIds()).has(id);
  }

  /** ID de la sucursal por defecto (fallback del interceptor). Null si no existe. */
  async getDefaultBranchId(): Promise<string | null> {
    const b = await this.repo.findOne({ where: { code: DEFAULT_BRANCH_CODE } });
    return b?.id ?? null;
  }

  private async loadById(id: string): Promise<BranchOrmEntity> {
    const b = await this.repo.findOne({ where: { id } });
    if (!b) throw new NotFoundException(`Sucursal ${id} no encontrada`);
    return b;
  }

  private async assertCodeAvailable(code: string): Promise<void> {
    const exists = await this.repo.findOne({
      where: { code: code.toUpperCase() },
      withDeleted: true,
    });
    if (exists) {
      throw new ConflictException(`El código de sucursal "${code}" ya existe`);
    }
  }
}
