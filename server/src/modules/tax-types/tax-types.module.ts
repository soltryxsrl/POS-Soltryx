import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaxTypesController } from './tax-types.controller';
import { TaxTypesService } from './tax-types.service';
import { TaxTypeOrmEntity } from './tax-type.orm-entity';

@Module({
  imports: [TypeOrmModule.forFeature([TaxTypeOrmEntity])],
  controllers: [TaxTypesController],
  providers: [TaxTypesService],
  exports: [TaxTypesService],
})
export class TaxTypesModule {}
