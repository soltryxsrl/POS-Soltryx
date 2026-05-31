import { Inject, Injectable } from '@nestjs/common';
import {
  PRODUCT_PRICING_PORT,
  type ProductPricingPort,
} from '../../domain/ports/product-pricing.port';
import {
  OpenItemInvalidError,
  ProductNotForSaleError,
} from '../../domain/errors/sale.errors';
import { SaleTotalsCalculator } from '../../domain/services/sale-totals-calculator';
import { BusinessSettingsService } from '../../../config/business-settings.service';
import { fromCents, toCents } from '../../domain/services/money';
import {
  evaluatorLineKey,
  PromotionEvaluatorService,
} from '../../../promotions/promotion-evaluator.service';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../../common/persistence/unit-of-work.port';
import type { PromotionType } from '../../../promotions/promotion.orm-entity';

/** SKU snapshot para líneas de "monto libre" (sin producto del catálogo). */
const OPEN_ITEM_SKU = 'LIBRE';

export interface PreviewSaleTotalsInput {
  items: Array<{
    /** Catálogo: id del producto. Se OMITE en ítems de "monto libre". */
    productId?: string | null;
    variantId?: string | null;
    /** Monto libre: descripción de la línea. */
    description?: string | null;
    /** Monto libre: precio unitario tecleado por el cajero. */
    unitPrice?: string;
    /** Monto libre: tasa de ITBIS (default '0.00'). */
    taxRate?: string;
    quantity: string;
    /** Descuento manual ya tecleado por el cajero (opcional). */
    discount?: string;
  }>;
  orderDiscount?: string;
  tipTotal?: string;
  /** Sucursal activa: para evaluar solo promociones de esa sucursal. */
  branchId: string;
}

export interface AppliedPromotion {
  promotionId: string;
  promotionName: string;
  type: PromotionType;
  discountAmount: string;
  productId?: string;
}

export interface PreviewSaleTotalsResult {
  subtotal: string;
  /** Suma de descuentos por línea (manuales + promos). */
  discountTotal: string;
  /** Descuento global incluyendo el manual + lo aportado por promos ORDER_*. */
  orderDiscount: string;
  taxTotal: string;
  tipTotal: string;
  total: string;
  /** Descuento total de promos (línea + orden) — para mostrar al cajero. */
  promotionsTotal: string;
  appliedPromotions: AppliedPromotion[];
}

/**
 * Calcula los totales tal como los calculará el servidor al crear la venta,
 * INCLUYENDO el impacto de promociones automáticas. Solo lee; no persiste nada.
 *
 * Útil para que el POS muestre el total real al cajero antes de cobrar.
 */
@Injectable()
export class PreviewSaleTotalsUseCase {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCT_PRICING_PORT) private readonly pricing: ProductPricingPort,
    private readonly totals: SaleTotalsCalculator,
    private readonly promotions: PromotionEvaluatorService,
    private readonly businessSettings: BusinessSettingsService,
  ) {}

  async execute(input: PreviewSaleTotalsInput): Promise<PreviewSaleTotalsResult> {
    if (input.items.length === 0) {
      return {
        subtotal: '0.00',
        discountTotal: '0.00',
        orderDiscount: '0.00',
        taxTotal: '0.00',
        tipTotal: input.tipTotal ?? '0.00',
        total: input.tipTotal ?? '0.00',
        promotionsTotal: '0.00',
        appliedPromotions: [],
      };
    }

    // Read-only: usamos UoW solo para que el pricing port pueda usar el manager.
    return this.uow.run(async (ctx) => {
      const productIds = [
        ...new Set(
          input.items.map((i) => i.productId).filter((id): id is string => !!id),
        ),
      ];
      const products = await this.pricing.findManyForSale(ctx, productIds);
      const byId = new Map(products.map((p) => [p.id, p]));
      const variantIds = [
        ...new Set(input.items.map((i) => i.variantId).filter((v): v is string => !!v)),
      ];
      const variants = await this.pricing.findVariantsForSale(ctx, variantIds);
      const variantById = new Map(variants.map((v) => [v.id, v]));

      const lines = input.items.map((it) => {
        // Ítem de "monto libre": sin producto del catálogo.
        if (!it.productId) {
          if (!it.description?.trim() || it.unitPrice == null) {
            throw new OpenItemInvalidError();
          }
          return {
            productId: null,
            variantId: null,
            name: it.description.trim(),
            sku: OPEN_ITEM_SKU,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discount: it.discount ?? '0.00',
            taxRate: it.taxRate ?? '0.00',
          };
        }
        const p = byId.get(it.productId);
        if (!p) throw new ProductNotForSaleError(it.productId, 'no encontrado');
        if (!p.isActive) throw new ProductNotForSaleError(it.productId, 'inactivo');
        if (p.hasVariants && !it.variantId) {
          throw new ProductNotForSaleError(
            it.productId,
            'requiere especificar una variante',
          );
        }
        if (!p.hasVariants && it.variantId) {
          throw new ProductNotForSaleError(
            it.productId,
            'no tiene variantes, no envíes variantId',
          );
        }
        let unitPrice = p.salePrice;
        let name = p.name;
        let sku = p.sku;
        if (it.variantId) {
          const v = variantById.get(it.variantId);
          if (!v || v.productId !== p.id) {
            throw new ProductNotForSaleError(
              it.productId,
              `variante ${it.variantId} no pertenece al producto`,
            );
          }
          if (!v.isActive) {
            throw new ProductNotForSaleError(it.variantId, 'variante inactiva');
          }
          unitPrice = v.salePrice ?? p.salePrice;
          sku = v.sku;
          name = `${p.name} · ${v.name}`;
        }
        return {
          productId: p.id,
          variantId: it.variantId ?? null,
          name,
          sku,
          quantity: it.quantity,
          unitPrice,
          discount: it.discount ?? '0.00',
          taxRate: p.taxRate,
        };
      });

      const promoResult = await this.promotions.evaluate({
        branchId: input.branchId,
        lines: lines
          .filter((l) => l.productId !== null)
          .map((l) => ({
            productId: l.productId as string,
            variantId: l.variantId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            manualDiscount: l.discount,
          })),
      });

      const linesWithPromo = lines.map((l) => {
        // Las líneas de monto libre no participan en promociones.
        if (l.productId === null) return { ...l };
        const key = evaluatorLineKey(l.productId, l.variantId);
        const promoDisc = promoResult.lineDiscounts.get(key) ?? '0.00';
        return {
          ...l,
          discount: fromCents(toCents(l.discount) + toCents(promoDisc)),
        };
      });

      const totalOrderDiscount = fromCents(
        toCents(input.orderDiscount ?? '0.00') + toCents(promoResult.orderDiscount),
      );
      const businessConfig = await this.businessSettings.get();
      const computed = this.totals.compute(
        linesWithPromo,
        totalOrderDiscount,
        input.tipTotal ?? '0.00',
        businessConfig.priceIncludesTax,
      );

      // promotionsTotal = suma de todas las líneas + orden aportadas por promos
      let promoLineCents = 0;
      for (const c of promoResult.lineDiscounts.values()) {
        promoLineCents += toCents(c);
      }
      const promotionsTotal = fromCents(
        promoLineCents + toCents(promoResult.orderDiscount),
      );

      return {
        subtotal: computed.subtotal,
        discountTotal: computed.discountTotal,
        orderDiscount: computed.orderDiscount,
        taxTotal: computed.taxTotal,
        tipTotal: computed.tipTotal,
        total: computed.total,
        promotionsTotal,
        appliedPromotions: promoResult.applied,
      };
    });
  }
}
