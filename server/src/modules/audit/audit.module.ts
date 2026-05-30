import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditController } from './audit.controller';
import { AuditEventOrmEntity } from './audit-event.orm-entity';
import { AuditService } from './audit.service';

/**
 * Global porque AuditService se inyecta desde casi cualquier módulo para
 * registrar eventos sensibles. Marcarlo @Global() evita tener que importarlo
 * en cada feature.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditEventOrmEntity])],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
