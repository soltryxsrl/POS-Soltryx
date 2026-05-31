import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmAsyncConfig } from './config/typeorm.config';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './modules/health/health.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { BranchesModule } from './modules/branches/branches.module';
import { BranchContextModule } from './common/branch/branch-context.module';
import { CashSessionsModule } from './modules/cash-sessions/cash-sessions.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ConfigModule as BusinessConfigModule } from './modules/config/config.module';
import { CurrenciesModule } from './modules/currencies/currencies.module';
import { CustomerAccountModule } from './modules/customer-account/customer-account.module';
import { CustomersModule } from './modules/customers/customers.module';
import { FiscalModule } from './modules/fiscal/fiscal.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ParkedCartsModule } from './modules/parked-carts/parked-carts.module';
import { PaymentMethodsModule } from './modules/payment-methods/payment-methods.module';
import { ProductsModule } from './modules/products/products.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { ReturnsModule } from './modules/returns/returns.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { TaxTypesModule } from './modules/tax-types/tax-types.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SalesModule } from './modules/sales/sales.module';
import { UsersModule } from './modules/users/users.module';
import { PersistenceModule } from './common/persistence/persistence.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync(typeOrmAsyncConfig),
    PersistenceModule,
    AuditModule, // @Global — exporta AuditService a todos los demás módulos
    BranchContextModule, // @Global — resuelve la sucursal activa por request
    HealthModule,
    AuthModule,
    BranchesModule,
    UsersModule,
    RbacModule,
    CategoriesModule,
    InventoryModule,
    ProductsModule,
    CashSessionsModule,
    SalesModule,
    ReportsModule,
    BusinessConfigModule,
    ParkedCartsModule,
    CustomersModule,
    CustomerAccountModule,
    SuppliersModule,
    PurchasesModule,
    ReturnsModule,
    FiscalModule,
    PromotionsModule,
    CurrenciesModule,
    TaxTypesModule,
    PaymentMethodsModule,
  ],
})
export class AppModule {}
