import { Controller, Get, Query } from '@nestjs/common';
import { ActiveBranch } from '../../common/branch/active-branch.decorator';
import { resolveReportBranchScope } from '../../common/branch/branch-scope.util';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../auth/infrastructure/http/current-user.decorator';
import { Roles } from '../auth/infrastructure/http/roles.decorator';
import { RequirePermissions } from '../auth/infrastructure/http/permissions.decorator';
import {
  DateQuery,
  DateRangeQuery,
  PriceHistoryQuery,
  SalesDetailQuery,
  StockByBranchQuery,
} from './dto/date-range.query';
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
    return this.service.topProducts(from, to, q.limit ?? 10, q.offset ?? 0, scope);
  }

  @Get('products/low-stock')
  lowStock(
    @Query() q: DateRangeQuery,
    @ActiveBranch() branchId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const scope = resolveReportBranchScope(q.branchId, branchId, user.permissions ?? []);
    return this.service.lowStock(scope, q.limit ?? 50, q.offset ?? 0);
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

  @Get('sales/by-seller')
  salesBySeller(
    @Query() q: DateRangeQuery,
    @ActiveBranch() branchId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const to = q.to ?? today();
    const from = q.from ?? startOfMonth();
    const scope = resolveReportBranchScope(q.branchId, branchId, user.permissions ?? []);
    return this.service.salesBySeller(from, to, scope);
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

  @Get('inventory/valuation')
  inventoryValuation(
    @Query() q: DateRangeQuery,
    @ActiveBranch() branchId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const scope = resolveReportBranchScope(q.branchId, branchId, user.permissions ?? []);
    return this.service.inventoryValuation(scope);
  }

  @Get('products/margins')
  productMargins(
    @Query() q: DateRangeQuery,
    @ActiveBranch() branchId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const to = q.to ?? today();
    const from = q.from ?? startOfMonth();
    const scope = resolveReportBranchScope(q.branchId, branchId, user.permissions ?? []);
    return this.service.productMargins(from, to, q.limit ?? 20, q.offset ?? 0, scope);
  }

  @Get('products/slow-movers')
  slowMovers(
    @Query() q: DateRangeQuery,
    @ActiveBranch() branchId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const scope = resolveReportBranchScope(q.branchId, branchId, user.permissions ?? []);
    return this.service.slowMovers(q.days ?? 30, q.limit ?? 50, q.offset ?? 0, scope);
  }

  @Get('sales/by-category')
  salesByCategory(
    @Query() q: DateRangeQuery,
    @ActiveBranch() branchId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const to = q.to ?? today();
    const from = q.from ?? startOfMonth();
    const scope = resolveReportBranchScope(q.branchId, branchId, user.permissions ?? []);
    return this.service.salesByCategory(from, to, scope);
  }

  @Get('sales/detail')
  salesDetail(
    @Query() q: SalesDetailQuery,
    @ActiveBranch() branchId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const to = q.to ?? today();
    const from = q.from ?? startOfMonth();
    const scope = resolveReportBranchScope(q.branchId, branchId, user.permissions ?? []);
    return this.service.salesDetail(from, to, scope, {
      productId: q.productId,
      categoryId: q.categoryId,
      limit: q.limit ?? 50,
      offset: q.offset ?? 0,
    });
  }

  /** Existencia comparativa por sucursal (matriz). Solo con permiso de cambio de sucursal. */
  @Get('inventory/by-branch')
  @RequirePermissions('branches.switch')
  stockByBranch(@Query() q: StockByBranchQuery) {
    return this.service.stockByBranch({
      q: q.q,
      limit: q.limit ?? 50,
      offset: q.offset ?? 0,
    });
  }

  @Get('price-history')
  priceHistory(
    @Query() q: PriceHistoryQuery,
    @ActiveBranch() branchId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const to = q.to ?? today();
    const from = q.from ?? startOfMonth();
    const scope = resolveReportBranchScope(q.branchId, branchId, user.permissions ?? []);
    return this.service.priceHistory(from, to, scope, {
      productId: q.productId,
      limit: q.limit ?? 50,
      offset: q.offset ?? 0,
    });
  }

  @Get('returns/analysis')
  returnsAnalysis(
    @Query() q: DateRangeQuery,
    @ActiveBranch() branchId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const to = q.to ?? today();
    const from = q.from ?? startOfMonth();
    const scope = resolveReportBranchScope(q.branchId, branchId, user.permissions ?? []);
    return this.service.returnsAnalysis(from, to, scope);
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function startOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
