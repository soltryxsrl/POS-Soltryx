import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThanOrEqual, MoreThanOrEqual, Or, Repository } from 'typeorm';
import { fromCents, toCents } from '../../common/money';
import { ProductOrmEntity } from '../products/product.orm-entity';
import {
  PromotionOrmEntity,
  PromotionType,
} from './promotion.orm-entity';

/**
 * Input que recibe el evaluator: una representación neutra del carrito al
 * momento de cerrar la venta. No depende del módulo Sales para evitar ciclos.
 */
export interface EvaluatorCartLine {
  productId: string;
  /** Si la línea fue de una variante, su id. */
  variantId?: string | null;
  quantity: string;
  /** Precio unitario (snapshot). */
  unitPrice: string;
  /** Descuento manual ya ingresado por el cajero, si lo hay. */
  manualDiscount: string;
}

export interface EvaluatorCart {
  lines: EvaluatorCartLine[];
  /** Sucursal de la venta: solo se evalúan promociones de esa sucursal. */
  branchId: string | null;
}

/**
 * Resultado: ajustes a aplicar.
 *   - lineDiscounts: agregar al `discount` de la línea correspondiente
 *     (sumado al manual). Calculados sobre `gross = unitPrice * quantity`.
 *     Clave: `productId` o `productId:variantId` si la línea es variante.
 *   - orderDiscount: descuento adicional sobre la orden (post-tax).
 *   - applied: lista de promos aplicadas con su impacto (para audit + receipt).
 */
export interface EvaluatorResult {
  /** Map lineKey → descuento adicional en RD$ a sumar al discount de línea. */
  lineDiscounts: Map<string, string>;
  /** RD$ adicionales a sumar al `orderDiscount` de la venta. */
  orderDiscount: string;
  applied: Array<{
    promotionId: string;
    promotionName: string;
    type: PromotionType;
    /** Descuento total que aporta esta promoción (suma de líneas u orden). */
    discountAmount: string;
    /** Si aplicó a una línea específica, el productId. */
    productId?: string;
    /** Si aplicó a una variante específica. */
    variantId?: string;
  }>;
}

/** Clave canónica de una línea del carrito (única por producto+variante). */
export function evaluatorLineKey(
  productId: string,
  variantId?: string | null,
): string {
  return variantId ? `${productId}:${variantId}` : productId;
}

@Injectable()
export class PromotionEvaluatorService {
  constructor(
    @InjectRepository(PromotionOrmEntity)
    private readonly promotions: Repository<PromotionOrmEntity>,
    @InjectRepository(ProductOrmEntity)
    private readonly products: Repository<ProductOrmEntity>,
  ) {}

  /**
   * Calcula y devuelve los descuentos de promociones a aplicar SOBRE la
   * versión actual del carrito. No modifica DB ni input — el caller decide
   * si los aplica.
   *
   * Reglas:
   *  - Solo promos `is_active=true`, no eliminadas, dentro de ventana fechas.
   *  - Order priority DESC: las de mayor prioridad evalúan primero (cuando
   *    queda margen). Empate → por createdAt DESC.
   *  - Sin acumular: una línea puede recibir UN solo line-discount adicional
   *    de promoción. Si dos promos califican para el mismo producto, gana la
   *    de mayor prioridad.
   *  - Order discounts se suman (puede haber varios % o monto).
   */
  async evaluate(cart: EvaluatorCart): Promise<EvaluatorResult> {
    const empty: EvaluatorResult = {
      lineDiscounts: new Map(),
      orderDiscount: '0.00',
      applied: [],
    };
    if (cart.lines.length === 0) return empty;

    const now = new Date();
    const activePromos = await this.promotions
      .createQueryBuilder('p')
      .where('p.deletedAt IS NULL')
      .andWhere('p.isActive = true')
      .andWhere('p.branchId = :branchId', { branchId: cart.branchId })
      .andWhere('(p.validFrom IS NULL OR p.validFrom <= :now)', { now })
      .andWhere('(p.validUntil IS NULL OR p.validUntil >= :now)', { now })
      .orderBy('p.priority', 'DESC')
      .addOrderBy('p.createdAt', 'DESC')
      .getMany();
    if (activePromos.length === 0) return empty;

    // Cargar categorías de los productos del carrito para evaluar scopes por categoría
    const productIds = [...new Set(cart.lines.map((l) => l.productId))];
    const productRows = await this.products.find({
      where: { id: In(productIds) },
      select: ['id', 'categoryId'],
    });
    const catByProduct = new Map(productRows.map((p) => [p.id, p.categoryId ?? null]));

    const result: EvaluatorResult = {
      lineDiscounts: new Map(),
      orderDiscount: '0.00',
      applied: [],
    };

    // Subtotal del carrito (gross − manual discounts) — usado por ORDER_* y BxGy
    const subtotalCents = cart.lines.reduce((acc, l) => {
      const qty = parseFloat(l.quantity);
      const grossC = Math.round(toCents(l.unitPrice) * qty);
      return acc + Math.max(0, grossC - toCents(l.manualDiscount));
    }, 0);

    // Track qué líneas ya fueron tocadas por una promo (para no acumular)
    const lineTaken = new Set<string>();

    for (const promo of activePromos) {
      switch (promo.type as PromotionType) {
        case PromotionType.PRODUCT_PERCENT_OFF:
        case PromotionType.PRODUCT_AMOUNT_OFF: {
          const eligibleLines = cart.lines.filter(
            (l) =>
              !lineTaken.has(evaluatorLineKey(l.productId, l.variantId)) &&
              this.lineMatchesScope(promo, l, catByProduct),
          );
          for (const line of eligibleLines) {
            const key = evaluatorLineKey(line.productId, line.variantId);
            const gross = Math.round(toCents(line.unitPrice) * parseFloat(line.quantity));
            const taxableC = Math.max(0, gross - toCents(line.manualDiscount));
            if (taxableC <= 0) continue;
            let discC = 0;
            if (promo.type === PromotionType.PRODUCT_PERCENT_OFF && promo.percentOff) {
              const pctBp = Math.round(parseFloat(promo.percentOff) * 100);
              discC = Math.round((taxableC * pctBp) / (100 * 100));
            } else if (promo.type === PromotionType.PRODUCT_AMOUNT_OFF && promo.amountOff) {
              // amount_off es por UNIDAD del producto
              discC = Math.min(
                Math.round(toCents(promo.amountOff) * parseFloat(line.quantity)),
                taxableC,
              );
            }
            if (discC > 0) {
              addToMap(result.lineDiscounts, key, discC);
              lineTaken.add(key);
              result.applied.push({
                promotionId: promo.id,
                promotionName: promo.name,
                type: promo.type as PromotionType,
                discountAmount: fromCents(discC),
                productId: line.productId,
                variantId: line.variantId ?? undefined,
              });
            }
          }
          break;
        }

        case PromotionType.PRODUCT_BUY_X_GET_Y: {
          const minQ = promo.minQuantity ?? 0;
          const freeQ = promo.freeQuantity ?? 0;
          if (minQ <= freeQ || freeQ <= 0) break;
          // Calcula sobre cada línea elegible separadamente
          const eligibleLines = cart.lines.filter(
            (l) =>
              !lineTaken.has(evaluatorLineKey(l.productId, l.variantId)) &&
              this.lineMatchesScope(promo, l, catByProduct),
          );
          for (const line of eligibleLines) {
            const key = evaluatorLineKey(line.productId, line.variantId);
            const qty = parseInt(line.quantity, 10);
            if (qty < minQ) continue;
            const groups = Math.floor(qty / minQ);
            const freeUnits = groups * freeQ;
            const unitC = toCents(line.unitPrice);
            const discC = freeUnits * unitC;
            if (discC > 0) {
              addToMap(result.lineDiscounts, key, discC);
              lineTaken.add(key);
              result.applied.push({
                promotionId: promo.id,
                promotionName: promo.name,
                type: promo.type as PromotionType,
                discountAmount: fromCents(discC),
                productId: line.productId,
                variantId: line.variantId ?? undefined,
              });
            }
          }
          break;
        }

        case PromotionType.ORDER_PERCENT_OFF:
        case PromotionType.ORDER_AMOUNT_OFF: {
          const minOrder = promo.minOrderTotal
            ? toCents(promo.minOrderTotal)
            : 0;
          if (subtotalCents < minOrder) break;
          let discC = 0;
          if (promo.type === PromotionType.ORDER_PERCENT_OFF && promo.percentOff) {
            const pctBp = Math.round(parseFloat(promo.percentOff) * 100);
            discC = Math.round((subtotalCents * pctBp) / (100 * 100));
          } else if (promo.type === PromotionType.ORDER_AMOUNT_OFF && promo.amountOff) {
            discC = Math.min(toCents(promo.amountOff), subtotalCents);
          }
          if (discC > 0) {
            const currC = toCents(result.orderDiscount);
            result.orderDiscount = fromCents(currC + discC);
            result.applied.push({
              promotionId: promo.id,
              promotionName: promo.name,
              type: promo.type as PromotionType,
              discountAmount: fromCents(discC),
            });
          }
          break;
        }
      }
    }

    return result;
  }

  private lineMatchesScope(
    promo: PromotionOrmEntity,
    line: EvaluatorCartLine,
    catByProduct: Map<string, string | null>,
  ): boolean {
    // Si la promo target a una variante específica, debe ser exactamente esa variante.
    if (promo.variantId) return promo.variantId === (line.variantId ?? null);
    // Promo a productId aplica a TODAS las variantes de ese producto.
    if (promo.productId) return promo.productId === line.productId;
    if (promo.categoryId) {
      return catByProduct.get(line.productId) === promo.categoryId;
    }
    // sin scope ⇒ aplica a cualquier producto
    return true;
  }
}


function addToMap(m: Map<string, string>, key: string, addC: number) {
  const cur = m.get(key) ?? '0.00';
  m.set(key, fromCents(toCents(cur) + addC));
}
