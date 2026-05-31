import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ActiveBranch } from '../../../common/branch/active-branch.decorator';
import { resolveReportBranchScope } from '../../../common/branch/branch-scope.util';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../../auth/infrastructure/http/current-user.decorator';
import { RequirePermissions } from '../../auth/infrastructure/http/permissions.decorator';
import { Fiscal606Service } from './fiscal-606.service';
import { Fiscal607Service } from './fiscal-607.service';

@Controller('fiscal/reports')
export class FiscalReportsController {
  constructor(
    private readonly fiscal607: Fiscal607Service,
    private readonly fiscal606: Fiscal606Service,
  ) {}

  /**
   * GET /api/fiscal/reports/607?from=YYYY-MM-DD&to=YYYY-MM-DD&format=json|txt
   * Ventas con NCF emitido en el rango.
   */
  @Get('607')
  @RequirePermissions('fiscal.reports.read')
  async report607(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('format') format: string | undefined,
    @Query('branchId') branchScope: string | undefined,
    @ActiveBranch() branchId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const scope = resolveReportBranchScope(branchScope, branchId, user.permissions ?? []);
    const { rows, summary } = await this.fiscal607.generate(from, to, scope);
    if (format === 'txt') {
      const fileName = `607_${from.replace(/-/g, '')}_${to.replace(/-/g, '')}.txt`;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      return this.fiscal607.toTxt(rows);
    }
    return { rows, summary };
  }

  /**
   * GET /api/fiscal/reports/606?from=YYYY-MM-DD&to=YYYY-MM-DD&format=json|txt
   * Compras con NCF de proveedor recibido en el rango.
   */
  @Get('606')
  @RequirePermissions('fiscal.reports.read')
  async report606(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('format') format: string | undefined,
    @Query('branchId') branchScope: string | undefined,
    @ActiveBranch() branchId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const scope = resolveReportBranchScope(branchScope, branchId, user.permissions ?? []);
    const { rows, summary } = await this.fiscal606.generate(from, to, scope);
    if (format === 'txt') {
      const fileName = `606_${from.replace(/-/g, '')}_${to.replace(/-/g, '')}.txt`;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      return this.fiscal606.toTxt(rows);
    }
    return { rows, summary };
  }
}
