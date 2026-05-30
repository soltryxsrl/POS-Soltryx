import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { TransactionContext, UnitOfWork } from './unit-of-work.port';

@Injectable()
export class UnitOfWorkTypeOrm implements UnitOfWork {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async run<T>(work: (ctx: TransactionContext) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(async (manager) => work({ manager }));
  }
}
