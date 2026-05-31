'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Building2, ChevronDown } from 'lucide-react';
import { useAuth } from '@/features/auth/application/hooks/use-auth';
import { useHasPermission } from '@/features/auth/application/hooks/use-auth';
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
  const branches = useBranches({ isActive: 'true', limit: 100 });
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const setActiveBranch = useActiveBranchStore((s) => s.setActiveBranch);
  const qc = useQueryClient();

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
          // Eliminar SOLO la caché de datos por-sucursal (productos, ventas,
          // caja, reportes, fiscal, etc.) para que no quede nada de la sucursal
          // anterior. Conservamos las cachés TRANSVERSALES (lista de sucursales,
          // y catálogos globales: config del negocio, monedas, métodos de pago,
          // tipos de ITBIS) para no refetchearlas en vano ni parpadear el logo.
          // El recibo por-sucursal ya está keyeado por activeBranchId y se
          // refresca solo. Los observers activos refetchean con el nuevo header.
          const KEEP = new Set([
            'branches',
            'config',
            'currencies',
            'payment-methods',
            'tax-types',
          ]);
          qc.removeQueries({
            predicate: (query) => {
              const root = Array.isArray(query.queryKey)
                ? (query.queryKey[0] as string)
                : (query.queryKey as unknown as string);
              return !KEEP.has(root);
            },
          });
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
