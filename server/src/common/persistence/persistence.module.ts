import { Global, Module } from '@nestjs/common';
import { UNIT_OF_WORK } from './unit-of-work.port';
import { UnitOfWorkTypeOrm } from './unit-of-work.typeorm';

@Global()
@Module({
  providers: [{ provide: UNIT_OF_WORK, useClass: UnitOfWorkTypeOrm }],
  exports: [UNIT_OF_WORK],
})
export class PersistenceModule {}
