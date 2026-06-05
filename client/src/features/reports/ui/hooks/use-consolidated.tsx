'use client';

import { useState } from 'react';
import { useHasPermission } from '@/features/auth/application/hooks/use-auth';
import { Switch } from '@/shared/ui/controls/Switch';

/**
 * Estado del toggle "Consolidado (todas las sucursales)" para una página de
 * reporte. Solo quien tiene `branches.switch` puede consolidar; para el resto,
 * `branchId` queda undefined (su sucursal activa) y no se muestra el toggle.
 *
 * Devuelve `branchId` ('all' | undefined) para pasar al reporte y el nodo del
 * toggle para incluir en la barra de filtros.
 */
export function useConsolidated() {
  const canConsolidate = useHasPermission('branches.switch');
  const [allBranches, setAllBranches] = useState(false);
  const branchId = canConsolidate && allBranches ? 'all' : undefined;
  const toggle = canConsolidate ? (
    <Switch
      checked={allBranches}
      onChange={setAllBranches}
      label="Consolidado (todas las sucursales)"
    />
  ) : null;
  return { branchId, toggle, canConsolidate };
}
