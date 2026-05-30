import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEventOrmEntity } from './audit-event.orm-entity';

export interface AuditEventInput {
  actorUserId: string | null;
  actorName?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  payload?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}

export interface AuditEventResponse {
  id: string;
  actorUserId: string | null;
  actorName: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  payload: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface ListAuditEventsFilter {
  action?: string;
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditEventsListResponse {
  items: AuditEventResponse[];
  total: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditEventOrmEntity)
    private readonly repo: Repository<AuditEventOrmEntity>,
  ) {}

  /**
   * Registra un evento. **No lanza errores** al caller — el audit log debe ser
   * "fire and forget" para que su falla no rompa la operación principal.
   */
  async record(input: AuditEventInput): Promise<void> {
    try {
      const entity = this.repo.create({
        actorUserId: input.actorUserId,
        actorName: input.actorName ?? null,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        payload: input.payload ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      });
      await this.repo.save(entity);
    } catch (err) {
      // Audit nunca debe romper el flujo. Logueamos y seguimos.
      this.logger.error(
        `Failed to record audit event "${input.action}"`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  async list(filter: ListAuditEventsFilter): Promise<AuditEventsListResponse> {
    const limit = Math.min(filter.limit ?? 50, 200);
    const offset = filter.offset ?? 0;
    const qb = this.repo
      .createQueryBuilder('e')
      .orderBy('e.createdAt', 'DESC')
      .take(limit)
      .skip(offset);
    if (filter.action) qb.andWhere('e.action = :a', { a: filter.action });
    if (filter.entityType) qb.andWhere('e.entityType = :et', { et: filter.entityType });
    if (filter.entityId) qb.andWhere('e.entityId = :eid', { eid: filter.entityId });
    if (filter.actorUserId) qb.andWhere('e.actorUserId = :uid', { uid: filter.actorUserId });
    if (filter.from) qb.andWhere('e.createdAt >= :from', { from: filter.from });
    if (filter.to) qb.andWhere('e.createdAt <= :to', { to: filter.to });
    const [items, total] = await qb.getManyAndCount();
    return { items: items.map(toResponse), total };
  }
}

function toResponse(e: AuditEventOrmEntity): AuditEventResponse {
  return {
    id: e.id,
    actorUserId: e.actorUserId,
    actorName: e.actorName,
    action: e.action,
    entityType: e.entityType,
    entityId: e.entityId,
    payload: e.payload,
    ip: e.ip,
    userAgent: e.userAgent,
    createdAt: e.createdAt.toISOString(),
  };
}
