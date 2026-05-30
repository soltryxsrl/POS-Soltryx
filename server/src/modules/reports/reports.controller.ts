import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../auth/infrastructure/http/roles.decorator';
import { DateQuery, DateRangeQuery } from './dto/date-range.query';
import { ReportsService } from './reports.service';

@Controller('reports')
@Roles('ADMIN', 'MANAGER')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('sales/daily')
  async daily(@Query() q: DateQuery) {
    const date = q.date ?? today();
    return this.service.dailySummary(date);
  }

  @Get('products/top')
  topProducts(@Query() q: DateRangeQuery) {
    const to = q.to ?? today();
    const from = q.from ?? startOfMonth();
    return this.service.topProducts(from, to, q.limit ?? 10);
  }

  @Get('products/low-stock')
  lowStock() {
    return this.service.lowStock();
  }

  @Get('sales/by-method')
  byMethod(@Query() q: DateRangeQuery) {
    const to = q.to ?? today();
    const from = q.from ?? startOfMonth();
    return this.service.salesByMethod(from, to);
  }

  @Get('sessions/by-user')
  sessionsByUser(@Query() q: DateRangeQuery) {
    const to = q.to ?? today();
    const from = q.from ?? startOfMonth();
    return this.service.sessionsByUser(from, to);
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function startOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
