'use client';

import { useState, type FormEvent } from 'react';
import { ArrowRight, Plus, Trash2 } from 'lucide-react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { formatQuantity } from '@/shared/lib/format';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { Input } from '@/shared/ui/controls/Input';
import { Select } from '@/shared/ui/controls/Select';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';
import { useAuth, useHasPermission } from '@/features/auth/application/hooks/use-auth';
import { useBranches } from '@/features/branches/application/hooks/use-branches';
import { useActiveBranchStore } from '@/features/branches/application/stores/active-branch.store';
import { useProducts } from '@/features/products/application/hooks/use-products';
import {
  useCancelStockTransfer,
  useCreateStockTransfer,
  useReceiveStockTransfer,
  useStockTransfers,
} from '@/features/stock-transfers/application/hooks/use-stock-transfers';
import type { StockTransferStatus } from '@/features/stock-transfers/domain/types';

const STATUS: Record<StockTransferStatus, { label: string; cls: string }> = {
  IN_TRANSIT: { label: 'En tránsito', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
  RECEIVED: { label: 'Recibida', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  CANCELLED: { label: 'Cancelada', cls: 'bg-muted text-muted-foreground' },
};

interface Line {
  productId: string;
  name: string;
  sku: string;
  stock: string;
  quantity: string;
}

export default function TransferenciasPage() {
  const canManage = useHasPermission('inventory.adjust');
  const { user } = useAuth();
  const activeBranchId = useActiveBranchStore((s) => s.activeBranchId);
  const active = activeBranchId ?? user?.branchId ?? null;
  const branches = useBranches({ isActive: 'true', limit: 100 });
  const create = useCreateStockTransfer();

  const [destBranchId, setDestBranchId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const destOptions = (branches.data?.items ?? []).filter((b) => b.id !== active);
  const found = useProducts({ q: search.trim() || undefined, type: 'simple', limit: 8 });

  const addLine = (p: { id: string; name: string; sku: string; stock: string }) => {
    if (lines.some((l) => l.productId === p.id)) return;
    setLines((prev) => [...prev, { productId: p.id, name: p.name, sku: p.sku, stock: p.stock, quantity: '1' }]);
    setSearch('');
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!destBranchId) return setError('Selecciona la sucursal destino.');
    if (lines.length === 0) return setError('Agrega al menos un producto.');
    try {
      await create.mutateAsync({
        destBranchId,
        notes: notes.trim() || undefined,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      });
      setLines([]);
      setNotes('');
      setDestBranchId('');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Transferencias de stock" />

      {canManage && (
        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <FormField label="Enviar a sucursal" required>
              <Select value={destBranchId} onChange={(e) => setDestBranchId(e.target.value)} className="w-56" required>
                <option value="" disabled>Selecciona…</option>
                {destOptions.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Buscar producto (de esta sucursal)">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre o SKU…" className="w-64" />
            </FormField>
          </div>

          {search.trim() && (
            <div className="rounded-xl border border-border">
              {(found.data?.items ?? []).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addLine(p)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/40"
                >
                  <span>{p.name} <span className="text-xs text-muted-foreground">{p.sku}</span></span>
                  <span className="text-xs text-muted-foreground">stock {formatQuantity(p.stock)}</span>
                </button>
              ))}
              {found.data?.items.length === 0 && (
                <p className="px-3 py-2 text-sm text-muted-foreground">Sin productos simples.</p>
              )}
            </div>
          )}

          {lines.length > 0 && (
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Producto</th>
                  <th className="px-3 py-2 text-right">Stock</th>
                  <th className="px-3 py-2 text-right">Cantidad</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={l.productId} className="border-b last:border-0">
                    <td className="px-3 py-2">{l.name} <span className="text-xs text-muted-foreground">{l.sku}</span></td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{formatQuantity(l.stock)}</td>
                    <td className="px-3 py-2 text-right">
                      <Input
                        inputMode="decimal"
                        value={l.quantity}
                        onChange={(e) =>
                          setLines((prev) => prev.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))
                        }
                        className="w-24 text-right"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))} title="Quitar">
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="flex items-center gap-3">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas (opcional)" className="flex-1" />
            <Button type="submit" disabled={create.isPending || !destBranchId || lines.length === 0}>
              <Plus className="h-4 w-4" />
              {create.isPending ? 'Enviando…' : 'Enviar transferencia'}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      )}

      <TransfersList active={active} canManage={canManage} />
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
