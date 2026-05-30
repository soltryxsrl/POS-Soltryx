import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashSessionOrmEntity } from '../cash-sessions/infrastructure/persistence/typeorm/cash-session.orm-entity';
import { ParkedCartOrmEntity } from './parked-cart.orm-entity';
import { ParkedCartsController } from './parked-carts.controller';
import { ParkedCartsService } from './parked-carts.service';

@Module({
  imports: [TypeOrmModule.forFeature([ParkedCartOrmEntity, CashSessionOrmEntity])],
  controllers: [ParkedCartsController],
  providers: [ParkedCartsService],
})
export class ParkedCartsModule {}
