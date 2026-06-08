import { Inject, Injectable } from '@nestjs/common';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../../common/persistence/unit-of-work.port';
import { AuditService } from '../../../audit/audit.service';
import { BusinessSettingsService } from '../../../config/business-settings.service';
import { FiscalDocumentsService } from '../../../fiscal/documents/fiscal-documents.service';
import { CustomerOrmEntity } from '../../../customers/customer.orm-entity';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../../../auth/domain/ports/password-hasher.port';
import {
  USER_READER,
  type UserReader,
} from '../../../auth/domain/ports/user-reader.port';
import { PERMISSIONS } from '../../../auth/domain/permissions.catalog';
import { CurrenciesService } from '../../../currencies/currencies.service';
import { CustomerAccountService } from '../../../customer-account/customer-account.service';
import {
  STOCK_MOVEMENT_RECORDER,
  type StockMovementRecorder,
} from '../../../inventory/domain/ports/stock-movement-recorder.port';
import {
  evaluatorLineKey,
  PromotionEvaluatorService,
} from '../../../promotions/promotion-evaluator.service';
import { StockMovementType } from '../../../inventory/domain/entities/stock-movement-type';
import type { Sale } from '../../domain/entities/sale.entity';
import {
  CashSessionMismatchError,
  CustomerRequiredForAccountError,
  DiscountOverrideInvalidError,
  DiscountOverrideRequiredError,
  OpenItemInvalidError,
  PaymentInsufficientError,
  ProductNotForSaleError,
  SaleHasNoItemsError,
  SaleHasNoPaymentsError,
} from '../../domain/errors/sale.errors';
import { DISCOUNT_OVERRIDE_THRESHOLD_PCT } from '../../domain/services/discount-policy';
import {
  CASH_SESSION_VALIDATOR_PORT,
  type CashSessionValidatorPort,
} from '../../domain/ports/cash-session-validator.port';
import {
  PRODUCT_PRICING_PORT,
  type ProductPricingPort,
} from '../../domain/ports/product-pricing.port';
import {
  SALE_NUMBER_GENERATOR,
  type SaleNumberGenerator,
} from '../../domain/ports/sale-number-generator.port';
import {
  SALE_REPOSITORY,
  type SaleRepository,
} from '../../domain/ports/sale.repository.port';
import { SaleTotalsCalculator } from '../../domain/services/sale-totals-calculator';
import { compareMoney, toCents, fromCents, toTaxBp } from '../../domain/services/money';
import { PaymentMethod } from '../../domain/value-objects/payment-method';

/** SKU snapshot para líneas de "monto libre" (sin producto del catálogo). */
const OPEN_ITEM_SKU = 'LIBRE';

export interface CreateSaleInput {
  cashSessionId: string;
  customerId?: string | null;
  notes?: string | null;
  /** Clave de idempotencia (POS offline): si ya existe una venta con ella, se devuelve esa. */
  idempotencyKey?: string | null;
  userId: string;
  /** Permisos del usuario que está iniciando la venta (para override checks). */
  currentUserPermissions: ReadonlyArray<string>;
  /** Credenciales del manager que autoriza un descuento sobre el umbral. */
  overrideCredentials?: {
    emailOrUsername: string;
    password: string;
  } | null;
  /** Si es CASHIER, validamos que la sesión sea suya. Para ADMIN/MANAGER, false. */
  enforceSessionOwnership: boolean;
  /**
   * Código DGII del tipo de comprobante (E31/E32/B01/B02/etc.). Si presente,
   * el server reserva un NCF y crea un fiscal_documents linkeado a la venta.
   * Si null/undefined, la venta queda como "Recibo no fiscal" (NOT_REQUIRED).
   */
  fiscalDocTypeCode?: string | null;
  /** Descuento global a la orden, en moneda, post-impuesto. Opcional. */
  orderDiscount?: string;
  /** Propina (en moneda). No afecta ITBIS. Opcional. */
  tipTotal?: string;
  items: Array<{
    /** Catálogo: id del producto. Se OMITE en ítems de "monto libre". */
    productId?: string | null;
    /** Si se vende una variante específica del producto, su id. */
    variantId?: string | null;
    /** Monto libre: descripción que se imprime como nombre de la línea. */
    description?: string | null;
    /** Monto libre: precio unitario tecleado por el cajero. */
    unitPrice?: string;
    /** Monto libre: tasa de ITBIS (default '0.00'). */
    taxRate?: string;
    /** Cantidad con hasta 3 decimales. */
    quantity: string;
    /** Descuento en moneda (no porcentaje). Opcional. */
    discount?: string;
    /** Nota libre de la línea (modificador, instrucción). Opcional. */
    notes?: string | null;
  }>;
  payments: Array<{
    method: PaymentMethod;
    /** Monto en `currencyCode`. Si la moneda no es base, server convierte a base. */
    amount: string;
    /** Default 'DOP'. */
    currencyCode?: string;
    reference?: string | null;
  }>;
}

@Injectable()
export class CreateSaleUseCase {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(CASH_SESSION_VALIDATOR_PORT)
    private readonly sessionValidator: CashSessionValidatorPort,
    @Inject(PRODUCT_PRICING_PORT) private readonly pricing: ProductPricingPort,
    @Inject(SALE_NUMBER_GENERATOR) private readonly numbers: SaleNumberGenerator,
    @Inject(SALE_REPOSITORY) private readonly saleRepo: SaleRepository,
    @Inject(STOCK_MOVEMENT_RECORDER)
    private readonly stockRecorder: StockMovementRecorder,
    @Inject(USER_READER) private readonly userReader: UserReader,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    private readonly totals: SaleTotalsCalculator,
    private readonly accountService: CustomerAccountService,
    private readonly promotions: PromotionEvaluatorService,
    private readonly audit: AuditService,
    private readonly currencies: CurrenciesService,
    private readonly businessSettings: BusinessSettingsService,
    private readonly fiscalDocs: FiscalDocumentsService,
  ) {}

  async execute(input: CreateSaleInput): Promise<Sale> {
    // Idempotencia (POS offline): si la cola reintenta una venta ya registrada,
    // devolvemos la existente en vez de duplicar el cobro/stock.
    if (input.idempotencyKey) {
      const existing = await this.saleRepo.findByIdempotencyKey(input.idempotencyKey);
      if (existing) return existing;
    }
    if (input.items.length === 0) throw new SaleHasNoItemsError();
    if (input.payments.length === 0) throw new SaleHasNoPaymentsError();

    // ACCOUNT (crédito) requiere cliente: el saldo se carga a su cuenta
    // y sin customerId no hay a quién cobrarle después.
    const hasAccountPayment = input.payments.some((p) => p.method === PaymentMethod.ACCOUNT);
    if (hasAccountPayment && !input.customerId) {
      throw new CustomerRequiredForAccountError();
    }

    const session = await this.sessionValidator.validateOpen(
      input.cashSessionId,
      input.enforceSessionOwnership ? input.userId : undefined,
    );
    if (!session) throw new CashSessionMismatchError();

    return this.uow.run(async (ctx) => {
      // 1) Cargar snapshots de productos desde el SERVER (no confiar en el cliente)
      const productIds = [
        ...new Set(
          input.items.map((i) => i.productId).filter((id): id is string => !!id),
        ),
      ];
      const products = await this.pricing.findManyForSale(ctx, productIds);
      // Anti-IDOR: cada producto debe pertenecer a la sucursal de la venta. El
      // cliente solo muestra los de la sucursal, pero la API no debe confiar en
      // eso (un request manipulado podría inyectar productos de otra sucursal).
      if (session.branchId) {
        for (const p of products) {
          if (p.branchId !== session.branchId) {
            throw new ProductNotForSaleError(p.id, 'no pertenece a esta sucursal');
          }
        }
      }
      const byId = new Map(products.map((p) => [p.id, p]));
      const variantIds = [
        ...new Set(input.items.map((i) => i.variantId).filter((v): v is string => !!v)),
      ];
      const variants = await this.pricing.findVariantsForSale(ctx, variantIds);
      const variantById = new Map(variants.map((v) => [v.id, v]));

      // 2) Validar cada producto + construir líneas con snapshot de precio/tax/nombre.
      //    Si el producto tiene variantes, se exige variantId; el snapshot
      //    (precio, sku, nombre) usa los datos de la variante.
      const lines = input.items.map((it) => {
        // Ítem de "monto libre": sin producto del catálogo. El cajero tecleó
        // descripción + precio + (opcional) ITBIS. No mueve stock ni promos.
        if (!it.productId) {
          if (!it.description?.trim() || it.unitPrice == null) {
            throw new OpenItemInvalidError();
          }
          return {
            productId: null,
            variantId: null,
            variantNameSnapshot: null,
            name: it.description.trim(),
            sku: OPEN_ITEM_SKU,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discount: it.discount ?? '0.00',
            taxRate: it.taxRate ?? '0.00',
            isKit: false,
            kitComponents: [] as Array<{
              componentProductId: string;
              quantity: string;
            }>,
            notes: it.notes?.trim() ? it.notes.trim() : null,
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
        let variantId: string | null = null;
        let variantNameSnapshot: string | null = null;
        if (it.variantId) {
          const v = variantById.get(it.variantId);
          if (!v || v.productId !== p.id) {
            throw new ProductNotForSaleError(
              it.productId,
              `variante ${it.variantId} no pertenece a este producto`,
            );
          }
          if (!v.isActive) {
            throw new ProductNotForSaleError(it.variantId, 'variante inactiva');
          }
          unitPrice = v.salePrice ?? p.salePrice;
          sku = v.sku;
          name = `${p.name} · ${v.name}`;
          variantId = v.id;
          variantNameSnapshot = v.name;
        }
        return {
          productId: p.id,
          variantId,
          variantNameSnapshot,
          name,
          sku,
          quantity: it.quantity,
          unitPrice,
          discount: it.discount ?? '0.00',
          taxRate: p.taxRate,
          isKit: p.isKit,
          kitComponents: p.kitComponents,
          notes: it.notes?.trim() ? it.notes.trim() : null,
        };
      });

      // 2.5) Evaluar promociones activas. Devuelve descuentos a sumar a las
      //      líneas (sobre el manual del cajero) y/o al descuento de orden.
      const promoResult = await this.promotions.evaluate({
        branchId: session.branchId,
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
      // Aplicar line discounts de promos: se SUMAN al descuento manual
      // que ya venía en cada línea.
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

      // 3) Calcular totales server-side. El modo de precio (ITBIS incluido o no)
      //    sale de la config del negocio y se snapshotea en la venta.
      const businessConfig = await this.businessSettings.get();
      const computed = this.totals.compute(
        linesWithPromo,
        totalOrderDiscount,
        input.tipTotal ?? '0.00',
        businessConfig.priceIncludesTax,
      );

      // 3.5) Política de override: si el descuento MANUAL (sin contar promos)
      //      supera el umbral, exigimos autorización de un manager.
      //      Calculamos sobre el subtotal pre-impuesto: descuentos manuales son
      //      `discount` original de cada línea (antes de promos) + orderDiscount
      //      original (antes de promos).
      const manualLineDiscountCents = lines.reduce(
        (acc, l) => acc + toCents(l.discount),
        0,
      );
      const manualOrderDiscountCents = toCents(input.orderDiscount ?? '0.00');
      const totalManualDiscountCents = manualLineDiscountCents + manualOrderDiscountCents;
      const subtotalCents = toCents(computed.subtotal);
      let discountAuthorizedById: string | null = null;
      let discountAuthorizedBySnapshot: string | null = null;
      // Threshold dinámico desde business_settings (fallback al default).
      const thresholdPct = (() => {
        const parsed = parseFloat(businessConfig.discountOverrideThresholdPct);
        return Number.isFinite(parsed) && parsed > 0
          ? parsed
          : DISCOUNT_OVERRIDE_THRESHOLD_PCT;
      })();
      if (totalManualDiscountCents > 0 && subtotalCents > 0) {
        const pct = (totalManualDiscountCents * 100) / subtotalCents;
        if (pct > thresholdPct) {
          const requesterHasPermission = input.currentUserPermissions.includes(
            PERMISSIONS.SALES_DISCOUNT_OVERRIDE.code,
          );
          if (requesterHasPermission) {
            discountAuthorizedById = input.userId;
            // Resolver el nombre del requester (que es su propio autorizador).
            const self = await this.userReader.findById(input.userId);
            discountAuthorizedBySnapshot = self?.fullName ?? null;
          } else if (input.overrideCredentials) {
            const authorizer = await this.userReader.findByEmailOrUsername(
              input.overrideCredentials.emailOrUsername,
            );
            if (!authorizer || !authorizer.isActive) {
              throw new DiscountOverrideInvalidError(
                'Usuario autorizador no encontrado o inactivo',
              );
            }
            const passwordOk = await this.hasher.verify(
              input.overrideCredentials.password,
              authorizer.passwordHash,
            );
            if (!passwordOk) {
              throw new DiscountOverrideInvalidError('Contraseña incorrecta');
            }
            if (
              !authorizer.permissions.includes(
                PERMISSIONS.SALES_DISCOUNT_OVERRIDE.code,
              )
            ) {
              throw new DiscountOverrideInvalidError(
                'El usuario indicado no tiene permiso para autorizar descuentos',
              );
            }
            discountAuthorizedById = authorizer.id;
            discountAuthorizedBySnapshot = authorizer.fullName;
          } else {
            throw new DiscountOverrideRequiredError(pct, thresholdPct);
          }
        }
      }

      // 4) Convertir cada pago a moneda BASE (DOP). Si llegó en USD/EUR,
      //    el server consulta la tasa actual y guarda foreignAmount + rate.
      const convertedPayments = await Promise.all(
        input.payments.map(async (p) => {
          const code = p.currencyCode ?? 'DOP';
          if (code === 'DOP') {
            return {
              ...p,
              baseAmount: p.amount,
              currencyCode: 'DOP',
              foreignAmount: null as string | null,
              exchangeRate: null as string | null,
            };
          }
          const { baseAmount, rateUsed } = await this.currencies.convertToBase(
            code,
            p.amount,
          );
          return {
            ...p,
            baseAmount,
            currencyCode: code,
            foreignAmount: p.amount,
            exchangeRate: rateUsed,
          };
        }),
      );

      // 5) Validar pagos: suma EN BASE >= total
      const paidCents = convertedPayments.reduce(
        (acc, p) => acc + toCents(p.baseAmount),
        0,
      );
      const totalCents = toCents(computed.total);
      if (paidCents < totalCents) {
        throw new PaymentInsufficientError(computed.total, fromCents(paidCents));
      }

      // 5) Generar sale_number desde la sequence (concurrent-safe)
      const saleNumber = await this.numbers.next(ctx);

      // 6) Persistir sale + items + payments
      const sale = await this.saleRepo.insert(ctx, {
        branchId: session.branchId,
        saleNumber,
        customerId: input.customerId ?? null,
        userId: input.userId,
        cashSessionId: session.id,
        subtotal: computed.subtotal,
        discountTotal: computed.discountTotal,
        orderDiscount: computed.orderDiscount,
        taxTotal: computed.taxTotal,
        tipTotal: computed.tipTotal,
        total: computed.total,
        priceIncludesTax: businessConfig.priceIncludesTax,
        notes: input.notes ?? null,
        discountAuthorizedById,
        discountAuthorizedBySnapshot,
        idempotencyKey: input.idempotencyKey ?? null,
        items: computed.lines.map((l, idx) => {
          const original = linesWithPromo[idx];
          if (!original) throw new Error('line index mismatch');
          return {
            productId: l.productId,
            variantId: original.variantId,
            variantNameSnapshot: original.variantNameSnapshot,
            productNameSnapshot: original.name,
            productSkuSnapshot: original.sku,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discount: l.discount,
            taxRate: l.taxRate,
            taxTotal: l.taxTotal,
            total: l.lineTotal,
            // COGS: costo unitario vigente (promedio móvil) del producto al vender.
            // Variantes usan el costo del padre; kits usan el costo propio del kit.
            unitCostSnapshot: l.productId ? (byId.get(l.productId)?.costPrice ?? null) : null,
            kitComponentsSnapshot: original.isKit
              ? original.kitComponents.map((c) => ({
                  componentProductId: c.componentProductId,
                  quantity: c.quantity,
                }))
              : null,
            notes: original.notes,
          };
        }),
        payments: convertedPayments.map((p) => ({
          method: p.method,
          amount: p.baseAmount,
          currencyCode: p.currencyCode,
          foreignAmount: p.foreignAmount,
          exchangeRate: p.exchangeRate,
          reference: p.reference ?? null,
        })),
      });

      // 6.5) Emisión fiscal: si vino `fiscalDocTypeCode`, reservar NCF y crear
      //      el fiscal_document linkeado a esta venta. Todo dentro de la
      //      misma transacción para que si algo falla la venta no quede sin
      //      su NCF (o el NCF sin venta).
      if (input.fiscalDocTypeCode) {
        let buyerName: string | null = null;
        let buyerRnc: string | null = null;
        if (input.customerId) {
          const cust = await ctx.manager.findOne(CustomerOrmEntity, {
            where: { id: input.customerId },
          });
          if (cust) {
            buyerName = cust.fullName;
            // El RNC solo se setea si el cliente lo tiene; el service rechaza
            // si el tipo requiere RNC y no llega.
            if (cust.documentType === 'RNC' && cust.document) {
              buyerRnc = cust.document;
            }
          }
        }

        // COMPROBANTE FISCAL — representación correcta de descuentos para DGII:
        // el descuento de orden (manual + promos) es post-ITBIS en la venta/recibo,
        // pero en el comprobante debe reducir la BASE imponible y el ITBIS para que
        // `subtotal + ITBIS = total` y el ITBIS quede sobre el neto real. Lo
        // distribuimos (tax-inclusive) proporcional al total de cada línea; las
        // líneas sin parte del descuento quedan idénticas a lo calculado (sin
        // re-redondeo). Esto NO altera lo que paga el cliente ni el recibo.
        const orderDiscC = toCents(computed.orderDiscount);
        const lineTotalsC = computed.lines.map((l) => toCents(l.lineTotal));
        const linesGrossTotalC = lineTotalsC.reduce((a, b) => a + b, 0);
        const orderShares = new Array<number>(computed.lines.length).fill(0);
        if (orderDiscC > 0 && linesGrossTotalC > 0) {
          const fracs: Array<{ frac: number; i: number }> = [];
          let assigned = 0;
          computed.lines.forEach((_l, i) => {
            const exact = (orderDiscC * lineTotalsC[i]!) / linesGrossTotalC;
            const floor = Math.floor(exact);
            orderShares[i] = floor;
            assigned += floor;
            fracs.push({ frac: exact - floor, i });
          });
          let remainder = orderDiscC - assigned;
          fracs.sort((a, b) => b.frac - a.frac);
          for (let k = 0; k < remainder; k++) orderShares[fracs[k % fracs.length]!.i]! += 1;
          for (let i = 0; i < orderShares.length; i++) {
            if (orderShares[i]! > lineTotalsC[i]!) orderShares[i] = lineTotalsC[i]!;
          }
        }
        const fiscalItems = computed.lines.map((l, i) => {
          const grossC = toCents(l.grossSubtotal);
          if (orderShares[i] === 0) {
            const baseC = toCents(l.taxableBase);
            return {
              baseC,
              taxC: toCents(l.taxTotal),
              totalC: lineTotalsC[i]!,
              discountC: grossC - baseC,
            };
          }
          const newTotalC = lineTotalsC[i]! - orderShares[i]!;
          const taxBp = toTaxBp(l.taxRate);
          const newBaseC = Math.round((newTotalC * 10000) / (10000 + taxBp));
          return {
            baseC: newBaseC,
            taxC: newTotalC - newBaseC,
            totalC: newTotalC,
            discountC: grossC - newBaseC,
          };
        });
        const fiscalSubtotalC = fiscalItems.reduce((a, it) => a + it.baseC, 0);
        const fiscalTaxC = fiscalItems.reduce((a, it) => a + it.taxC, 0);

        const doc = await this.fiscalDocs.issueForSale(ctx, {
          docTypeCode: input.fiscalDocTypeCode,
          saleId: sale.id,
          branchId: session.branchId,
          buyerName,
          buyerRnc,
          subtotal: fromCents(fiscalSubtotalC),
          taxTotal: fromCents(fiscalTaxC),
          total: computed.total,
          items: computed.lines.map((l, idx) => {
            const original = linesWithPromo[idx];
            if (!original) throw new Error('line index mismatch');
            const it = fiscalItems[idx]!;
            return {
              description: original.name,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              discount: fromCents(it.discountC),
              taxRate: l.taxRate,
              taxTotal: fromCents(it.taxC),
              total: fromCents(it.totalC),
            };
          }),
        });

        // Linkear back la venta al fiscal_document creado y subir su status.
        await ctx.manager.query(
          `UPDATE sales SET fiscal_document_id = $1, fiscal_status = 'ISSUED' WHERE id = $2`,
          [doc.id, sale.id],
        );
      }

      // 7) Decrementar stock de cada producto.
      //    - Producto normal: un SALE movement por la cantidad de la línea.
      //    - Producto kit: NO mueve stock del kit (no tiene). Mueve stock de
      //      cada componente proporcional a la cantidad del kit.
      //    El recorder hace FOR UPDATE → serializa concurrentes
      //    y lanza InsufficientStockError si el stock no alcanza (revierte toda la tx).
      for (let idx = 0; idx < computed.lines.length; idx++) {
        const line = computed.lines[idx];
        const original = linesWithPromo[idx];
        if (!line || !original) throw new Error('line index mismatch');
        if (original.isKit) {
          for (const comp of original.kitComponents) {
            const totalQty = (
              parseFloat(comp.quantity) * parseFloat(line.quantity)
            ).toFixed(3);
            await this.stockRecorder.record(ctx, {
              productId: comp.componentProductId,
              type: StockMovementType.SALE,
              quantity: totalQty,
              reason: `Venta ${saleNumber} (kit ${original.sku})`,
              saleId: sale.id,
              userId: input.userId,
              branchId: session.branchId,
            });
          }
        } else if (original.productId !== null) {
          await this.stockRecorder.record(ctx, {
            productId: original.productId,
            variantId: original.variantId,
            type: StockMovementType.SALE,
            quantity: line.quantity,
            reason: `Venta ${saleNumber}`,
            saleId: sale.id,
            userId: input.userId,
            branchId: session.branchId,
          });
        }
        // else: ítem de monto libre — no mueve stock.
      }

      // 8) Si hubo pagos ACCOUNT (crédito), crear el CHARGE en el ledger del cliente
      //    dentro de la misma transacción. Si esto falla, toda la venta se revierte.
      if (hasAccountPayment) {
        let accountCents = 0;
        for (const p of convertedPayments) {
          if (p.method === PaymentMethod.ACCOUNT) accountCents += toCents(p.baseAmount);
        }
        if (accountCents > 0 && input.customerId) {
          await this.accountService.recordCharge(ctx, {
            customerId: input.customerId,
            amount: fromCents(accountCents),
            saleId: sale.id,
            cashSessionId: session.id,
            userId: input.userId,
          });
        }
      }

      // 9) Auditar promociones aplicadas (si las hubo) para que el dueño
      //    pueda ver impacto real en la bitácora.
      if (promoResult.applied.length > 0) {
        void this.audit.record({
          actorUserId: input.userId,
          action: 'promotions.applied',
          entityType: 'sale',
          entityId: sale.id,
          payload: {
            saleNumber: sale.saleNumber,
            promotions: promoResult.applied,
            totalOrderDiscount: promoResult.orderDiscount,
          },
        });
      }

      // 9.5) Si hubo override de descuento, también lo auditamos.
      if (discountAuthorizedById) {
        void this.audit.record({
          actorUserId: discountAuthorizedById,
          action: 'sales.discount.override',
          entityType: 'sale',
          entityId: sale.id,
          payload: {
            saleNumber: sale.saleNumber,
            cashierId: input.userId,
            manualLineDiscount: fromCents(manualLineDiscountCents),
            orderDiscount: input.orderDiscount ?? '0.00',
            subtotal: computed.subtotal,
            thresholdPct,
          },
        });
      }

      // 10) Devolver la venta tal como la persistió `insert()` — los items/payments
      //     ya vienen poblados. Los stock_movements no modifican la sale en sí.
      return sale;
    });
  }
}

/** Calcula vuelto (change) si el pago en efectivo excede el total. */
export function computeChange(totalPaid: string, total: string): string {
  if (compareMoney(totalPaid, total) <= 0) return '0.00';
  return fromCents(toCents(totalPaid) - toCents(total));
}
