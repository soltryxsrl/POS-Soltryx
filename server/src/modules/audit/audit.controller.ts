import { Controller, Get, Query } from '@nestjs/common';
import { RequirePermissions } from '../auth/infrastructure/http/permissions.decorator';
import { AuditService } from './audit.service';
import { ListAuditEventsQuery } from './dto/list-audit-events.query';

@Controller('audit-events')
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  @RequirePermissions('audit.read')
  list(@Query() q: ListAuditEventsQuery) {
    return this.service.list({
      action: q.action,
      entityType: q.entityType,
      entityId: q.entityId,
      actorUserId: q.actorUserId,
      from: q.from ? new Date(q.from) : undefined,
      to: q.to ? new Date(q.to) : undefined,
      limit: q.limit,
      offset: q.offset,
    });
  }
}
