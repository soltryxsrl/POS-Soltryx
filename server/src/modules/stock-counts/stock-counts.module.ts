import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryModule } from '../inventory/inventory.module';
import { ProductOrmEntity } from '../products/product.orm-entity';
import { StockCountItemOrmEntity } from './stock-count-item.orm-entity';
import { StockCountOrmEntity } from './stock-count.orm-entity';
import { StockCountsController } from './stock-counts.controller';
import { StockCountsService } from './stock-counts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StockCountOrmEntity,
      StockCountItemOrmEntity,
      ProductOrmEntity,
    ]),
    InventoryModule,
  ],
  controllers: [StockCountsController],
  providers: [StockCountsService],
})
export class StockCountsModule {}
