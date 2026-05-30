import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CategoryOrmEntity } from './category.orm-entity';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { ListCategoriesQuery } from './dto/list-categories.query';
import type { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(CategoryOrmEntity)
    private readonly repo: Repository<CategoryOrmEntity>,
  ) {}

  async list(q: ListCategoriesQuery): Promise<CategoryOrmEntity[]> {
    const qb = this.repo
      .createQueryBuilder('c')
      .where('c.deleted_at IS NULL')
      .orderBy('c.name', 'ASC');
    if (q.q) qb.andWhere('LOWER(c.name) LIKE :q', { q: `%${q.q.toLowerCase()}%` });
    if (q.parentId) qb.andWhere('c.parent_id = :parentId', { parentId: q.parentId });
    if (typeof q.isActive === 'boolean')
      qb.andWhere('c.is_active = :active', { active: q.isActive });
    return qb.getMany();
  }

  async findById(id: string): Promise<CategoryOrmEntity> {
    const c = await this.repo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!c) throw new NotFoundException(`Categoría ${id} no encontrada`);
    return c;
  }

  async create(dto: CreateCategoryDto): Promise<CategoryOrmEntity> {
    if (dto.parentId) await this.assertParentExists(dto.parentId);
    const exists = await this.repo
      .createQueryBuilder('c')
      .where('LOWER(c.name) = LOWER(:n)', { n: dto.name })
      .andWhere('c.deleted_at IS NULL')
      .getOne();
    if (exists) throw new ConflictException(`Ya existe una categoría con nombre "${dto.name}"`);

    const entity = this.repo.create({
      name: dto.name,
      description: dto.description ?? null,
      parentId: dto.parentId ?? null,
      isActive: dto.isActive ?? true,
    });
    return this.repo.save(entity);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryOrmEntity> {
    const current = await this.findById(id);
    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === id) {
        throw new ConflictException('Una categoría no puede ser su propio padre');
      }
      await this.assertParentExists(dto.parentId);
    }
    if (dto.name && dto.name.toLowerCase() !== current.name.toLowerCase()) {
      const dup = await this.repo
        .createQueryBuilder('c')
        .where('LOWER(c.name) = LOWER(:n)', { n: dto.name })
        .andWhere('c.id <> :id', { id })
        .andWhere('c.deleted_at IS NULL')
        .getOne();
      if (dup) throw new ConflictException(`Ya existe una categoría con nombre "${dto.name}"`);
    }
    Object.assign(current, {
      name: dto.name ?? current.name,
      description: dto.description ?? current.description,
      parentId: dto.parentId === undefined ? current.parentId : dto.parentId,
      isActive: dto.isActive ?? current.isActive,
    });
    return this.repo.save(current);
  }

  async softDelete(id: string): Promise<void> {
    const c = await this.findById(id);
    await this.repo.softRemove(c);
  }

  private async assertParentExists(parentId: string): Promise<void> {
    const parent = await this.repo.findOne({ where: { id: parentId, deletedAt: IsNull() } });
    if (!parent) throw new NotFoundException(`Categoría padre ${parentId} no encontrada`);
  }
}
