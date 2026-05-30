import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerOrmEntity } from '../customers/customer.orm-entity';
import { CustomerAccountController } from './customer-account.controller';
import { CustomerAccountEntryOrmEntity } from './customer-account-entry.orm-entity';
import { CustomerAccountService } from './customer-account.service';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerAccountEntryOrmEntity, CustomerOrmEntity])],
  controllers: [CustomerAccountController],
  providers: [CustomerAccountService],
  exports: [CustomerAccountService],
})
export class CustomerAccountModule {}
