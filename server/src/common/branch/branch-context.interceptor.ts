import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { BranchesService } from '../../modules/branches/branches.service';
import type { CurrentUserPayload } from '../../modules/auth/infrastructure/http/current-user.decorator';

const BRANCH_HEADER = 'x-branch-id';
const SWITCH_PERMISSION = 'branches.switch';

interface BranchRequest {
  user?: CurrentUserPayload;
  branchId?: string | null;
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Resuelve la SUCURSAL ACTIVA de cada request y la deja en `request.branchId`.
 * Corre después de los guards (request.user ya está poblado).
 *
 *  - Sucursal HOME = `user.branchId` (firmada en el JWT) → candado del cajero.
 *  - Header `X-Branch-Id` = selección actual; solo se honra para quien tenga
 *    el permiso `branches.switch` (ADMIN/gerentes). Se valida en cada request.
 *  - Sin header → HOME. ADMIN sin sucursal y sin header → sucursal por defecto.
 */
@Injectable()
export class BranchContextInterceptor implements NestInterceptor {
  constructor(private readonly branches: BranchesService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest<BranchRequest>();
    if (req.user) {
      req.branchId = await this.resolve(req, req.user);
    }
    return next.handle();
  }

  private async resolve(
    req: BranchRequest,
    user: CurrentUserPayload,
  ): Promise<string | null> {
    const home = user.branchId ?? null;
    const raw = req.headers[BRANCH_HEADER];
    const requested = Array.isArray(raw) ? raw[0] : raw;
    const canSwitch = (user.permissions ?? []).includes(SWITCH_PERMISSION);

    if (requested) {
      if (canSwitch) {
        if (await this.branches.isActiveBranch(requested)) return requested;
        throw new ForbiddenException('Sucursal seleccionada no válida');
      }
      // Sin permiso de cambio: solo puede operar en su propia sucursal.
      if (requested === home) return home;
      throw new ForbiddenException('No tienes acceso a esa sucursal');
    }

    if (home) return home;
    // ADMIN sin sucursal y sin header → sucursal por defecto (Principal).
    return this.branches.getDefaultBranchId();
  }
}
