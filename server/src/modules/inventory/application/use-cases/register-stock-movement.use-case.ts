import { Inject, Injectable } from '@nestjs/common';
import type { TransactionContext } from '../../../../common/persistence/unit-of-work.port';
import { BusinessSettingsService } from '../../../config/business-settings.service';
import {
  InsufficientStockError,
  InvalidStockQuantityError,
  ProductNotFoundForStockError,
} from '../../domain/errors/inventory.errors';
import { StockMovementType } from '../../domain/entities/stock-movement-type';
import type { StockMovement } from '../../domain/entities/stock-movement.entity';
import {
  PRODUCT_STOCK_PORT,
  type ProductStockPort,
} from '../../domain/ports/product-stock.port';
import {
  STOCK_MOVEMENT_REPOSITORY,
  type StockMovementRepository,
} from '../../domain/ports/stock-movement.repository.port';
import type {
  RecordStockMovementInput,
  StockMovementRecorder,
} from '../../domain/ports/stock-movement-recorder.port';
import { addDecimal } from '../math/decimal';

@Injectable()
export class RegisterStockMovementUseCase implements StockMovementRecorder {
  constructor(
    @Inject(PRODUCT_STOCK_PORT) private readonly productStock: ProductStockPort,
    @Inject(STOCK_MOVEMENT_REPOSITORY)
    private readonly movementRepo: StockMovementRepository,
    private readonly settings: BusinessSettingsService,
  ) {}

  async record(ctx: TransactionContext, input: RecordStockMovementInput): Promise<StockMovement> {
    // Validar y calcular delta antes de bloquear (fail-fast en input inválido).
    const delta = this.computeDelta(input.type, input.quantity);

    if (input.variantId) {
      // El movimiento es sobre una variante: bloqueamos la variante y validamos
      // que pertenezca al productId pasado. El stock del producto padre NO se
      // toca; la variante mantiene su stock propio.
      const variantSnap = await this.productStock.lockVariantForUpdate(
        ctx,
        input.variantId,
      );
      if (!variantSnap) {
        throw new ProductNotFoundForStockError(input.variantId);
      }
      if (variantSnap.productId !== input.productId) {
        throw new ProductNotFoundForStockError(
          `Variante ${input.variantId} no pertenece a producto ${input.productId}`,
        );
      }
      const newStock = addDecimal(variantSnap.stock, delta, 3);
      if (Number(newStock) < 0) {
        const { allowNegativeStock } = await this.settings.get();
        if (!allowNegativeStock) {
          throw new InsufficientStockError(
            `${input.productId}/${input.variantId}`,
            variantSnap.stock,
            input.quantity,
          );
        }
      }
      const saved = await this.movementRepo.save(ctx, {
        // La variante hereda la sucursal del padre (denormalizada). Caer a null
        // viola el NOT NULL de stock_movements.branch_id (regresión multi-sucursal).
        branchId: input.branchId ?? variantSnap.branchId,
        productId: input.productId,
        variantId: input.variantId,
        type: input.type,
        quantity: input.quantity,
        previousStock: variantSnap.stock,
        newStock,
        // Costo del movimiento: el provisto (compra) o la base de costo vigente.
        unitCost: input.unitCost ?? variantSnap.costPrice,
        reason: input.reason ?? null,
        saleId: input.saleId ?? null,
        userId: input.userId,
      });
      await this.productStock.updateVariantStock(ctx, input.variantId, newStock);
      return saved;
    }

    const snapshot = await this.productStock.lockForUpdate(ctx, input.productId);
    if (!snapshot) throw new ProductNotFoundForStockError(input.productId);

    const newStock = addDecimal(snapshot.stock, delta, 3);

    // Política configurable: por defecto bloquea stock negativo.
    // Cuando allowNegativeStock=true, el cajero puede vender aunque el stock
    // calculado sea impreciso (colmados que "venden y cuentan después").
    if (Number(newStock) < 0) {
      const { allowNegativeStock } = await this.settings.get();
      if (!allowNegativeStock) {
        throw new InsufficientStockError(input.productId, snapshot.stock, input.quantity);
      }
    }

    const saved = await this.movementRepo.save(ctx, {
      branchId: input.branchId ?? snapshot.branchId,
      productId: input.productId,
      type: input.type,
      quantity: input.quantity,
      previousStock: snapshot.stock,
      newStock,
      // Costo del movimiento: el provisto (compra) o la base de costo vigente.
      unitCost: input.unitCost ?? snapshot.costPrice,
      reason: input.reason ?? null,
      saleId: input.saleId ?? null,
      userId: input.userId,
    });

    await this.productStock.updateStock(ctx, input.productId, newStock);

    return saved;
  }

  /**
   * Convierte la cantidad de la entrada en delta SIGNADO sobre el stock actual.
   */
  private computeDelta(type: StockMovementType, quantity: string): string {
    if (!/^-?\d+(\.\d+)?$/.test(quantity)) {
      throw new InvalidStockQuantityError(`Cantidad inválida: ${quantity}`);
    }
    const isNegative = quantity.startsWith('-');
    const absQty = isNegative ? quantity.slice(1) : quantity;

    if (type === StockMovementType.ADJUSTMENT) {
      // El signo viene dado por el usuario
      return quantity;
    }
    // Para los demás tipos la cantidad debe ser positiva
    if (isNegative || Number(absQty) <= 0) {
      throw new InvalidStockQuantityError(
        `Cantidad debe ser > 0 para ${type} (recibido: ${quantity})`,
      );
    }
    switch (type) {
      case StockMovementType.PURCHASE:
      case StockMovementType.RETURN:
      case StockMovementType.CANCELLED_SALE:
      case StockMovementType.TRANSFER_IN:
        return absQty; // entra stock (+)
      case StockMovementType.SALE:
      case StockMovementType.TRANSFER_OUT:
        return `-${absQty}`; // sale stock (-)
      default: {
        const _exhaustive: never = type;
        throw new InvalidStockQuantityError(`Tipo inválido: ${_exhaustive}`);
      }
    }
  }
}
