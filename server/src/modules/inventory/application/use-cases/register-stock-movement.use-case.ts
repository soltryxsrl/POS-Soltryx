import { Inject, Injectable } from '@nestjs/common';
import type { TransactionContext } from '../../../../common/persistence/unit-of-work.port';
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
  ) {}

  async record(ctx: TransactionContext, input: RecordStockMovementInput): Promise<StockMovement> {
    const snapshot = await this.productStock.lockForUpdate(ctx, input.productId);
    if (!snapshot) throw new ProductNotFoundForStockError(input.productId);

    const delta = this.computeDelta(input.type, input.quantity);
    const newStock = addDecimal(snapshot.stock, delta, 3);

    // No permitir stock negativo, salvo que el usuario haya pedido eso
    // explícitamente con ADJUSTMENT — pero validamos al menos que no quede < 0
    // en SALE (que es el caso peligroso de race condition).
    if (Number(newStock) < 0) {
      throw new InsufficientStockError(input.productId, snapshot.stock, input.quantity);
    }

    const saved = await this.movementRepo.save(ctx, {
      branchId: input.branchId ?? snapshot.branchId,
      productId: input.productId,
      type: input.type,
      quantity: input.quantity,
      previousStock: snapshot.stock,
      newStock,
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
        return absQty; // entra stock (+)
      case StockMovementType.SALE:
        return `-${absQty}`; // sale stock (-)
      default: {
        const _exhaustive: never = type;
        throw new InvalidStockQuantityError(`Tipo inválido: ${_exhaustive}`);
      }
    }
  }
}
