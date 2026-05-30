import { Injectable, Logger } from '@nestjs/common';
import type { FiscalDocumentOrmEntity } from './fiscal-document.orm-entity';
import type { FiscalProviderPort } from './fiscal-provider.port';

/**
 * Adapter por defecto — no envía a ningún sistema externo, solo registra
 * el evento en el log. Mantiene el contrato de `FiscalProviderPort` para que
 * `CreateSaleUseCase` no necesite cambiar cuando se integre el provider real.
 */
@Injectable()
export class NoopFiscalProvider implements FiscalProviderPort {
  private readonly logger = new Logger(NoopFiscalProvider.name);

  async publish(doc: FiscalDocumentOrmEntity): Promise<void> {
    this.logger.log(
      `[noop] fiscal_document emitted ncf=${doc.ncf} type=${doc.docType} sale=${doc.saleId} — pendiente de envío externo`,
    );
  }
}
