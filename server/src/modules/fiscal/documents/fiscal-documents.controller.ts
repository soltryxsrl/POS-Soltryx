import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { IsIn } from 'class-validator';
import { ActiveBranch } from '../../../common/branch/active-branch.decorator';
import { RequirePermissions } from '../../auth/infrastructure/http/permissions.decorator';
import { IssueStandaloneDocumentRequestDto } from './dto/issue-standalone-doc.request-dto';
import { FiscalDocumentsService } from './fiscal-documents.service';

class VoidDocumentRequestDto {
  /** Tipo de anulación DGII (608): 01..09. */
  @IsIn(['01', '02', '03', '04', '05', '06', '07', '08', '09'])
  voidType!: string;
}

@Controller('fiscal/documents')
export class FiscalDocumentsController {
  constructor(private readonly service: FiscalDocumentsService) {}

  @Get()
  @RequirePermissions('fiscal.docs.read')
  list(
    @ActiveBranch() branchId: string,
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
      branchId,
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
  issueStandalone(
    @Body() dto: IssueStandaloneDocumentRequestDto,
    @ActiveBranch() branchId: string,
  ) {
    return this.service.issueStandalone({
      docTypeCode: dto.docTypeCode,
      branchId,
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

  /** Anula un comprobante standalone (NCF quemado) → aparece en el 608. */
  @Post(':id/void')
  @RequirePermissions('fiscal.sequences.manage')
  void(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VoidDocumentRequestDto,
    @ActiveBranch() branchId: string,
  ) {
    return this.service.voidDocument({ id, voidType: dto.voidType, branchId });
  }
}
