'use client';

import { useState, type ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Button } from '@/shared/ui/controls/Button';
import { Fab } from '@/shared/ui/controls/Fab';
import { DataTable, type DataTableColumn } from '@/shared/ui/data-table';
import { useAuth, useHasPermission } from '@/features/auth/application/hooks/use-auth';
import { useActiveBranchStore } from '@/features/branches/application/stores/active-branch.store';
import {
  useCancelStockTransfer,
  useReceiveStockTransfer,
  useStockTransfers,
} from '@/features/stock-transfers/application/hooks/use-stock-transfers';
import { TransferFormDialog } from '@/features/stock-transfers/ui/components/TransferFormDialog';
import type { StockTransfer, StockTransferStatus } from '@/features/stock-transfers/domain/types';

const GROUP_FETCH_CAP = 2000;

const STATUS: Record<StockTransferStatus, { label: string; cls: string }> = {
  IN_TRANSIT: { label: 'En tránsito', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
  RECEIVED: { label: 'Recibida', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  CANCELLED: { label: 'Cancelada', cls: 'bg-muted text-muted-foreground' },
};

export default function TransferenciasPage() {
  const canManage = useHasPermission('inventory.adjust');
  const { user } = useAuth();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const active = activeBranchId ?? user?.branchId ?? null;
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="flex h-[calc(100vh-6.5rem)] min-h-[480px] flex-col">
      <TransfersList active={active} canManage={canManage} fillHeight title="Transferencias de stock" />

      {canManage && (
        <Fab label="Nueva transferencia" onClick={() => setShowCreate(true)} />
      )}
      {showCreate && (
        <TransferFormDialog active={active} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}

function TransfersList({
  active,
  canManage,
  fillHeight,
  title,
}: {
  active: string | null;
  canManage: boolean;
  fillHeight?: boolean;
  title?: ReactNode;
}) {
  const [groupBy, setGroupBy] = useState<string | undefined>();
  const [groupDir, setGroupDir] = useState<'asc' | 'desc'>('asc');
  // Al agrupar traemos el dataset completo (hasta el tope) para que los grupos y
  // subtotales sean correctos; sin agrupar, la vista normal de 100.
  const transfers = useStockTransfers({ fetchAll: !!groupBy, cap: GROUP_FETCH_CAP });
  const receive = useReceiveStockTransfer();
  const cancel = useCancelStockTransfer();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const items = transfers.data?.items ?? [];

  const act = async (fn: () => Promise<unknown>, id: string) => {
    setErr(null);
    setBusyId(id);
    try {
      await fn();
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const columns: DataTableColumn<StockTransfer>[] = [
    {
      key: 'transferNumber',
      header: 'N°',
      render: (t) => <span className="font-mono text-xs">{t.transferNumber}</span>,
    },
    {
      key: 'route',
      header: 'Ruta',
      render: (t) => (
        <span className="inline-flex items-center gap-1.5 text-xs">
          {t.sourceBranchName ?? '—'} <ArrowRight className="h-3 w-3 text-muted-foreground" /> {t.destBranchName ?? '—'}
        </span>
      ),
    },
    {
      key: 'items',
      header: 'Ítems',
      align: 'right',
      aggregate: (rows) => {
        const sum = rows.reduce((acc, t) => acc + t.items.length, 0);
        return <span className="font-medium">{sum}</span>;
      },
      render: (t) => <span className="text-muted-foreground">{t.items.length}</span>,
    },
    {
      key: 'status',
      header: 'Estado',
      grouping: {
        key: (t) => t.status,
        label: (key) => {
          const s = STATUS[key as StockTransferStatus];
          return (
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${s?.cls ?? ''}`}>
              {s?.label ?? key}
            </span>
          );
        },
        sortValue: (key) => STATUS[key as StockTransferStatus]?.label ?? key,
      },
      render: (t) => (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS[t.status].cls}`}>
          {STATUS[t.status].label}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      render: (t) => {
        const canReceive = canManage && t.status === 'IN_TRANSIT' && t.destBranchId === active;
        const canCancel = canManage && t.status === 'IN_TRANSIT' && t.sourceBranchId === active;
        if (!canReceive && !canCancel) return null;
        return (
          <div className="flex items-center justify-end gap-2">
            {canReceive && (
              <Button variant="outline" disabled={busyId === t.id} onClick={() => act(() => receive.mutateAsync(t.id), t.id)}>
                Recibir
              </Button>
            )}
            {canCancel && (
              <Button variant="ghost" className="text-amber-600" disabled={busyId === t.id} onClick={() => act(() => cancel.mutateAsync({ id: t.id }), t.id)}>
                Cancelar
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DataTable<StockTransfer>
        columns={columns}
        rows={items}
        total={groupBy ? (transfers.data?.total ?? items.length) : items.length}
        rowKey={(t) => t.id}
        page={1}
        pageSize={Math.max(items.length, 25)}
        onPageChange={() => undefined}
        groupBy={groupBy}
        groupDir={groupDir}
        onGroupByChange={setGroupBy}
        onGroupDirChange={setGroupDir}
        isLoading={transfers.isLoading}
        isFetching={transfers.isFetching}
        errorMessage={transfers.isError ? getErrorMessage(transfers.error) : null}
        emptyState="Sin transferencias."
        title={title}
        fillHeight={fillHeight}
      />
      {err && <p className="px-1 pt-2 text-sm text-destructive">{err}</p>}
    </>
  );
}
