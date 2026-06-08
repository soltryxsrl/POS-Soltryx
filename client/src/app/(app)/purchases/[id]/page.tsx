'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Ban, PackageCheck } from 'lucide-react';
import { formatDateTime, formatMoney } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { useAuth } from '@/features/auth/application/hooks/use-auth';
import {
  useCancelPurchaseOrder,
  usePurchaseOrder,
} from '@/features/purchases/application/hooks/use-purchases';
import { ReceivePODialog } from '@/features/purchases/ui/components/ReceivePODialog';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  PARTIAL: 'Parcial',
  RECEIVED: 'Recibida',
  CANCELLED: 'Cancelada',
};
const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  PARTIAL: 'bg-blue-100 text-blue-800',
  RECEIVED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-muted text-muted-foreground',
};

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { user } = useAuth();
  const po = usePurchaseOrder(id);
  const cancel = useCancelPurchaseOrder();
  const [showReceive, setShowReceive] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  const canReceive = !!user && user.permissions.includes('purchases.receive');
  const canCancel = !!user && user.permissions.includes('purchases.cancel');

  if (po.isLoading) {
    return <div className="py-12 text-center text-muted-foreground">Cargando orden...</div>;
  }
  if (po.isError || !po.data) {
    return (
      <div className="space-y-2">
        <p className="text-destructive">{getErrorMessage(po.error)}</p>
        <Link href="/purchases" className="text-sm text-primary hover:underline">
          ← Volver
        </Link>
      </div>
    );
  }

  const o = po.data;
  const isPending = o.status === 'PENDING';
  const isPartial = o.status === 'PARTIAL';
  const canReceiveNow = isPending || isPartial;

  return (
    <div className="space-y-6">
      <SectionHeader
        title={`Orden ${o.orderNumber}`}
        description={`Proveedor: ${o.supplierName}`}
        crumbs={[{ label: 'Compras', href: '/purchases' }]}
        actions={
          <div className="flex gap-2">
            {canReceive && canReceiveNow && (
              <Button onClick={() => setShowReceive(true)}>
                <PackageCheck className="mr-2 h-4 w-4" />
                Recibir
              </Button>
            )}
            {canCancel && isPending && (
              <Button variant="outline" onClick={() => setShowCancel(true)}>
                <Ban className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Info
          label="Estado"
          value={
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR[o.status] ?? ''}`}
            >
              {STATUS_LABEL[o.status] ?? o.status}
            </span>
          }
        />
        <Info label="Total" value={formatMoney(o.total)} strong />
        <Info label="Fecha creación" value={formatDateTime(o.createdAt)} />
        <Info
          label="Fecha esperada"
          value={o.expectedDate ? new Date(o.expectedDate).toLocaleDateString('es-DO') : '—'}
        />
        {o.supplierInvoice && (
          <Info label="Factura proveedor" value={o.supplierInvoice} />
        )}
        {o.receivedAt && <Info label="Recibida" value={formatDateTime(o.receivedAt)} />}
        {o.cancelledAt && <Info label="Cancelada" value={formatDateTime(o.cancelledAt)} />}
        {o.cancelReason && <Info label="Motivo cancelación" value={o.cancelReason} />}
      </div>

      <div className="rounded-2xl border bg-card">
        <div className="border-b px-4 py-2.5">
          <h3 className="text-sm font-semibold">Líneas</h3>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Producto</th>
              <th className="px-4 py-2 text-right">Pedido</th>
              <th className="px-4 py-2 text-right">Recibido</th>
              <th className="px-4 py-2 text-right">Costo unit</th>
              <th className="px-4 py-2 text-right">ITBIS %</th>
              <th className="px-4 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {o.items.map((it) => (
              <tr key={it.id} className="border-b last:border-0">
                <td className="px-4 py-2">
                  <div className="font-medium">{it.productNameSnapshot}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {it.productSkuSnapshot}
                  </div>
                </td>
                <td className="px-4 py-2 text-right">{it.orderedQuantity}</td>
                <td className="px-4 py-2 text-right">
                  <span
                    className={
                      parseFloat(it.receivedQuantity) === parseFloat(it.orderedQuantity)
                        ? 'text-emerald-700'
                        : parseFloat(it.receivedQuantity) > 0
                          ? 'text-blue-700'
                          : 'text-muted-foreground'
                    }
                  >
                    {it.receivedQuantity}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">{formatMoney(it.unitCost)}</td>
                <td className="px-4 py-2 text-right">{it.taxRate}%</td>
                <td className="px-4 py-2 text-right font-medium">{formatMoney(it.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t bg-muted/30 text-sm">
            <tr>
              <td className="px-4 py-2 text-right text-xs text-muted-foreground" colSpan={5}>
                Subtotal
              </td>
              <td className="px-4 py-2 text-right">{formatMoney(o.subtotal)}</td>
            </tr>
            <tr>
              <td className="px-4 py-2 text-right text-xs text-muted-foreground" colSpan={5}>
                ITBIS
              </td>
              <td className="px-4 py-2 text-right">{formatMoney(o.taxTotal)}</td>
            </tr>
            <tr>
              <td className="px-4 py-2 text-right font-semibold" colSpan={5}>
                Total
              </td>
              <td className="px-4 py-2 text-right text-base font-bold">
                {formatMoney(o.total)}
              </td>
            </tr>
          </tfoot>
        </table>
        </div>
      </div>

      {o.notes && (
        <div className="rounded-xl border bg-card p-4 text-sm">
          <div className="text-xs font-medium uppercase text-muted-foreground">Notas</div>
          <p className="mt-1 whitespace-pre-wrap">{o.notes}</p>
        </div>
      )}

      {showReceive && <ReceivePODialog po={o} onClose={() => setShowReceive(false)} />}
      {showCancel && (
        <CancelDialog
          poId={o.id}
          onClose={() => setShowCancel(false)}
          mutation={cancel}
        />
      )}
    </div>
  );
}

function Info({
  label,
  value,
  strong,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={'mt-1 ' + (strong ? 'text-lg font-semibold' : 'text-sm font-medium')}>
        {value}
      </div>
    </div>
  );
}

function CancelDialog({
  poId,
  onClose,
  mutation,
}: {
  poId: string;
  onClose: () => void;
  mutation: ReturnType<typeof useCancelPurchaseOrder>;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (reason.trim().length < 3) {
      setError('Indica un motivo (mín. 3 caracteres).');
      return;
    }
    try {
      await mutation.mutateAsync({ id: poId, reason: reason.trim() });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <MaintenanceShell open onClose={onClose} title="Cancelar orden de compra" size="md">
      <form onSubmit={submit} className="space-y-4">
        <FormField label="Motivo" required>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={255}
            placeholder="Ej: Proveedor no podrá entregar a tiempo"
            autoFocus
          />
        </FormField>
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}
        <FormFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cerrar
          </Button>
          <Button type="submit" variant="destructive" disabled={mutation.isPending}>
            {mutation.isPending ? 'Cancelando...' : 'Confirmar cancelación'}
          </Button>
        </FormFooter>
      </form>
    </MaintenanceShell>
  );
}
