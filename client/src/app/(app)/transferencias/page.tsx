'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Button } from '@/shared/ui/controls/Button';
import { Fab } from '@/shared/ui/controls/Fab';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';
import { useAuth, useHasPermission } from '@/features/auth/application/hooks/use-auth';
import { useActiveBranchStore } from '@/features/branches/application/stores/active-branch.store';
import {
  useCancelStockTransfer,
  useReceiveStockTransfer,
  useStockTransfers,
} from '@/features/stock-transfers/application/hooks/use-stock-transfers';
import { TransferFormDialog } from '@/features/stock-transfers/ui/components/TransferFormDialog';
import type { StockTransferStatus } from '@/features/stock-transfers/domain/types';

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
    <div className="space-y-6">
      <SectionHeader title="Transferencias de stock" />

      <TransfersList active={active} canManage={canManage} />

      {canManage && (
        <Fab label="Nueva transferencia" onClick={() => setShowCreate(true)} />
      )}
      {showCreate && (
        <TransferFormDialog active={active} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}

function TransfersList({ active, canManage }: { active: string | null; canManage: boolean }) {
  const transfers = useStockTransfers();
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

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5">N°</th>
            <th className="px-4 py-2.5">Ruta</th>
            <th className="px-4 py-2.5 text-right">Ítems</th>
            <th className="px-4 py-2.5">Estado</th>
            <th className="px-4 py-2.5 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {transfers.isLoading && (
            <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Cargando…</td></tr>
          )}
          {!transfers.isLoading && items.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Sin transferencias.</td></tr>
          )}
          {items.map((t) => {
            const canReceive = canManage && t.status === 'IN_TRANSIT' && t.destBranchId === active;
            const canCancel = canManage && t.status === 'IN_TRANSIT' && t.sourceBranchId === active;
            return (
              <tr key={t.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs">{t.transferNumber}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    {t.sourceBranchName ?? '—'} <ArrowRight className="h-3 w-3 text-muted-foreground" /> {t.destBranchName ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">{t.items.length}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS[t.status].cls}`}>
                    {STATUS[t.status].label}
                  </span>
                </td>
                <td className="px-4 py-3">
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
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {err && <p className="px-4 py-2 text-sm text-destructive">{err}</p>}
    </div>
  );
}
