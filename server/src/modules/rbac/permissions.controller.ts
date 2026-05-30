import { Controller, Get } from '@nestjs/common';
import { RequirePermissions } from '../auth/infrastructure/http/permissions.decorator';
import { PermissionsService } from './permissions.service';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly service: PermissionsService) {}

  /**
   * Catálogo completo de permisos (para que la UI admin construya el selector
   * al crear/editar roles). Requiere `roles.read` porque solo lo usa esa UI.
   */
  @Get()
  @RequirePermissions('roles.read')
  list() {
    return this.service.list();
  }
}
