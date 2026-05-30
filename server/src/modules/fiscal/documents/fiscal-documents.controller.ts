import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { RequirePermissions } from '../../auth/infrastructure/http/permissions.decorator';
import { IssueStandaloneDocumentRequestDto } from './dto/issue-standalone-doc.request-dto';
import { FiscalDocumentsService } from './fiscal-documents.service';

@Controller('fiscal/documents')
export class FiscalDocumentsController {
  constructor(private readonly service: FiscalDocumentsService) {}

  @Get()
  @RequirePermissions('fiscal.docs.read')
  list(
    @Query('q') q?: string,
    @Query('docType') docType?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.service.list({
      q,
      docType,
      status,
      from,
      to,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  /**
   * Emite un comprobante standalone (sin venta):
   *   - E41/B11 — Compras a proveedores informales
   *   - E43/B13 — Gastos menores
   * Consume del rango NCF correspondiente y se reporta en el 606.
   */
  @Post('standalone')
  @RequirePermissions('fiscal.purchases.create')
  issueStandalone(@Body() dto: IssueStandaloneDocumentRequestDto) {
    return this.service.issueStandalone({
      docTypeCode: dto.docTypeCode,
      branchId: null,
      counterpartyName: dto.counterpartyName?.trim() || null,
      counterpartyRnc: dto.counterpartyRnc?.trim() || null,
      subtotal: dto.subtotal,
      taxTotal: dto.taxTotal ?? '0.00',
      total: dto.total,
      items: (dto.items ?? []).map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount ?? '0.00',
        taxRate: i.taxRate ?? '0.00',
        taxTotal: i.taxTotal ?? '0.00',
        total: i.total,
      })),
    });
  }
}
