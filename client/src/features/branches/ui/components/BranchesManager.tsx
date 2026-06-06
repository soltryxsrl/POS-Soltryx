'use client';

import { useState } from 'react';
import { Building2, Copy, Eye, Pencil, Power } from 'lucide-react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/controls/Button';
import { Fab } from '@/shared/ui/controls/Fab';
import { StatusFilter } from '@/shared/ui/controls/StatusFilter';
import { useAuth, useHasPermission } from '@/features/auth/application/hooks/use-auth';
import { useCashRegisters } from '@/features/cash/application/hooks/use-cash';
import { CashRegisterFormDialog } from '@/features/cash/ui/components/CashRegisterFormDialog';
import { useBranches, useUpdateBranch } from '../../application/hooks/use-branches';
import { useActiveBranchStore } from '../../application/stores/active-branch.store';
import type { Branch } from '../../domain/types';
import { BranchFormDialog } from './BranchFormDialog';
import { CloneCatalogDialog } from './CloneCatalogDialog';

type Tab = 'sucursales' | 'cajas';

export function BranchesManager() {
  const [tab, setTab] = useState<Tab>('sucursales');

  return (
    <div className="space-y-4">
      <TabBar value={tab} onChange={setTab} />
      {tab === 'sucursales' ? <SucursalesTab /> : <CajasTab />}
    </div>
  );
}

function TabBar({ value, onChange }: { value: Tab; onChange: (t: Tab) => void }) {
  const tabs: { value: Tab; label: string }[] = [
    { value: 'sucursales', label: 'Sucursales' },
    { value: 'cajas', label: 'Cajas registradoras' },
  ];
  return (
    <div
      role="tablist"
      aria-label="Secciones de sucursales"
      className="inline-flex gap-1 rounded-xl border border-border/60 bg-card p-1"
    >
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              'rounded-lg px-4 py-1.5 text-sm font-medium transition',
              active
                ? 'bg-gradient-to-r from-brand-from to-brand-to text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function SucursalesTab() {
  const { user } = useAuth();
  const canCreate = useHasPermission('branches.create');
  const canManage = useHasPermission('branches.update');
  const isAdminOrManager = !!user?.roles.some((r) => r === 'ADMIN' || r === 'MANAGER');
  const [status, setStatus] = useState<'true' | 'false' | undefined>(undefined);
  const branches = useBranches({ limit: 100, isActive: status });
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [viewing, setViewing] = useState<Branch | null>(null);
  const [showClone, setShowClone] = useState(false);

  const items = branches.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusFilter
          value={status}
          onChange={(v) => setStatus(v as 'true' | 'false' | undefined)}
        />
        {isAdminOrManager && (
          <Button variant="outline" onClick={() => setShowClone(true)}>
            <Copy className="h-4 w-4" />
            Copiar catálogo
          </Button>
        )}
      </div>

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
            {!branches.isLoading && items.length === 0 && (
              <tr>
                <td colSpan={canManage ? 5 : 4} className="px-4 py-6 text-center text-muted-foreground">
                  {status === 'false'
                    ? 'No hay sucursales inactivas.'
                    : status === 'true'
                    ? 'No hay sucursales activas.'
                    : 'No hay sucursales.'}
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
      {showClone && <CloneCatalogDialog onClose={() => setShowClone(false)} />}
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
 * Cajas registradoras de la SUCURSAL ACTIVA (la del selector). Para operar una
 * sucursal nueva hace falta al menos una caja: sin caja no se puede abrir turno.
 */
function CajasTab() {
  const { user } = useAuth();
  const isAdminOrManager = !!user?.roles.some((r) => r === 'ADMIN' || r === 'MANAGER');
  const registers = useCashRegisters();
  const branches = useBranches({ limit: 100 });
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const [showCreate, setShowCreate] = useState(false);

  const currentId = activeBranchId ?? user?.branchId ?? null;
  const activeName =
    branches.data?.items.find((b) => b.id === currentId)?.name ?? 'actual';
  const items = registers.data ?? [];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Cajas de la sucursal activa:{' '}
        <span className="font-medium text-brand-from">{activeName}</span>. Cada
        sucursal necesita al menos una caja para poder abrir turno.
      </p>

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
                  Esta sucursal no tiene cajas.
                  {isAdminOrManager ? ' Crea una con el botón +.' : ''}
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

      {isAdminOrManager && (
        <Fab label="Nueva caja" onClick={() => setShowCreate(true)} />
      )}
      {showCreate && (
        <CashRegisterFormDialog branchName={activeName} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
