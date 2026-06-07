import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Patch,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import { PlanLimitsService, type PlanUsage } from './plan-limits.service';
import { UpdatePlanLimitsDto } from './dto/update-plan-limits.dto';

/** Compara dos secretos en tiempo constante (vía hash de longitud fija). */
function secretMatches(provided: string, expected: string): boolean {
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

@Controller('plan')
export class PlanController {
  constructor(private readonly plan: PlanLimitsService) {}

  /**
   * Plan contratado (topes) + uso actual. SOLO LECTURA. Disponible para
   * cualquier usuario autenticado (la UI lo usa para mostrar el uso y
   * deshabilitar "crear" al alcanzar el tope).
   */
  @Get()
  get(): Promise<PlanUsage> {
    return this.plan.getUsage();
  }

  /**
   * Upsell: cambia los topes del plan (sin tocar la BD). Protegido por el
   * SECRETO super-admin (env `SUPERADMIN_SECRET`), NO por permisos — el ADMIN
   * del cliente los tiene todos, así que no podría ser el candado. El secreto lo
   * conoce solo Soltryx. Si el env no está configurado, el endpoint queda
   * deshabilitado (la gestión sigue siendo por SQL).
   */
  @Patch()
  async update(
    @Headers('x-superadmin-secret') secret: string | undefined,
    @Body() body: UpdatePlanLimitsDto,
  ): Promise<PlanUsage> {
    const expected = process.env.SUPERADMIN_SECRET;
    if (!expected) {
      throw new ForbiddenException({
        code: 'SUPERADMIN_DISABLED',
        message:
          'La gestión de plan por UI no está habilitada en esta instancia (falta SUPERADMIN_SECRET). Usa SQL.',
      });
    }
    if (!secret || !secretMatches(secret, expected)) {
      throw new ForbiddenException({
        code: 'SUPERADMIN_INVALID',
        message: 'Clave super-admin inválida.',
      });
    }
    await this.plan.updateLimits({
      maxUsers: body.maxUsers,
      maxBranches: body.maxBranches,
    });
    return this.plan.getUsage();
  }
}
