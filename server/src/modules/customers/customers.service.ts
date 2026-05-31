import {
  BadRequestException,
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
import { CustomerOrmEntity } from './customer.orm-entity';
import type { CreateCustomerDto } from './dto/create-customer.dto';
import type { ListCustomersQuery } from './dto/list-customers.query';
import type { UpdateCustomerDto } from './dto/update-customer.dto';
import {
  toCustomerResponse,
  type CustomerResponse,
  type CustomersListResponse,
} from './dto/customer.response';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(CustomerOrmEntity)
    private readonly repo: Repository<CustomerOrmEntity>,
  ) {}

  async list(q: ListCustomersQuery, branchId: string): Promise<CustomersListResponse> {
    const limit = q.limit ?? 50;
    const offset = q.offset ?? 0;

    const sort = resolveSort(
      q.sort,
      q.sortDir,
      ['fullName', 'document', 'email', 'createdAt'] as const,
      { column: 'fullName', dir: 'asc' },
    );
    const sortColumnMap = {
      fullName: 'c.fullName',
      document: 'c.document',
      email: 'c.email',
      createdAt: 'c.createdAt',
    } as const;
    const qb = this.repo
      .createQueryBuilder('c')
      .where('c.deletedAt IS NULL')
      .orderBy(sortColumnMap[sort.column], sort.dir.toUpperCase() as 'ASC' | 'DESC')
      .skip(offset)
      .take(limit);
    applyBranchFilter(qb, 'c', branchId);

    if (q.q) {
      const search = `%${q.q.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(c.fullName) LIKE :s OR LOWER(c.document) LIKE :s OR LOWER(c.phone) LIKE :s OR LOWER(c.email) LIKE :s)',
        { s: search },
      );
    }
    if (q.isActive === 'true') qb.andWhere('c.isActive = true');
    if (q.isActive === 'false') qb.andWhere('c.isActive = false');

    const [items, total] = await qb.getManyAndCount();
    return { items: items.map(toCustomerResponse), total, limit, offset };
  }

  async findById(id: string, branchId: string): Promise<CustomerResponse> {
    const c = await this.loadById(id);
    assertSameBranch(c.branchId, branchId);
    return toCustomerResponse(c);
  }

  async create(dto: CreateCustomerDto, branchId: string): Promise<CustomerResponse> {
    if (dto.document) {
      this.assertDocumentFormat(dto.documentType ?? null, dto.document);
      await this.assertDocumentAvailable(dto.documentType ?? null, dto.document, branchId);
    }
    const entity = this.repo.create({
      branchId,
      fullName: dto.fullName.trim(),
      documentType: dto.documentType ?? null,
      document: dto.document?.trim() || null,
      email: dto.email?.trim().toLowerCase() || null,
      phone: dto.phone?.trim() || null,
      address: dto.address?.trim() || null,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.repo.save(entity);
    return toCustomerResponse(saved);
  }

  async update(id: string, dto: UpdateCustomerDto, branchId: string): Promise<CustomerResponse> {
    const current = await this.loadById(id);
    assertSameBranch(current.branchId, branchId);

    if (dto.document !== undefined && dto.document !== current.document) {
      if (dto.document) {
        const effectiveType = dto.documentType ?? current.documentType;
        this.assertDocumentFormat(effectiveType, dto.document);
        await this.assertDocumentAvailable(effectiveType, dto.document, branchId, id);
      }
      current.document = dto.document?.trim() || null;
    }
    if (dto.fullName !== undefined) current.fullName = dto.fullName.trim();
    if (dto.documentType !== undefined) current.documentType = dto.documentType;
    if (dto.email !== undefined) current.email = dto.email?.trim().toLowerCase() || null;
    if (dto.phone !== undefined) current.phone = dto.phone?.trim() || null;
    if (dto.address !== undefined) current.address = dto.address?.trim() || null;
    if (typeof dto.isActive === 'boolean') current.isActive = dto.isActive;

    const saved = await this.repo.save(current);
    return toCustomerResponse(saved);
  }

  async softDelete(id: string, branchId: string): Promise<void> {
    const c = await this.loadById(id);
    assertSameBranch(c.branchId, branchId);
    await this.repo.softRemove(c);
  }

  private async loadById(id: string): Promise<CustomerOrmEntity> {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException(`Cliente ${id} no encontrado`);
    return c;
  }

  /**
   * Valida formato DGII: RNC son 9 dígitos, Cédula son 11. PASSPORT y OTHER
   * aceptan cualquier formato hasta 32 chars (ya valida class-validator).
   * No validamos checksum por simplicidad — DGII no lo exige al recibir
   * comprobantes, solo el formato.
   */
  private assertDocumentFormat(
    documentType: string | null,
    document: string,
  ): void {
    // Acepta cualquier formato con o sin guiones — el cliente puede mandar
    // "003-1234567-8" formateado o "00312345678" plano. Contamos solo dígitos.
    const digits = document.replace(/\D+/g, '');
    if (documentType === 'RNC' && digits.length !== 9) {
      throw new BadRequestException(
        'RNC debe ser exactamente 9 dígitos numéricos',
      );
    }
    if (documentType === 'CEDULA' && digits.length !== 11) {
      throw new BadRequestException(
        'Cédula debe ser exactamente 11 dígitos numéricos',
      );
    }
  }

  private async assertDocumentAvailable(
    documentType: string | null,
    document: string,
    branchId: string,
    excludeId?: string,
  ): Promise<void> {
    const qb = this.repo
      .createQueryBuilder('c')
      .where('c.document = :doc', { doc: document })
      .andWhere('c.branchId = :branchId', { branchId })
      .andWhere('c.deletedAt IS NULL');
    if (documentType) qb.andWhere('c.documentType = :dt', { dt: documentType });
    if (excludeId) qb.andWhere('c.id <> :id', { id: excludeId });
    const exists = await qb.getOne();
    if (exists) {
      throw new ConflictException(
        `Documento "${document}" ya está registrado en otro cliente`,
      );
    }
  }
}
