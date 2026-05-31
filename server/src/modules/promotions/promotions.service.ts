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
import {
  PromotionOrmEntity,
  PromotionType,
} from './promotion.orm-entity';
import type { CreatePromotionDto } from './dto/create-promotion.dto';
import type { ListPromotionsQuery } from './dto/list-promotions.query';
import type { UpdatePromotionDto } from './dto/update-promotion.dto';
import {
  toPromotionResponse,
  type PromotionResponse,
} from './dto/promotion.response';

export interface PromotionsListResponse {
  items: PromotionResponse[];
  total: number;
}

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(PromotionOrmEntity)
    private readonly repo: Repository<PromotionOrmEntity>,
  ) {}

  async list(q: ListPromotionsQuery, branchId: string): Promise<PromotionsListResponse> {
    const limit = q.limit ?? 50;
    const offset = q.offset ?? 0;
    const sort = resolveSort(
      q.sort,
      q.sortDir,
      ['name', 'priority', 'validFrom', 'validUntil', 'createdAt'] as const,
      { column: 'createdAt', dir: 'desc' },
    );
    const sortColumnMap = {
      name: 'p.name',
      priority: 'p.priority',
      validFrom: 'p.validFrom',
      validUntil: 'p.validUntil',
      createdAt: 'p.createdAt',
    } as const;

    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.deletedAt IS NULL')
      .orderBy(sortColumnMap[sort.column], sort.dir.toUpperCase() as 'ASC' | 'DESC')
      .take(limit)
      .skip(offset);
    applyBranchFilter(qb, 'p', branchId);

    if (q.q) {
      qb.andWhere('LOWER(p.name) LIKE :term', { term: `%${q.q.toLowerCase()}%` });
    }
    if (typeof q.isActive === 'boolean') {
      qb.andWhere('p.isActive = :ia', { ia: q.isActive });
    }
    if (q.status) {
      const now = new Date();
      if (q.status === 'inactive') {
        qb.andWhere('p.isActive = false');
      } else if (q.status === 'expired') {
        qb.andWhere('p.validUntil IS NOT NULL AND p.validUntil < :now', { now });
      } else if (q.status === 'scheduled') {
        qb.andWhere('p.isActive = true').andWhere(
          'p.validFrom IS NOT NULL AND p.validFrom > :now',
          { now },
        );
      } else if (q.status === 'active') {
        qb.andWhere('p.isActive = true')
          .andWhere('(p.validFrom IS NULL OR p.validFrom <= :now)', { now })
          .andWhere('(p.validUntil IS NULL OR p.validUntil >= :now)', { now });
      }
    }
    if (q.from) qb.andWhere('p.createdAt >= :from', { from: new Date(q.from) });
    if (q.to) qb.andWhere('p.createdAt <= :to', { to: new Date(q.to) });

    const [rows, total] = await qb.getManyAndCount();
    return { items: rows.map(toPromotionResponse), total };
  }

  async findById(id: string, branchId: string): Promise<PromotionResponse> {
    const p = await this.load(id, branchId);
    return toPromotionResponse(p);
  }

  async create(dto: CreatePromotionDto, branchId: string): Promise<PromotionResponse> {
    this.assertConsistency(dto);
    const entity = this.repo.create({
      branchId,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      type: dto.type,
      productId: dto.productId ?? null,
      variantId: dto.variantId ?? null,
      categoryId: dto.categoryId ?? null,
      percentOff: dto.percentOff ?? null,
      amountOff: dto.amountOff ?? null,
      minQuantity: dto.minQuantity ?? null,
      freeQuantity: dto.freeQuantity ?? null,
      minOrderTotal: dto.minOrderTotal ?? null,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      isActive: dto.isActive ?? true,
      priority: dto.priority ?? 0,
    });
    const saved = await this.repo.save(entity);
    return toPromotionResponse(saved);
  }

  async update(id: string, dto: UpdatePromotionDto, branchId: string): Promise<PromotionResponse> {
    const current = await this.load(id, branchId);
    const merged = { ...current, ...dto } as PromotionOrmEntity;
    this.assertConsistency({
      type: (dto.type ?? current.type) as PromotionType,
      percentOff: merged.percentOff ?? undefined,
      amountOff: merged.amountOff ?? undefined,
      minQuantity: merged.minQuantity ?? undefined,
      freeQuantity: merged.freeQuantity ?? undefined,
    });
    if (dto.name !== undefined) current.name = dto.name.trim();
    if (dto.description !== undefined) current.description = dto.description?.trim() || null;
    if (dto.type !== undefined) current.type = dto.type;
    if (dto.productId !== undefined) current.productId = dto.productId;
    if (dto.variantId !== undefined) current.variantId = dto.variantId;
    if (dto.categoryId !== undefined) current.categoryId = dto.categoryId;
    if (dto.percentOff !== undefined) current.percentOff = dto.percentOff;
    if (dto.amountOff !== undefined) current.amountOff = dto.amountOff;
    if (dto.minQuantity !== undefined) current.minQuantity = dto.minQuantity;
    if (dto.freeQuantity !== undefined) current.freeQuantity = dto.freeQuantity;
    if (dto.minOrderTotal !== undefined) current.minOrderTotal = dto.minOrderTotal;
    if (dto.validFrom !== undefined)
      current.validFrom = dto.validFrom ? new Date(dto.validFrom) : null;
    if (dto.validUntil !== undefined)
      current.validUntil = dto.validUntil ? new Date(dto.validUntil) : null;
    if (typeof dto.isActive === 'boolean') current.isActive = dto.isActive;
    if (typeof dto.priority === 'number') current.priority = dto.priority;
    const saved = await this.repo.save(current);
    return toPromotionResponse(saved);
  }

  async softDelete(id: string, branchId: string): Promise<void> {
    const p = await this.load(id, branchId);
    await this.repo.softRemove(p);
  }

  private async load(id: string, branchId?: string): Promise<PromotionOrmEntity> {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException(`Promoción ${id} no encontrada`);
    if (branchId) assertSameBranch(p.branchId, branchId);
    return p;
  }

  private assertConsistency(input: {
    type: string;
    percentOff?: string | null;
    amountOff?: string | null;
    minQuantity?: number | null;
    freeQuantity?: number | null;
  }): void {
    const needsPct =
      input.type === PromotionType.PRODUCT_PERCENT_OFF ||
      input.type === PromotionType.ORDER_PERCENT_OFF;
    const needsAmount =
      input.type === PromotionType.PRODUCT_AMOUNT_OFF ||
      input.type === PromotionType.ORDER_AMOUNT_OFF;
    const needsBxgy = input.type === PromotionType.PRODUCT_BUY_X_GET_Y;
    if (needsPct && (!input.percentOff || parseFloat(input.percentOff) <= 0)) {
      throw new ConflictException(`Este tipo requiere percentOff > 0`);
    }
    if (needsAmount && (!input.amountOff || parseFloat(input.amountOff) <= 0)) {
      throw new ConflictException(`Este tipo requiere amountOff > 0`);
    }
    if (needsBxgy) {
      const min = input.minQuantity ?? 0;
      const free = input.freeQuantity ?? 0;
      if (min <= free) {
        throw new ConflictException(
          'Para 2x1 (BUY_X_GET_Y): minQuantity (compra) debe ser mayor que freeQuantity (gratis)',
        );
      }
    }
  }
}
