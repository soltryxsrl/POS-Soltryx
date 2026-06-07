'use client';

import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { useAuth } from '@/features/auth/application/hooks/use-auth';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Select } from '@/shared/ui/controls/Select';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import { useBranches, useCloneCatalog } from '../../application/hooks/use-branches';
import { useActiveBranchStore } from '../../application/stores/active-branch.store';
import type { CloneCatalogResult } from '../../domain/types';

interface Props {
  onClose: () => void;
}

/**
 * Copia el catálogo de OTRA sucursal hacia la sucursal activa (con stock en 0).
 * Útil para arrancar una sucursal nueva bajo el modelo de catálogo separado.
 */
export function CloneCatalogDialog({ onClose }: Props) {
  const { user } = useAuth();
  const branches = useBranches({ limit: 100 });
  const clone = useCloneCatalog();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const [sourceId, setSourceId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CloneCatalogResult | null>(null);

  const currentId = activeBranchId ?? user?.branchId ?? null;
  const activeName =
    branches.data?.items.find((b) => b.id === currentId)?.name ?? 'actual';
  const sources = (branches.data?.items ?? []).filter((b) => b.id !== currentId);

  const onClone = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    try {
      const res = await clone.mutateAsync(sourceId);
      setResult(res);
      setSourceId('');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <MaintenanceShell open onClose={onClose} title="Copiar catálogo" size="md">
      <form onSubmit={onClone} className="space-y-5">
        <p className="text-xs text-muted-foreground">
          Copia categorías, productos (simples, con variantes y kits), variantes,
          códigos de barras y recetas de kit —con stock en 0— hacia la sucursal
          activa: <span className="font-medium text-brand-from">{activeName}</span>.
        </p>

        <FormField label="Copiar desde" required>
          <Select
            required
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
          >
            <option value="" disabled>
              Selecciona una sucursal…
            </option>
            {sources.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </FormField>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}
        {result && (
          <div className="space-y-1 rounded-xl border border-emerald-200/60 bg-emerald-50 p-3 text-sm dark:border-emerald-800/50 dark:bg-emerald-950/30">
            <p className="text-emerald-700 dark:text-emerald-300">
              Listo: {result.categoriesCreated} categoría(s), {result.productsCreated}{' '}
              producto(s)
              {result.variantsCreated > 0 ? `, ${result.variantsCreated} variante(s)` : ''}
              {result.kitComponentsCreated > 0
                ? `, ${result.kitComponentsCreated} componente(s) de kit`
                : ''}{' '}
              copiados
              {result.skipped > 0 ? `, ${result.skipped} ya existente(s)` : ''}.
            </p>
            {(result.barcodesSkipped > 0 || result.kitComponentsSkipped > 0) && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Aviso:
                {result.barcodesSkipped > 0
                  ? ` ${result.barcodesSkipped} código(s) de barras omitidos (ya existían).`
                  : ''}
                {result.kitComponentsSkipped > 0
                  ? ` ${result.kitComponentsSkipped} componente(s) de kit no copiados (producto borrado en origen).`
                  : ''}
              </p>
            )}
          </div>
        )}

        <FormFooter>
          <Button variant="outline" onClick={onClose} disabled={clone.isPending}>
            {result ? 'Cerrar' : 'Cancelar'}
          </Button>
          <Button type="submit" disabled={clone.isPending || !sourceId}>
            {clone.isPending ? 'Copiando...' : 'Copiar catálogo'}
          </Button>
        </FormFooter>
      </form>
    </MaintenanceShell>
  );
}
