import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule as BusinessConfigModule } from '../config/config.module';
import { ProductVariantOrmEntity } from '../products/product-variant.orm-entity';
import { ProductOrmEntity } from '../products/product.orm-entity';
import { AdjustStockUseCase } from './application/use-cases/adjust-stock.use-case';
import { GetStockHistoryUseCase } from './application/use-cases/get-stock-history.use-case';
import { RegisterStockMovementUseCase } from './application/use-cases/register-stock-movement.use-case';
import { PRODUCT_STOCK_PORT } from './domain/ports/product-stock.port';
import { STOCK_MOVEMENT_RECORDER } from './domain/ports/stock-movement-recorder.port';
import { STOCK_MOVEMENT_REPOSITORY } from './domain/ports/stock-movement.repository.port';
import { InventoryController } from './infrastructure/http/inventory.controller';
import { ProductStockAdapterTypeOrm } from './infrastructure/persistence/typeorm/product-stock.adapter.typeorm';
import { StockMovementOrmEntity } from './infrastructure/persistence/typeorm/stock-movement.orm-entity';
import { StockMovementRepositoryTypeOrm } from './infrastructure/persistence/typeorm/stock-movement.repository.typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StockMovementOrmEntity,
      ProductOrmEntity,
      ProductVariantOrmEntity,
    ]),
    BusinessConfigModule, // expone BusinessSettingsService (lectura de allowNegativeStock)
  ],
  controllers: [InventoryController],
  providers: [
    AdjustStockUseCase,
    GetStockHistoryUseCase,
    RegisterStockMovementUseCase,
    { provide: PRODUCT_STOCK_PORT, useClass: ProductStockAdapterTypeOrm },
    { provide: STOCK_MOVEMENT_REPOSITORY, useClass: StockMovementRepositoryTypeOrm },
    { provide: STOCK_MOVEMENT_RECORDER, useExisting: RegisterStockMovementUseCase },
  ],
  exports: [STOCK_MOVEMENT_RECORDER],
})
export class InventoryModule {}
