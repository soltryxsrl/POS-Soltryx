'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getErrorMessage } from '@/shared/lib/error-message';
import { useAuth } from '@/features/auth/application/hooks/use-auth';
import { useCancelSale, useSale } from '@/features/sales/application/hooks/use-sales';
import { Receipt } from '@/features/sales/ui/components/Receipt';
import { printReceipt } from '@/features/sales/ui/components/printReceipt';
import { downloadReceiptPdf } from '@/features/sales/ui/components/receiptPdf';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';

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
  const receiptRef = useRef<HTMLDivElement | null>(null);

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
            onClick={() => downloadReceiptPdf(s)}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Descargar PDF
          </button>
          <button
            type="button"
            onClick={() => printReceipt(receiptRef.current?.querySelector('.receipt') ?? null)}
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

      <div ref={receiptRef}>
        <Receipt sale={s} />
      </div>

      {showCancel && (
        <MaintenanceShell
          open
          onClose={() => setShowCancel(false)}
          title={`Anular venta ${s.saleNumber}`}
          size="md"
        >
          <div className="space-y-4">
            <FormField label="Motivo" required>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                minLength={3}
                maxLength={255}
                placeholder="Ej: cliente devolvió, error del cajero..."
              />
            </FormField>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </p>
            )}

            <FormFooter>
              <Button
                variant="outline"
                onClick={() => setShowCancel(false)}
                disabled={cancel.isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={onCancel}
                disabled={cancel.isPending || reason.length < 3}
              >
                {cancel.isPending ? 'Anulando...' : 'Confirmar anulación'}
              </Button>
            </FormFooter>
          </div>
        </MaintenanceShell>
      )}
    </div>
  );
}
