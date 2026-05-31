import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchOrmEntity } from '../branches/branch.orm-entity';
import { BusinessSettingsOrmEntity } from './business-settings.orm-entity';
import { BusinessSettingsService } from './business-settings.service';
import { ConfigController } from './config.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BusinessSettingsOrmEntity, BranchOrmEntity])],
  controllers: [ConfigController],
  providers: [BusinessSettingsService],
  exports: [BusinessSettingsService],
})
export class ConfigModule {}
