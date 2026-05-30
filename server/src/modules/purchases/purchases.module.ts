import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryModule } from '../inventory/inventory.module';
import { ProductOrmEntity } from '../products/product.orm-entity';
import { SupplierOrmEntity } from '../suppliers/supplier.orm-entity';
import { PurchaseOrderItemOrmEntity } from './purchase-order-item.orm-entity';
import { PurchaseOrderOrmEntity } from './purchase-order.orm-entity';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseOrderOrmEntity,
      PurchaseOrderItemOrmEntity,
      SupplierOrmEntity,
      ProductOrmEntity,
    ]),
    InventoryModule, // STOCK_MOVEMENT_RECORDER
  ],
  controllers: [PurchasesController],
  providers: [PurchasesService],
})
export class PurchasesModule {}
