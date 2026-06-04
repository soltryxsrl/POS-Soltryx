import { Inject, Injectable } from '@nestjs/common';
import type { StockMovementType } from '../../domain/entities/stock-movement-type';
import {
  STOCK_MOVEMENT_REPOSITORY,
  type StockMovementRepository,
} from '../../domain/ports/stock-movement.repository.port';
import type { StockMovement } from '../../domain/entities/stock-movement.entity';

export interface GetStockHistoryInput {
  productId?: string;
  type?: StockMovementType;
  branchId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
  sort?: string;
  sortDir?: 'asc' | 'desc';
}

/** Movimiento + valuación por promedio móvil (sólo en consulta por producto). */
export interface StockMovementValued extends StockMovement {
  /** Costo promedio móvil vigente tras el movimiento. null = no calculable. */
  avgCost: string | null;
  /** Valor del inventario tras el movimiento (newStock × avgCost). null = no calculable. */
  balanceValue: string | null;
}

export interface GetStockHistoryOutput {
  items: StockMovementValued[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable()
export class GetStockHistoryUseCase {
  constructor(
    @Inject(STOCK_MOVEMENT_REPOSITORY)
    private readonly repo: StockMovementRepository,
  ) {}

  async execute(input: GetStockHistoryInput): Promise<GetStockHistoryOutput> {
    const limit = input.limit ?? 50;
    const offset = input.offset ?? 0;
    const { items, total } = await this.repo.list({
      productId: input.productId,
      type: input.type,
      branchId: input.branchId,
      from: input.from,
      to: input.to,
      limit,
      offset,
      sort: input.sort,
      sortDir: input.sortDir,
    });

    // El saldo valorado por promedio móvil sólo tiene sentido en el kardex de UN
    // producto (acotado a su sucursal). En la vista global (sin producto) no se
    // calcula: mezclar productos haría un saldo sin significado.
    let valuation: Map<string, { avgCost: string; balanceValue: string }> | null = null;
    if (input.productId && input.branchId) {
      const all = await this.repo.listChronological(input.productId, input.branchId);
      valuation = computeMovingAverage(all);
    }

    return {
      items: items.map((m) => {
        const v = valuation?.get(m.id);
        return {
          ...m,
          avgCost: v?.avgCost ?? null,
          balanceValue: v?.balanceValue ?? null,
        };
      }),
      total,
      limit,
      offset,
    };
  }
}

/**
 * Reconstruye el saldo valorado por PROMEDIO MÓVIL recorriendo los movimientos
 * en orden cronológico. Se procesa un stream independiente por variante
 * (variantId null = el producto padre), porque cada uno tiene su propio stock y
 * costo. Entrada: mezcla al promedio (value += cant×costo). Salida: descarga al
 * promedio vigente (no lo altera). El costo del movimiento cae a `unitCost`; si
 * falta (histórico previo a la columna) se usa el promedio vigente.
 *
 * Nota: es una reconstrucción del kardex; el COGS del sistema sigue usando
 * `products.cost_price`. Ambos coinciden cuando el costo sólo cambia por compras.
 */
function computeMovingAverage(
  all: StockMovement[],
): Map<string, { avgCost: string; balanceValue: string }> {
  const result = new Map<string, { avgCost: string; balanceValue: string }>();

  // Agrupar por stream (variante o producto padre), preservando el orden ASC.
  const byStream = new Map<string, StockMovement[]>();
  for (const m of all) {
    const key = m.variantId ?? '__product__';
    const arr = byStream.get(key);
    if (arr) arr.push(m);
    else byStream.set(key, [m]);
  }

  for (const stream of byStream.values()) {
    let qty = 0;
    let avg = 0; // promedio móvil vigente
    for (const m of stream) {
      const prev = Number(m.previousStock);
      const next = Number(m.newStock);
      const delta = next - prev;
      const unitCost = m.unitCost != null ? Number(m.unitCost) : avg;
      if (delta > 0) {
        // Entrada: mezcla al promedio.
        const newQty = qty + delta;
        avg = newQty > 0 ? (qty * avg + delta * unitCost) / newQty : unitCost;
        qty = newQty;
      } else if (delta < 0) {
        // Salida: descarga al promedio vigente (avg no cambia; queda como
        // referencia del último costo aunque el stock llegue a 0).
        qty = Math.max(0, qty + delta);
      }
      // Saldo valorado = stock resultante × promedio (consistente con lo mostrado).
      const balanceValue = Math.max(0, next * avg);
      result.set(m.id, {
        avgCost: avg.toFixed(4),
        balanceValue: balanceValue.toFixed(2),
      });
    }
  }

  return result;
}
