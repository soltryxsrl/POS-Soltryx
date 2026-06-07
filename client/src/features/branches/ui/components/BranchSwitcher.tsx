'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Building2, ChevronDown } from 'lucide-react';
import { useAuth } from '@/features/auth/application/hooks/use-auth';
import { useHasPermission } from '@/features/auth/application/hooks/use-auth';
import { useMultiBranch } from '@/features/plan/application/hooks/use-plan';
import { cn } from '@/shared/lib/cn';
import { useBranches } from '../../application/hooks/use-branches';
import { useActiveBranchStore } from '../../application/stores/active-branch.store';

/**
 * Selector de sucursal activa.
 *   - Con permiso `branches.switch` (ADMIN/gerentes): dropdown para cambiar.
 *   - Sin permiso (cajeros): badge de solo lectura con su sucursal.
 * Al cambiar, DESCARTA la caché de datos por-sucursal (para que no quede nada
 * de la sucursal anterior visible) y la vuelve a pedir con el nuevo header
 * `X-Branch-Id`. Conserva las cachés transversales (lista de sucursales, auth)
 * para no parpadear el propio selector.
 */
export function BranchSwitcher({ className }: { className?: string }) {
  const { user } = useAuth();
  const canSwitch = useHasPermission('branches.switch');
  const multiBranch = useMultiBranch();
  const branches = useBranches({ isActive: 'true', limit: 100 });
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const setActiveBranch = useActiveBranchStore((s) => s.setActiveBranch);
  const qc = useQueryClient();

  // Multi-sucursal apagado → no se muestra el selector (opera mono-sucursal).
  if (!multiBranch) return null;

  const items = branches.data?.items ?? [];
  const currentId = activeBranchId ?? user?.branchId ?? null;
  const current = items.find((b) => b.id === currentId) ?? null;

  // Cajero (sin cambio): badge de solo lectura.
  if (!canSwitch) {
    if (!current) return null;
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-2.5 py-1.5 text-xs font-medium text-foreground',
          className,
        )}
        title="Tu sucursal"
      >
        <Building2 className="h-3.5 w-3.5 text-brand-from" />
        <span className="max-w-[140px] truncate">{current.name}</span>
      </div>
    );
  }

  return (
    <div className={cn('relative inline-flex items-center', className)}>
      <Building2 className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-brand-from" />
      <select
        aria-label="Sucursal activa"
        value={currentId ?? ''}
        onChange={(e) => {
          setActiveBranch(e.target.value);
          // Refetch determinista de TODOS los observers activos con el nuevo
          // header X-Branch-Id. `invalidateQueries` (sin filtro) revalida lo
          // activo en pantalla — a diferencia de `removeQueries`, que borraba la
          // caché pero no siempre forzaba el refetch del observer montado (la
          // lista se quedaba con datos de la sucursal anterior). Además, las
          // query-keys por-sucursal (productos, movimientos, transferencias…)
          // incluyen la sucursal activa, así que cambian y refetchean solas.
          void qc.invalidateQueries();
        }}
        className="appearance-none rounded-lg border border-border/60 bg-card py-1.5 pl-8 pr-7 text-xs font-medium text-foreground outline-none transition hover:border-brand-from/40 focus:border-brand-from/60 focus:ring-2 focus:ring-brand-from/20"
      >
        {items.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-muted-foreground" />
    </div>
  );
}
