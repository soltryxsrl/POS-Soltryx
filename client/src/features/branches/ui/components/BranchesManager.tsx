'use client';

import { useState } from 'react';
import { Building2, Copy, Eye, Pencil, Power } from 'lucide-react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/controls/Button';
import { Fab } from '@/shared/ui/controls/Fab';
import { StatusFilter } from '@/shared/ui/controls/StatusFilter';
import { DataTable, type DataTableColumn } from '@/shared/ui/data-table';
import { usePlan } from '@/features/plan/application/hooks/use-plan';
import { PlanUsageBadge } from '@/features/plan/ui/PlanUsageBadge';
import { useAuth, useHasPermission } from '@/features/auth/application/hooks/use-auth';
import { useCashRegisters } from '@/features/cash/application/hooks/use-cash';
import type { CashRegister } from '@/features/cash/domain/types';
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
  const [status, setStatus] = useState<'true' | 'false' | undefined>('true');
  const [groupBy, setGroupBy] = useState<string | undefined>();
  const [groupDir, setGroupDir] = useState<'asc' | 'desc'>('asc');
  const branches = useBranches({ limit: 100, isActive: status });
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [viewing, setViewing] = useState<Branch | null>(null);
  const [showClone, setShowClone] = useState(false);
  const plan = usePlan();
  const atBranchCap =
    plan.data?.maxBranches != null && plan.data.usedBranches >= plan.data.maxBranches;

  const items = branches.data?.items ?? [];

  const columns: DataTableColumn<Branch>[] = [
    {
      key: 'name',
      header: 'Sucursal',
      render: (b) => (
        <span className="inline-flex items-center gap-2 font-medium text-foreground">
          <Building2 className="h-4 w-4 text-brand-from" />
          {b.name}
        </span>
      ),
    },
    {
      key: 'code',
      header: 'Código',
      cellClassName: 'font-mono text-xs text-muted-foreground',
      render: (b) => b.code,
    },
    {
      key: 'rnc',
      header: 'RNC',
      cellClassName: 'text-muted-foreground',
      render: (b) => b.rnc ?? '—',
    },
    {
      key: 'isActive',
      header: 'Activa',
      align: 'right',
      grouping: {
        key: (b) => (b.isActive ? 'true' : 'false'),
        label: (key) => (
          <span
            className={
              key === 'true'
                ? 'inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground'
            }
          >
            {key === 'true' ? 'Activa' : 'Inactiva'}
          </span>
        ),
        sortValue: (key) => (key === 'true' ? 'Activa' : 'Inactiva'),
      },
      render: (b) => (
        <span
          className={
            b.isActive
              ? 'inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground'
          }
        >
          {b.isActive ? 'Activa' : 'Inactiva'}
        </span>
      ),
    },
    ...(canManage
      ? ([
          {
            key: 'actions',
            header: 'Acciones',
            align: 'right',
            render: (b) => (
              <BranchActions branch={b} onView={() => setViewing(b)} onEdit={() => setEditing(b)} />
            ),
          },
        ] satisfies DataTableColumn<Branch>[])
      : []),
  ];

  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusFilter
          value={status}
          onChange={(v) => setStatus(v as 'true' | 'false' | undefined)}
        />
        {plan.data && (
          <PlanUsageBadge
            used={plan.data.usedBranches}
            max={plan.data.maxBranches}
            noun="Sucursales"
          />
        )}
      </div>
      {isAdminOrManager && (
        <Button variant="outline" onClick={() => setShowClone(true)}>
          <Copy className="h-4 w-4" />
          Copiar catálogo
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <DataTable<Branch>
        columns={columns}
        rows={items}
        total={branches.data?.total ?? items.length}
        rowKey={(b) => b.id}
        page={1}
        pageSize={Math.max(items.length, 25)}
        onPageChange={() => undefined}
        groupBy={groupBy}
        groupDir={groupDir}
        onGroupByChange={setGroupBy}
        onGroupDirChange={setGroupDir}
        isLoading={branches.isLoading}
        isFetching={branches.isFetching}
        errorMessage={branches.isError ? getErrorMessage(branches.error) : null}
        toolbar={toolbar}
        emptyState={
          status === 'false'
            ? 'No hay sucursales inactivas.'
            : status === 'true'
            ? 'No hay sucursales activas.'
            : 'No hay sucursales.'
        }
      />

      {canCreate && (
        <Fab
          label="Nueva sucursal"
          disabled={atBranchCap}
          title={
            atBranchCap
              ? `Alcanzaste el límite de tu plan (${plan.data?.maxBranches} sucursales). Contacta a Soltryx para ampliarlo.`
              : 'Nueva sucursal'
          }
          onClick={() => setShowCreate(true)}
        />
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

/**
 * Acciones por fila de una sucursal: Ver / Editar / activar-desactivar.
 *
 * Vive como componente propio (no como render() de columna) porque el toggle
 * usa el hook por-fila useUpdateBranch(branch.id), y los hooks no pueden
 * llamarse dentro de la función render() de una columna del DataTable.
 */
function BranchActions({
  branch,
  onView,
  onEdit,
}: {
  branch: Branch;
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
    <>
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
    </>
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

  const columns: DataTableColumn<CashRegister>[] = [
    {
      key: 'name',
      header: 'Caja',
      cellClassName: 'font-medium text-foreground',
      render: (r) => r.name,
    },
    {
      key: 'code',
      header: 'Código',
      cellClassName: 'font-mono text-xs text-muted-foreground',
      render: (r) => r.code,
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Cajas de la sucursal activa:{' '}
        <span className="font-medium text-brand-from">{activeName}</span>. Cada
        sucursal necesita al menos una caja para poder abrir turno.
      </p>

      <DataTable<CashRegister>
        columns={columns}
        rows={items}
        total={items.length}
        rowKey={(r) => r.id}
        page={1}
        pageSize={Math.max(items.length, 25)}
        onPageChange={() => undefined}
        isLoading={registers.isLoading}
        isFetching={registers.isFetching}
        emptyState={
          <>
            Esta sucursal no tiene cajas.
            {isAdminOrManager ? ' Crea una con el botón +.' : ''}
          </>
        }
      />

      {isAdminOrManager && (
        <Fab label="Nueva caja" onClick={() => setShowCreate(true)} />
      )}
      {showCreate && (
        <CashRegisterFormDialog branchName={activeName} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
