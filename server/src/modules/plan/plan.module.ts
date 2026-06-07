import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserOrmEntity } from '../auth/infrastructure/persistence/typeorm/user.orm-entity';
import { BranchOrmEntity } from '../branches/branch.orm-entity';
import { PlanLimitsOrmEntity } from './plan-limits.orm-entity';
import { PlanLimitsService } from './plan-limits.service';
import { PlanController } from './plan.controller';

/**
 * Plan/licencia del cliente: topes de usuarios y sucursales + enforcement.
 * Importa solo las ENTIDADES de users/branches (no sus módulos) para contar
 * el uso, así no hay dependencias circulares con UsersModule/BranchesModule.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([PlanLimitsOrmEntity, UserOrmEntity, BranchOrmEntity]),
  ],
  controllers: [PlanController],
  providers: [PlanLimitsService],
  exports: [PlanLimitsService],
})
export class PlanModule {}
