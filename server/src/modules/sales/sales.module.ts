import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CashSessionOrmEntity } from '../cash-sessions/infrastructure/persistence/typeorm/cash-session.orm-entity';
import { ConfigModule as BusinessConfigModule } from '../config/config.module';
import { CurrenciesModule } from '../currencies/currencies.module';
import { CustomerAccountModule } from '../customer-account/customer-account.module';
import { CustomerOrmEntity } from '../customers/customer.orm-entity';
import { FiscalDocumentOrmEntity } from '../fiscal/documents/fiscal-document.orm-entity';
import { FiscalModule } from '../fiscal/fiscal.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ProductOrmEntity } from '../products/product.orm-entity';
import { PromotionsModule } from '../promotions/promotions.module';
import { CancelSaleUseCase } from './application/use-cases/cancel-sale.use-case';
import { CreateSaleUseCase } from './application/use-cases/create-sale.use-case';
import { GetSaleUseCase } from './application/use-cases/get-sale.use-case';
import { ListSalesUseCase } from './application/use-cases/list-sales.use-case';
import { PreviewSaleTotalsUseCase } from './application/use-cases/preview-sale-totals.use-case';
import { CASH_SESSION_VALIDATOR_PORT } from './domain/ports/cash-session-validator.port';
import { PRODUCT_PRICING_PORT } from './domain/ports/product-pricing.port';
import { SALE_NUMBER_GENERATOR } from './domain/ports/sale-number-generator.port';
import { SALE_REPOSITORY } from './domain/ports/sale.repository.port';
import { SaleTotalsCalculator } from './domain/services/sale-totals-calculator';
import { PublicSalesController } from './infrastructure/http/public-sales.controller';
import { SalesController } from './infrastructure/http/sales.controller';
import { CashSessionValidatorTypeOrm } from './infrastructure/persistence/typeorm/cash-session-validator.adapter.typeorm';
import { PaymentOrmEntity } from './infrastructure/persistence/typeorm/payment.orm-entity';
import { ProductPricingAdapterTypeOrm } from './infrastructure/persistence/typeorm/product-pricing.adapter.typeorm';
import { SaleItemOrmEntity } from './infrastructure/persistence/typeorm/sale-item.orm-entity';
import { SaleNumberGeneratorTypeOrm } from './infrastructure/persistence/typeorm/sale-number-generator.adapter.typeorm';
import { SaleOrmEntity } from './infrastructure/persistence/typeorm/sale.orm-entity';
import { SaleRepositoryTypeOrm } from './infrastructure/persistence/typeorm/sale.repository.typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SaleOrmEntity,
      SaleItemOrmEntity,
      PaymentOrmEntity,
      ProductOrmEntity,
      CashSessionOrmEntity,
      CustomerOrmEntity,
      FiscalDocumentOrmEntity,
    ]),
    InventoryModule, // expone STOCK_MOVEMENT_RECORDER
    CustomerAccountModule, // expone CustomerAccountService (CHARGE/REVERSAL)
    BusinessConfigModule, // expone BusinessSettingsService (recibo público necesita branding)
    PromotionsModule, // expone PromotionEvaluatorService (auto-apply promos en venta)
    CurrenciesModule, // expone CurrenciesService (multi-currency conversion)
    AuthModule, // expone USER_READER + PASSWORD_HASHER (manager override de descuentos)
    FiscalModule, // expone FiscalDocumentsService + FiscalSequencesService (emisión NCF)
  ],
  controllers: [SalesController, PublicSalesController],
  providers: [
    CreateSaleUseCase,
    CancelSaleUseCase,
    GetSaleUseCase,
    ListSalesUseCase,
    PreviewSaleTotalsUseCase,
    SaleTotalsCalculator,
    { provide: SALE_REPOSITORY, useClass: SaleRepositoryTypeOrm },
    { provide: PRODUCT_PRICING_PORT, useClass: ProductPricingAdapterTypeOrm },
    { provide: CASH_SESSION_VALIDATOR_PORT, useClass: CashSessionValidatorTypeOrm },
    { provide: SALE_NUMBER_GENERATOR, useClass: SaleNumberGeneratorTypeOrm },
  ],
  exports: [SALE_REPOSITORY],
})
export class SalesModule {}
