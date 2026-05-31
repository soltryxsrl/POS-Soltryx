import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerOrmEntity } from '../customers/customer.orm-entity';
import { PurchaseOrderOrmEntity } from '../purchases/purchase-order.orm-entity';
import { PaymentOrmEntity } from '../sales/infrastructure/persistence/typeorm/payment.orm-entity';
import { SaleOrmEntity } from '../sales/infrastructure/persistence/typeorm/sale.orm-entity';
import { SupplierOrmEntity } from '../suppliers/supplier.orm-entity';
import { FiscalDocTypeOrmEntity } from './doc-types/fiscal-doc-type.orm-entity';
import { FiscalDocTypesController } from './doc-types/fiscal-doc-types.controller';
import { FiscalDocTypesService } from './doc-types/fiscal-doc-types.service';
import { FiscalDocumentsController } from './documents/fiscal-documents.controller';
import { FiscalDocumentItemOrmEntity } from './documents/fiscal-document-item.orm-entity';
import { FiscalDocumentOrmEntity } from './documents/fiscal-document.orm-entity';
import { FiscalDocumentsService } from './documents/fiscal-documents.service';
import { FISCAL_PROVIDER_PORT } from './documents/fiscal-provider.port';
import { NoopFiscalProvider } from './documents/noop-fiscal-provider.adapter';
import { Fiscal606Service } from './reports/fiscal-606.service';
import { Fiscal607Service } from './reports/fiscal-607.service';
import { Fiscal608Service } from './reports/fiscal-608.service';
import { FiscalReportsController } from './reports/fiscal-reports.controller';
import { FiscalSequenceOrmEntity } from './sequences/fiscal-sequence.orm-entity';
import { FiscalSequencesController } from './sequences/fiscal-sequences.controller';
import { FiscalSequencesService } from './sequences/fiscal-sequences.service';

/**
 * Módulo fiscal RD (DGII / e-CF).
 *
 *   - Catálogo de tipos de comprobante (e-CF + NCF tradicional)
 *   - Administración de secuencias NCF (rangos, renovación)
 *   - Emisión de comprobantes ligada a ventas (FiscalDocumentsService)
 *   - Reportes DGII (607 ventas; 606 pendiente)
 *
 * El envío al sistema DGII vive en otro sistema externo. T1ET genera el
 * NCF localmente y publica vía `FiscalProviderPort` (no-op por ahora).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      FiscalDocTypeOrmEntity,
      FiscalSequenceOrmEntity,
      FiscalDocumentOrmEntity,
      FiscalDocumentItemOrmEntity,
      // Entidades de otros módulos que los reportes leen directo.
      SaleOrmEntity,
      PaymentOrmEntity,
      CustomerOrmEntity,
      PurchaseOrderOrmEntity,
      SupplierOrmEntity,
    ]),
  ],
  controllers: [
    FiscalDocTypesController,
    FiscalSequencesController,
    FiscalDocumentsController,
    FiscalReportsController,
  ],
  providers: [
    FiscalDocTypesService,
    FiscalSequencesService,
    FiscalDocumentsService,
    Fiscal607Service,
    Fiscal606Service,
    Fiscal608Service,
    { provide: FISCAL_PROVIDER_PORT, useClass: NoopFiscalProvider },
  ],
  exports: [
    FiscalDocTypesService,
    FiscalSequencesService,
    FiscalDocumentsService,
  ],
})
export class FiscalModule {}
