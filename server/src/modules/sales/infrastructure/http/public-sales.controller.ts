import { Controller, Get, NotFoundException, Param, ParseUUIDPipe } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessSettingsService } from '../../../config/business-settings.service';
import { Public } from '../../../auth/infrastructure/http/public.decorator';
import { CustomerOrmEntity } from '../../../customers/customer.orm-entity';
import { PaymentMethodOrmEntity } from '../../../payment-methods/payment-method.orm-entity';
import { PaymentOrmEntity } from '../persistence/typeorm/payment.orm-entity';
import { SaleItemOrmEntity } from '../persistence/typeorm/sale-item.orm-entity';
import { SaleOrmEntity } from '../persistence/typeorm/sale.orm-entity';

/**
 * Endpoint público (sin login) para que un cliente vea/comparta el recibo
 * de su venta usando la URL `/r/{token}`.
 *
 * Devuelve datos mínimos del recibo + datos del negocio. NO incluye datos
 * internos (userId, cashSessionId, etc.). El token es UUID v4 — no se puede
 * enumerar para acceder a otras ventas.
 */
@Controller('public/sales')
export class PublicSalesController {
  constructor(
    @InjectRepository(SaleOrmEntity)
    private readonly sales: Repository<SaleOrmEntity>,
    @InjectRepository(CustomerOrmEntity)
    private readonly customers: Repository<CustomerOrmEntity>,
    private readonly settings: BusinessSettingsService,
  ) {}

  @Public()
  @Get(':token')
  async getByToken(@Param('token', ParseUUIDPipe) token: string) {
    const sale = await this.sales.findOne({
      where: { publicToken: token },
      relations: { items: true, payments: true },
    });
    if (!sale) throw new NotFoundException('Recibo no encontrado');

    const customer = sale.customerId
      ? await this.customers.findOne({ where: { id: sale.customerId } })
      : null;
    const business = await this.settings.getForBranch(sale.branchId);
    // Nombres configurados de las formas de pago (para reflejar renombres en el
    // recibo público, que no tiene acceso al catálogo vía API autenticada).
    const methods = await this.sales.manager.find(PaymentMethodOrmEntity);
    const paymentMethodNames = Object.fromEntries(
      methods.map((m) => [m.code, m.name]),
    );

    return {
      paymentMethodNames,
      sale: {
        id: sale.id,
        saleNumber: sale.saleNumber,
        customerId: sale.customerId,
        subtotal: sale.subtotal,
        discountTotal: sale.discountTotal,
        orderDiscount: sale.orderDiscount,
        taxTotal: sale.taxTotal,
        tipTotal: sale.tipTotal,
        total: sale.total,
        priceIncludesTax: sale.priceIncludesTax,
        status: sale.status,
        fiscalStatus: sale.fiscalStatus,
        fiscalDocumentId: sale.fiscalDocumentId,
        notes: sale.notes,
        publicToken: sale.publicToken,
        createdAt: sale.createdAt.toISOString(),
        cancelledAt: sale.cancelledAt?.toISOString() ?? null,
        cancelReason: sale.cancelReason,
        items: (sale.items ?? []).map((it) => ({
          id: it.id,
          productNameSnapshot: it.productNameSnapshot,
          productSkuSnapshot: it.productSkuSnapshot,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discount: it.discount,
          taxRate: it.taxRate,
          taxTotal: it.taxTotal,
          total: it.total,
        })),
        payments: (sale.payments ?? []).map((p) => ({
          id: p.id,
          method: p.method,
          amount: p.amount,
          reference: p.reference,
        })),
      },
      customer: customer
        ? {
            fullName: customer.fullName,
            documentType: customer.documentType,
            document: customer.document,
          }
        : null,
      business: {
        name: business.name,
        legalName: business.legalName,
        rnc: business.rnc,
        address: business.address,
        phone: business.phone,
        footerNote: business.footerNote,
      },
    };
  }
}
