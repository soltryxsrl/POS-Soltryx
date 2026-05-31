import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { resolveSort } from '../../common/dto/pagination-sort.query';
import { BranchesService } from '../branches/branches.service';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../auth/domain/ports/password-hasher.port';
import { RoleOrmEntity } from '../auth/infrastructure/persistence/typeorm/role.orm-entity';
import { UserOrmEntity } from '../auth/infrastructure/persistence/typeorm/user.orm-entity';
import type { CreateUserDto } from './dto/create-user.dto';
import type { ListUsersQuery } from './dto/list-users.query';
import type { UpdateUserDto } from './dto/update-user.dto';
import {
  toUserResponse,
  type UserResponse,
  type UsersListResponse,
} from './dto/user.response';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserOrmEntity) private readonly users: Repository<UserOrmEntity>,
    @InjectRepository(RoleOrmEntity) private readonly roles: Repository<RoleOrmEntity>,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    private readonly branches: BranchesService,
  ) {}

  async list(q: ListUsersQuery): Promise<UsersListResponse> {
    const limit = q.limit ?? 50;
    const offset = q.offset ?? 0;

    const sort = resolveSort(
      q.sort,
      q.sortDir,
      ['username', 'email', 'fullName', 'createdAt'] as const,
      { column: 'username', dir: 'asc' },
    );
    const sortColumnMap = {
      username: 'u.username',
      email: 'u.email',
      fullName: 'u.fullName',
      createdAt: 'u.createdAt',
    } as const;
    const qb = this.users
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.roles', 'r')
      .where('u.deletedAt IS NULL')
      .orderBy(sortColumnMap[sort.column], sort.dir.toUpperCase() as 'ASC' | 'DESC')
      .skip(offset)
      .take(limit);

    if (q.q) {
      const search = `%${q.q.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(u.email) LIKE :s OR LOWER(u.username) LIKE :s OR LOWER(u.fullName) LIKE :s)',
        { s: search },
      );
    }
    if (q.isActive === 'true') qb.andWhere('u.isActive = true');
    if (q.isActive === 'false') qb.andWhere('u.isActive = false');
    if (q.roleId) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = u.id AND ur.role_id = :rid
        )`,
        { rid: q.roleId },
      );
    }

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map(toUserResponse),
      total,
      limit,
      offset,
    };
  }

  async findById(id: string): Promise<UserResponse> {
    const u = await this.loadById(id);
    return toUserResponse(u);
  }

  async create(dto: CreateUserDto): Promise<UserResponse> {
    await this.assertEmailAvailable(dto.email);
    await this.assertUsernameAvailable(dto.username);

    const roles = await this.loadRoles(dto.roleIds ?? []);
    const branchId = await this.resolveBranchForRoles(dto.branchId ?? null, roles);
    const passwordHash = await this.hasher.hash(dto.password);

    const entity = this.users.create({
      email: dto.email.trim().toLowerCase(),
      username: dto.username.trim(),
      fullName: dto.fullName.trim(),
      passwordHash,
      isActive: dto.isActive ?? true,
      branchId,
      roles,
    });
    const saved = await this.users.save(entity);
    return toUserResponse(saved);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponse> {
    const current = await this.loadById(id);

    if (dto.email && dto.email.toLowerCase() !== current.email.toLowerCase()) {
      await this.assertEmailAvailable(dto.email, id);
      current.email = dto.email.trim().toLowerCase();
    }
    if (dto.username && dto.username !== current.username) {
      await this.assertUsernameAvailable(dto.username, id);
      current.username = dto.username.trim();
    }
    if (dto.fullName) current.fullName = dto.fullName.trim();
    if (typeof dto.isActive === 'boolean') current.isActive = dto.isActive;
    if (dto.password) current.passwordHash = await this.hasher.hash(dto.password);
    if (dto.roleIds) current.roles = await this.loadRoles(dto.roleIds);

    // Sucursal: revalidar si cambió la sucursal o los roles (no-admin requiere sucursal).
    if (dto.branchId !== undefined) {
      current.branchId = await this.resolveBranchForRoles(dto.branchId ?? null, current.roles);
    } else if (dto.roleIds) {
      current.branchId = await this.resolveBranchForRoles(current.branchId, current.roles);
    }

    const saved = await this.users.save(current);
    return toUserResponse(saved);
  }

  async softDelete(id: string, actingUserId: string): Promise<void> {
    if (id === actingUserId) {
      throw new ConflictException('No puedes eliminar tu propio usuario');
    }
    const u = await this.loadById(id);
    await this.users.softRemove(u);
  }

  // --- helpers ---

  private async loadById(id: string): Promise<UserOrmEntity> {
    const u = await this.users
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.roles', 'r')
      .where('u.id = :id', { id })
      .andWhere('u.deletedAt IS NULL')
      .getOne();
    if (!u) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return u;
  }

  private async loadRoles(ids: string[]): Promise<RoleOrmEntity[]> {
    if (ids.length === 0) return [];
    const roles = await this.roles.find({
      where: { id: In(ids), deletedAt: IsNull() },
    });
    if (roles.length !== ids.length) {
      throw new NotFoundException('Uno o más roles no existen');
    }
    return roles;
  }

  private async assertEmailAvailable(email: string, excludeId?: string): Promise<void> {
    const qb = this.users
      .createQueryBuilder('u')
      .where('LOWER(u.email) = LOWER(:email)', { email })
      .andWhere('u.deletedAt IS NULL');
    if (excludeId) qb.andWhere('u.id <> :id', { id: excludeId });
    const exists = await qb.getOne();
    if (exists) throw new ConflictException(`Email "${email}" ya está en uso`);
  }

  private async assertUsernameAvailable(username: string, excludeId?: string): Promise<void> {
    const qb = this.users
      .createQueryBuilder('u')
      .where('u.username = :username', { username })
      .andWhere('u.deletedAt IS NULL');
    if (excludeId) qb.andWhere('u.id <> :id', { id: excludeId });
    const exists = await qb.getOne();
    if (exists) throw new ConflictException(`Username "${username}" ya está en uso`);
  }

  /**
   * Regla de sucursal: los usuarios sin rol ADMIN deben tener una sucursal
   * (es su sucursal HOME). ADMIN puede no tener (opera todas con el selector).
   * Valida que la sucursal exista y esté activa.
   */
  private async resolveBranchForRoles(
    branchId: string | null,
    roles: RoleOrmEntity[],
  ): Promise<string | null> {
    const isAdmin = roles.some((r) => r.code === 'ADMIN');
    if (!branchId) {
      if (!isAdmin) {
        throw new ConflictException(
          'Los usuarios sin rol ADMIN deben tener una sucursal asignada',
        );
      }
      return null;
    }
    if (!(await this.branches.isActiveBranch(branchId))) {
      throw new NotFoundException(`Sucursal ${branchId} no existe o está inactiva`);
    }
    return branchId;
  }
}
