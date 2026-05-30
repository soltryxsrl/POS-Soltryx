import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CurrenciesController } from './currencies.controller';
import { CurrenciesService } from './currencies.service';
import { CurrencyOrmEntity } from './currency.orm-entity';
import { ExchangeRateOrmEntity } from './exchange-rate.orm-entity';

@Module({
  imports: [TypeOrmModule.forFeature([CurrencyOrmEntity, ExchangeRateOrmEntity])],
  controllers: [CurrenciesController],
  providers: [CurrenciesService],
  exports: [CurrenciesService],
})
export class CurrenciesModule {}
