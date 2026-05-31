import { Controller, Get, Query } from '@nestjs/common';
import { ActiveBranch } from '../../common/branch/active-branch.decorator';
import { resolveReportBranchScope } from '../../common/branch/branch-scope.util';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../auth/infrastructure/http/current-user.decorator';
import { Roles } from '../auth/infrastructure/http/roles.decorator';
import { DateQuery, DateRangeQuery } from './dto/date-range.query';
import { ReportsService } from './reports.service';

@Controller('reports')
@Roles('ADMIN', 'MANAGER')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('sales/daily')
  async daily(
    @Query() q: DateQuery,
    @ActiveBranch() branchId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const date = q.date ?? today();
    const scope = resolveReportBranchScope(q.branchId, branchId, user.permissions ?? []);
    return this.service.dailySummary(date, scope);
  }

  @Get('products/top')
  topProducts(
    @Query() q: DateRangeQuery,
    @ActiveBranch() branchId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const to = q.to ?? today();
    const from = q.from ?? startOfMonth();
    const scope = resolveReportBranchScope(q.branchId, branchId, user.permissions ?? []);
    return this.service.topProducts(from, to, q.limit ?? 10, scope);
  }

  @Get('products/low-stock')
  lowStock(
    @Query() q: DateRangeQuery,
    @ActiveBranch() branchId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const scope = resolveReportBranchScope(q.branchId, branchId, user.permissions ?? []);
    return this.service.lowStock(scope);
  }

  @Get('sales/by-method')
  byMethod(
    @Query() q: DateRangeQuery,
    @ActiveBranch() branchId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const to = q.to ?? today();
    const from = q.from ?? startOfMonth();
    const scope = resolveReportBranchScope(q.branchId, branchId, user.permissions ?? []);
    return this.service.salesByMethod(from, to, scope);
  }

  @Get('sessions/by-user')
  sessionsByUser(
    @Query() q: DateRangeQuery,
    @ActiveBranch() branchId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const to = q.to ?? today();
    const from = q.from ?? startOfMonth();
    const scope = resolveReportBranchScope(q.branchId, branchId, user.permissions ?? []);
    return this.service.sessionsByUser(from, to, scope);
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function startOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
