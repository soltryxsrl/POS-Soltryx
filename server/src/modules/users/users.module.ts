import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { BranchesModule } from '../branches/branches.module';
import { PlanModule } from '../plan/plan.module';
import { RoleOrmEntity } from '../auth/infrastructure/persistence/typeorm/role.orm-entity';
import { UserOrmEntity } from '../auth/infrastructure/persistence/typeorm/user.orm-entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserOrmEntity, RoleOrmEntity]),
    AuthModule,
    BranchesModule,
    PlanModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
