'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getErrorMessage } from '@/shared/lib/error-message';
import { useAuth } from '@/features/auth/application/hooks/use-auth';
import { useCancelSale, useSale } from '@/features/sales/application/hooks/use-sales';
import { Receipt } from '@/features/sales/ui/components/Receipt';

export default function SaleDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const sale = useSale(id);
  const cancel = useCancelSale();
  const { user } = useAuth();
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canCancel = !!user && (user.roles.includes('ADMIN') || user.roles.includes('MANAGER'));

  if (sale.isLoading) {
    return <div className="py-12 text-center text-muted-foreground">Cargando venta...</div>;
  }
  if (sale.isError || !sale.data) {
    return (
      <div className="space-y-3">
        <p className="text-destructive">{getErrorMessage(sale.error)}</p>
        <Link href="/dashboard/sales" className="text-sm text-primary hover:underline">
          ← Volver a ventas
        </Link>
      </div>
    );
  }
  const s = sale.data;

  const onCancel = async () => {
    setError(null);
    try {
      await cancel.mutateAsync({ id: s.id, reason });
      setShowCancel(false);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/sales"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Ventas
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Venta {s.saleNumber}
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Imprimir
          </button>
          {canCancel && s.status === 'COMPLETED' && (
            <button
              type="button"
              onClick={() => setShowCancel(true)}
              className="rounded-md bg-destructive px-3 py-1.5 text-sm text-destructive-foreground hover:bg-destructive/90"
            >
              Anular venta
            </button>
          )}
        </div>
      </div>

      <Receipt sale={s} />

      {showCancel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowCancel(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Anular venta {s.saleNumber}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              El stock se restituirá automáticamente. Esta acción es irreversible.
            </p>
            <div className="mt-4 space-y-1.5">
              <label className="text-sm font-medium">Motivo</label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                minLength={3}
                maxLength={255}
                placeholder="Ej: cliente devolvió, error del cajero..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            {error && (
              <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCancel(false)}
                className="rounded-md border px-4 py-2 text-sm transition hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={cancel.isPending || reason.length < 3}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition hover:bg-destructive/90 disabled:opacity-50"
              >
                {cancel.isPending ? 'Anulando...' : 'Confirmar anulación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
