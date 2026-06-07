import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { SUPERADMIN_PERMISSION_CODES } from '../auth/domain/permissions.catalog';
import { PermissionOrmEntity } from '../auth/infrastructure/persistence/typeorm/permission.orm-entity';
import { toPermissionResponse, type PermissionResponse } from './dto/permission.response';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(PermissionOrmEntity)
    private readonly repo: Repository<PermissionOrmEntity>,
  ) {}

  async list(): Promise<PermissionResponse[]> {
    // Oculta los permisos super-admin (plan.manage): no deben aparecer en el
    // selector de permisos de la UI de Roles del cliente.
    const rows = await this.repo.find({
      where: { code: Not(In([...SUPERADMIN_PERMISSION_CODES])) },
      order: { module: 'ASC', code: 'ASC' },
    });
    return rows.map(toPermissionResponse);
  }
}
