import { Inject, Injectable } from '@nestjs/common';
import {
  CASH_SESSION_REPOSITORY,
  type CashSessionRepository,
  type ListSessionsFilter,
  type ListSessionsResult,
} from '../../domain/ports/cash-session.repository.port';

@Injectable()
export class ListSessionsUseCase {
  constructor(
    @Inject(CASH_SESSION_REPOSITORY)
    private readonly sessions: CashSessionRepository,
  ) {}

  execute(filter: ListSessionsFilter): Promise<ListSessionsResult> {
    return this.sessions.list(filter);
  }
}
