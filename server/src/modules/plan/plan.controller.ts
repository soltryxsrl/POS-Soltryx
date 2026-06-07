import { Controller, Get } from '@nestjs/common';
import { PlanLimitsService, type PlanUsage } from './plan-limits.service';

@Controller('plan')
export class PlanController {
  constructor(private readonly plan: PlanLimitsService) {}

  /**
   * Plan contratado (topes) + uso actual. SOLO LECTURA: el cambio de plan lo
   * realiza Soltryx (super-admin), no el admin del cliente. Disponible para
   * cualquier usuario autenticado (la UI lo usa para mostrar el uso y
   * deshabilitar "crear" al alcanzar el tope).
   */
  @Get()
  get(): Promise<PlanUsage> {
    return this.plan.getUsage();
  }
}
