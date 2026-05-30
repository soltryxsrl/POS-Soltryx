import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductOrmEntity } from '../products/product.orm-entity';
import { PromotionEvaluatorService } from './promotion-evaluator.service';
import { PromotionOrmEntity } from './promotion.orm-entity';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';

@Module({
  imports: [TypeOrmModule.forFeature([PromotionOrmEntity, ProductOrmEntity])],
  controllers: [PromotionsController],
  providers: [PromotionsService, PromotionEvaluatorService],
  exports: [PromotionEvaluatorService],
})
export class PromotionsModule {}
