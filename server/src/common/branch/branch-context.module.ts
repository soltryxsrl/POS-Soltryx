import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { BranchesModule } from '../../modules/branches/branches.module';
import { BranchContextInterceptor } from './branch-context.interceptor';

/**
 * Registra globalmente el interceptor que resuelve la sucursal activa por
 * request. `@Global` para que `@ActiveBranch()` y el contexto estén disponibles
 * en toda la app sin re-importar.
 */
@Global()
@Module({
  imports: [BranchesModule],
  providers: [{ provide: APP_INTERCEPTOR, useClass: BranchContextInterceptor }],
})
export class BranchContextModule {}
