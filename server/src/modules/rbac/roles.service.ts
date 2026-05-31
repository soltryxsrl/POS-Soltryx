import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { PermissionOrmEntity } from '../auth/infrastructure/persistence/typeorm/permission.orm-entity';
import { RoleOrmEntity } from '../auth/infrastructure/persistence/typeorm/role.orm-entity';
import { UserOrmEntity } from '../auth/infrastructure/persistence/typeorm/user.orm-entity';
import type { CreateRoleDto } from './dto/create-role.dto';
import { toRoleResponse, type RoleResponse } from './dto/role.response';
import type { UpdateRoleDto } from './dto/update-role.dto';

const SYSTEM_ROLE_CODES = new Set(['ADMIN']);

type Actor = { id: string; username?: string } | undefined;

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(RoleOrmEntity) private readonly roles: Repository<RoleOrmEntity>,
    @InjectRepository(PermissionOrmEntity)
    private readonly permissions: Repository<PermissionOrmEntity>,
    @InjectRepository(UserOrmEntity) private readonly users: Repository<UserOrmEntity>,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<RoleResponse[]> {
    const rows = await this.roles
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.permissions', 'p')
      .where('r.deletedAt IS NULL')
      .orderBy('r.code', 'ASC')
      .getMany();

    const counts = await this.userCountsByRole(rows.map((r) => r.id));
    return rows.map((r) => toRoleResponse(r, counts.get(r.id) ?? 0));
  }

  async findById(id: string): Promise<RoleResponse> {
    const r = await this.loadById(id);
    const counts = await this.userCountsByRole([r.id]);
    return toRoleResponse(r, counts.get(r.id) ?? 0);
  }

  async create(dto: CreateRoleDto, actor?: Actor): Promise<RoleResponse> {
    const code = dto.code.toUpperCase();
    const existing = await this.roles.findOne({ where: { code } });
    if (existing) throw new ConflictException(`Ya existe un rol con código "${code}"`);

    const permissions = await this.loadPermissions(dto.permissionIds ?? []);

    const entity = this.roles.create({
      code,
      name: dto.name.trim(),
      description: dto.description?.trim() ?? null,
      permissions,
    });
    const saved = await this.roles.save(entity);
    void this.audit.record({
      actorUserId: actor?.id ?? null,
      actorName: actor?.username ?? null,
      action: 'roles.created',
      entityType: 'role',
      entityId: saved.id,
      payload: { code: saved.code, name: saved.name, permissionIds: dto.permissionIds ?? [] },
    });
    return toRoleResponse(saved, 0);
  }

  async update(id: string, dto: UpdateRoleDto, actor?: Actor): Promise<RoleResponse> {
    const current = await this.loadById(id);
    const prevPerms = current.permissions.map((p) => p.id).sort();

    if (dto.name) current.name = dto.name.trim();
    if (dto.description !== undefined) {
      current.description = dto.description?.trim() ?? null;
    }
    if (dto.permissionIds) {
      current.permissions = await this.loadPermissions(dto.permissionIds);
    }

    const saved = await this.roles.save(current);
    const permsChanged =
      !!dto.permissionIds &&
      JSON.stringify(prevPerms) !== JSON.stringify(saved.permissions.map((p) => p.id).sort());
    void this.audit.record({
      actorUserId: actor?.id ?? null,
      actorName: actor?.username ?? null,
      action: 'roles.updated',
      entityType: 'role',
      entityId: saved.id,
      payload: { code: saved.code, permissionsChanged: permsChanged },
    });
    const counts = await this.userCountsByRole([saved.id]);
    return toRoleResponse(saved, counts.get(saved.id) ?? 0);
  }

  async softDelete(id: string, actor?: Actor): Promise<void> {
    const current = await this.loadById(id);
    if (SYSTEM_ROLE_CODES.has(current.code)) {
      throw new ForbiddenException(`El rol "${current.code}" no puede eliminarse`);
    }
    const count = (await this.userCountsByRole([current.id])).get(current.id) ?? 0;
    if (count > 0) {
      throw new ConflictException(
        `No se puede eliminar: ${count} usuario(s) tienen este rol asignado`,
      );
    }
    await this.roles.softRemove(current);
    void this.audit.record({
      actorUserId: actor?.id ?? null,
      actorName: actor?.username ?? null,
      action: 'roles.deleted',
      entityType: 'role',
      entityId: id,
      payload: { code: current.code },
    });
  }

  // --- helpers ---

  private async loadById(id: string): Promise<RoleOrmEntity> {
    const r = await this.roles
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.permissions', 'p')
      .where('r.id = :id', { id })
      .andWhere('r.deletedAt IS NULL')
      .getOne();
    if (!r) throw new NotFoundException(`Rol ${id} no encontrado`);
    return r;
  }

  private async loadPermissions(ids: string[]): Promise<PermissionOrmEntity[]> {
    if (ids.length === 0) return [];
    const found = await this.permissions.find({ where: { id: In(ids) } });
    if (found.length !== ids.length) {
      throw new NotFoundException('Uno o más permisos no existen');
    }
    return found;
  }

  private async userCountsByRole(roleIds: string[]): Promise<Map<string, number>> {
    if (roleIds.length === 0) return new Map();
    const rows = await this.users
      .createQueryBuilder('u')
      .leftJoin('u.roles', 'r')
      .where('r.id IN (:...ids)', { ids: roleIds })
      .andWhere('u.deletedAt IS NULL')
      .select('r.id', 'roleId')
      .addSelect('COUNT(DISTINCT u.id)', 'count')
      .groupBy('r.id')
      .getRawMany<{ roleId: string; count: string }>();
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.roleId, Number(r.count));
    return m;
  }
}

