import { Injectable } from '@nestjs/common';
import type { TransactionContext } from '../../../../../common/persistence/unit-of-work.port';
import type { SaleNumberGenerator } from '../../../domain/ports/sale-number-generator.port';

@Injectable()
export class SaleNumberGeneratorTypeOrm implements SaleNumberGenerator {
  async next(ctx: TransactionContext): Promise<string> {
    const rows: Array<{ nextval: string }> = await ctx.manager.query(
      `SELECT nextval('sales_number_seq') AS nextval`,
    );
    const n = rows[0]?.nextval;
    if (!n) throw new Error('No se pudo obtener nextval de sales_number_seq');
    return `S-${String(n).padStart(6, '0')}`;
  }
}
