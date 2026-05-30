import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionOrmEntity } from '../auth/infrastructure/persistence/typeorm/permission.orm-entity';
import { toPermissionResponse, type PermissionResponse } from './dto/permission.response';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(PermissionOrmEntity)
    private readonly repo: Repository<PermissionOrmEntity>,
  ) {}

  async list(): Promise<PermissionResponse[]> {
    const rows = await this.repo.find({ order: { module: 'ASC', code: 'ASC' } });
    return rows.map(toPermissionResponse);
  }
}
