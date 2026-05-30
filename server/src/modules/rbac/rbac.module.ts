import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionOrmEntity } from '../auth/infrastructure/persistence/typeorm/permission.orm-entity';
import { RoleOrmEntity } from '../auth/infrastructure/persistence/typeorm/role.orm-entity';
import { UserOrmEntity } from '../auth/infrastructure/persistence/typeorm/user.orm-entity';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoleOrmEntity, PermissionOrmEntity, UserOrmEntity]),
  ],
  controllers: [RolesController, PermissionsController],
  providers: [RolesService, PermissionsService],
})
export class RbacModule {}
