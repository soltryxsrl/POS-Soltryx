import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchOrmEntity } from '../branches/branch.orm-entity';
import { BranchesModule } from '../branches/branches.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ProductOrmEntity } from '../products/product.orm-entity';
import { StockTransferItemOrmEntity } from './stock-transfer-item.orm-entity';
import { StockTransferOrmEntity } from './stock-transfer.orm-entity';
import { StockTransfersController } from './stock-transfers.controller';
import { StockTransfersService } from './stock-transfers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StockTransferOrmEntity,
      StockTransferItemOrmEntity,
      ProductOrmEntity,
      BranchOrmEntity,
    ]),
    InventoryModule,
    BranchesModule,
  ],
  controllers: [StockTransfersController],
  providers: [StockTransfersService],
})
export class StockTransfersModule {}
