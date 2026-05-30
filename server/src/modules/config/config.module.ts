import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessSettingsOrmEntity } from './business-settings.orm-entity';
import { BusinessSettingsService } from './business-settings.service';
import { ConfigController } from './config.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BusinessSettingsOrmEntity])],
  controllers: [ConfigController],
  providers: [BusinessSettingsService],
  exports: [BusinessSettingsService],
})
export class ConfigModule {}
