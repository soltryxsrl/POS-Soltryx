import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashSessionOrmEntity } from '../cash-sessions/infrastructure/persistence/typeorm/cash-session.orm-entity';
import { CustomerAccountModule } from '../customer-account/customer-account.module';
import { FiscalModule } from '../fiscal/fiscal.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ProductKitComponentOrmEntity } from '../products/product-kit-component.orm-entity';
import { ProductVariantOrmEntity } from '../products/product-variant.orm-entity';
import { ProductOrmEntity } from '../products/product.orm-entity';
import { PRODUCT_PRICING_PORT } from '../sales/domain/ports/product-pricing.port';
import { PaymentOrmEntity } from '../sales/infrastructure/persistence/typeorm/payment.orm-entity';
import { ProductPricingAdapterTypeOrm } from '../sales/infrastructure/persistence/typeorm/product-pricing.adapter.typeorm';
import { SaleItemOrmEntity } from '../sales/infrastructure/persistence/typeorm/sale-item.orm-entity';
import { SaleOrmEntity } from '../sales/infrastructure/persistence/typeorm/sale.orm-entity';
import { ReturnsController } from './returns.controller';
import { ReturnsService } from './returns.service';
import { SaleReturnItemOrmEntity } from './sale-return-item.orm-entity';
import { SaleReturnOrmEntity } from './sale-return.orm-entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SaleReturnOrmEntity,
      SaleReturnItemOrmEntity,
      SaleOrmEntity,
      SaleItemOrmEntity,
      PaymentOrmEntity,
      CashSessionOrmEntity,
      ProductOrmEntity,
      ProductKitComponentOrmEntity,
      ProductVariantOrmEntity,
    ]),
    InventoryModule,
    CustomerAccountModule,
    FiscalModule,
  ],
  controllers: [ReturnsController],
  providers: [
    ReturnsService,
    { provide: PRODUCT_PRICING_PORT, useClass: ProductPricingAdapterTypeOrm },
  ],
})
export class ReturnsModule {}
