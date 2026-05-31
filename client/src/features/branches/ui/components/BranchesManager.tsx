'use client';

import { useState, type FormEvent } from 'react';
import { Building2, Copy, Eye, Pencil, Plus, Power, Wallet } from 'lucide-react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Button } from '@/shared/ui/controls/Button';
import { Fab } from '@/shared/ui/controls/Fab';
import { FormField } from '@/shared/ui/controls/FormField';
import { Input } from '@/shared/ui/controls/Input';
import { Select } from '@/shared/ui/controls/Select';
import { useAuth, useHasPermission } from '@/features/auth/application/hooks/use-auth';
import {
  useCashRegisters,
  useCreateCashRegister,
} from '@/features/cash/application/hooks/use-cash';
import {
  useBranches,
  useCloneCatalog,
  useUpdateBranch,
} from '../../application/hooks/use-branches';
import { useActiveBranchStore } from '../../application/stores/active-branch.store';
import type { Branch, CloneCatalogResult } from '../../domain/types';
import { BranchFormDialog } from './BranchFormDialog';

export function BranchesManager() {
  const canCreate = useHasPermission('branches.create');
  const canManage = useHasPermission('branches.update');
  const branches = useBranches({ limit: 100 });
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [viewing, setViewing] = useState<Branch | null>(null);

  const items = branches.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5">Sucursal</th>
              <th className="px-4 py-2.5">Código</th>
              <th className="px-4 py-2.5">RNC</th>
              <th className="px-4 py-2.5 text-right">Activa</th>
              {canManage && <th className="px-4 py-2.5 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {branches.isLoading && (
              <tr>
                <td colSpan={canManage ? 5 : 4} className="px-4 py-6 text-center text-muted-foreground">
                  Cargando...
                </td>
              </tr>
            )}
            {items.map((b) => (
              <BranchRow
                key={b.id}
                branch={b}
                canManage={canManage}
                onView={() => setViewing(b)}
                onEdit={() => setEditing(b)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <CloneCatalogSection />

      <CashRegistersSection />

      {canCreate && (
        <Fab label="Nueva sucursal" onClick={() => setShowCreate(true)} />
      )}
      {showCreate && <BranchFormDialog onClose={() => setShowCreate(false)} />}
      {editing && (
        <BranchFormDialog branch={editing} onClose={() => setEditing(null)} />
      )}
      {viewing && (
        <BranchFormDialog branch={viewing} readOnly onClose={() => setViewing(null)} />
      )}
    </div>
  );
}

/** Fila de sucursal (solo lectura) con acciones Ver / Editar / activar-desactivar. */
function BranchRow({
  branch,
  canManage,
  onView,
  onEdit,
}: {
  branch: Branch;
  canManage: boolean;
  onView: () => void;
  onEdit: () => void;
}) {
  const update = useUpdateBranch(branch.id);
  const [error, setError] = useState<string | null>(null);

  const onToggleActive = async () => {
    setError(null);
    try {
      await update.mutateAsync({ isActive: !branch.isActive });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <tr className="hover:bg-muted/30">
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-2 font-medium text-foreground">
          <Building2 className="h-4 w-4 text-brand-from" />
          {branch.name}
        </span>
      </td>
      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{branch.code}</td>
      <td className="px-4 py-3 text-muted-foreground">{branch.rnc ?? '—'}</td>
      <td className="px-4 py-3 text-right">
        <span
          className={
            branch.isActive
              ? 'inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground'
          }
        >
          {branch.isActive ? 'Activa' : 'Inactiva'}
        </span>
      </td>
      {canManage && (
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-0.5">
            <button
              type="button"
              title="Ver"
              aria-label="Ver"
              onClick={onView}
              className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Editar"
              aria-label="Editar"
              onClick={onEdit}
              className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onToggleActive}
              disabled={update.isPending}
              title={branch.isActive ? 'Desactivar' : 'Activar'}
              aria-label={branch.isActive ? 'Desactivar' : 'Activar'}
              className={
                'rounded-md p-1.5 transition hover:bg-muted disabled:opacity-50 ' +
                (branch.isActive ? 'text-amber-600' : 'text-emerald-600')
              }
            >
              <Power className="h-4 w-4" />
            </button>
          </div>
          {error && <p className="mt-1 text-right text-xs text-destructive">{error}</p>}
        </td>
      )}
    </tr>
  );
}

/**
 * Copia el catálogo (categorías + productos simples) de OTRA sucursal a la
 * sucursal activa. Útil para arrancar una sucursal nueva, que nace vacía bajo el
 * modelo de catálogo separado. Productos con variantes/kits se omiten.
 */
function CloneCatalogSection() {
  const { user } = useAuth();
  const canManage = !!user?.roles.some((r) => r === 'ADMIN' || r === 'MANAGER');
  const branches = useBranches({ limit: 100 });
  const clone = useCloneCatalog();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const [sourceId, setSourceId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CloneCatalogResult | null>(null);

  if (!canManage) return null;

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
    <div className="space-y-3 pt-2">
      <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
        <Copy className="h-4 w-4 text-brand-from" />
        Copiar catálogo a la sucursal activa:{' '}
        <span className="text-brand-from">{activeName}</span>
      </h2>

      <form
        onSubmit={onClone}
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
      >
        <FormField label="Copiar desde" required>
          <Select
            required
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className="w-56"
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
        <Button type="submit" disabled={clone.isPending || !sourceId}>
          <Copy className="h-4 w-4" />
          {clone.isPending ? 'Copiando...' : 'Copiar catálogo'}
        </Button>
        <p className="w-full text-xs text-muted-foreground">
          Copia categorías, productos (simples, con variantes y kits), variantes,
          códigos de barras y recetas de kit, con stock en 0.
        </p>
        {error && <p className="w-full text-sm text-destructive">{error}</p>}
        {result && (
          <div className="w-full space-y-1">
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Listo: {result.categoriesCreated} categoría(s), {result.productsCreated}{' '}
              producto(s)
              {result.variantsCreated > 0 ? `, ${result.variantsCreated} variante(s)` : ''}
              {result.kitComponentsCreated > 0
                ? `, ${result.kitComponentsCreated} componente(s) de kit`
                : ''}{' '}
              copiados
              {result.skipped > 0 ? `, ${result.skipped} producto(s) ya existente(s)` : ''}.
            </p>
            {(result.barcodesSkipped > 0 || result.kitComponentsSkipped > 0) && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Aviso:
                {result.barcodesSkipped > 0
                  ? ` ${result.barcodesSkipped} código(s) de barras se omitieron (ya existían en destino).`
                  : ''}
                {result.kitComponentsSkipped > 0
                  ? ` ${result.kitComponentsSkipped} componente(s) de kit no se pudieron copiar (producto borrado en origen).`
                  : ''}
              </p>
            )}
          </div>
        )}
      </form>
    </div>
  );
}

/**
 * Cajas registradoras de la SUCURSAL ACTIVA (la del selector). Para operar una
 * sucursal nueva hace falta al menos una caja: sin caja no se puede abrir turno.
 */
function CashRegistersSection() {
  const { user } = useAuth();
  const canManage = !!user?.roles.some((r) => r === 'ADMIN' || r === 'MANAGER');
  const registers = useCashRegisters();
  const createReg = useCreateCashRegister();
  const branches = useBranches({ limit: 100 });
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const [regName, setRegName] = useState('');
  const [regError, setRegError] = useState<string | null>(null);

  const currentId = activeBranchId ?? user?.branchId ?? null;
  const activeName =
    branches.data?.items.find((b) => b.id === currentId)?.name ?? 'actual';

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setRegError(null);
    try {
      await createReg.mutateAsync({ name: regName.trim() });
      setRegName('');
    } catch (err) {
      setRegError(getErrorMessage(err));
    }
  };

  const items = registers.data ?? [];

  return (
    <div className="space-y-3 pt-2">
      <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
        <Wallet className="h-4 w-4 text-brand-from" />
        Cajas de la sucursal activa:{' '}
        <span className="text-brand-from">{activeName}</span>
      </h2>

      {canManage && (
        <form
          onSubmit={onCreate}
          className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
        >
          <FormField label="Nueva caja" required>
            <Input
              required
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="Ej: Caja 2"
              className="w-56"
            />
          </FormField>
          <Button type="submit" disabled={createReg.isPending || !regName.trim()}>
            <Plus className="h-4 w-4" />
            {createReg.isPending ? 'Creando...' : 'Crear caja'}
          </Button>
          {regError && <p className="w-full text-sm text-destructive">{regError}</p>}
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5">Caja</th>
              <th className="px-4 py-2.5">Código</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {registers.isLoading && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">
                  Cargando...
                </td>
              </tr>
            )}
            {!registers.isLoading && items.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">
                  Esta sucursal no tiene cajas.{canManage ? ' Crea una arriba.' : ''}
                </td>
              </tr>
            )}
            {items.map((r) => (
              <tr key={r.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {r.code}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
