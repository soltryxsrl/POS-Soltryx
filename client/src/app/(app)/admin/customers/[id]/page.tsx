'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowDownLeft, ArrowUpRight, Pencil, RotateCcw, Wallet } from 'lucide-react';
import { formatDateTime, formatMoney } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { useAuth } from '@/features/auth/application/hooks/use-auth';
import {
  useAccountSummary,
  useCustomer,
} from '@/features/customers/application/hooks/use-customers';
import { AbonoDialog } from '@/features/customers/ui/components/AbonoDialog';
import { CustomerFormDialog } from '@/features/customers/ui/components/CustomerFormDialog';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';
import type { AccountEntryType } from '@/features/customers/domain/types';

const TYPE_LABEL: Record<AccountEntryType, string> = {
  CHARGE: 'Cargo (crédito)',
  PAYMENT: 'Abono',
  REVERSAL: 'Anulación',
};

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { user } = useAuth();
  const customer = useCustomer(id);
  const account = useAccountSummary(id);
  const [showEdit, setShowEdit] = useState(false);
  const [showAbono, setShowAbono] = useState(false);

  const canPay = !!user && user.permissions.includes('account.payment');
  const canEdit = !!user && user.permissions.includes('customers.update');

  if (customer.isLoading) {
    return <div className="py-12 text-center text-muted-foreground">Cargando cliente...</div>;
  }
  if (customer.isError || !customer.data) {
    return (
      <div className="space-y-2">
        <p className="text-destructive">{getErrorMessage(customer.error)}</p>
        <Link
          href="/admin/customers"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver
        </Link>
      </div>
    );
  }

  const c = customer.data;
  const summary = account.data;
  const balanceNum = summary ? parseFloat(summary.balance) : 0;

  return (
    <div className="space-y-6">
      <SectionHeader
        title={c.fullName}
        description={c.document ? `${c.documentType ?? ''} ${c.document}` : 'Cliente sin documento'}
        crumbs={[
          { label: 'Administración' },
          { label: 'Clientes', href: '/admin/customers' },
        ]}
        actions={
          canEdit ? (
            <button
              type="button"
              onClick={() => setShowEdit(true)}
              className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-2 text-sm hover:bg-muted"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </button>
          ) : null
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard label="Teléfono" value={c.phone ?? '—'} />
        <InfoCard label="Email" value={c.email ?? '—'} />
        <InfoCard
          label="Estado"
          value={c.isActive ? 'Activo' : 'Inactivo'}
        />
      </div>
      {c.address && (
        <div className="rounded-xl border bg-card p-4 text-sm">
          <div className="text-xs text-muted-foreground">Dirección</div>
          <div className="mt-1">{c.address}</div>
        </div>
      )}

      {/* Cuenta corriente / crédito */}
      <div className="rounded-2xl border bg-gradient-to-br from-brand-tint via-card to-brand-soft p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Wallet className="h-4 w-4 text-brand-from" />
              Cuenta corriente
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Saldo pendiente del cliente. Se actualiza al vender a crédito y al recibir abonos.
            </p>
          </div>
          {canPay && summary && (
            <button
              type="button"
              onClick={() => setShowAbono(true)}
              disabled={balanceNum <= 0}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            >
              <ArrowDownLeft className="h-4 w-4" />
              Registrar abono
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <Stat
            label="Saldo"
            value={summary ? formatMoney(summary.balance) : '—'}
            strong
            tone={
              balanceNum === 0 ? 'good' : balanceNum > 0 ? 'warn' : 'good'
            }
          />
          <Stat
            label="Total adeudado"
            value={summary ? formatMoney(summary.chargeTotal) : '—'}
          />
          <Stat
            label="Total abonado"
            value={summary ? formatMoney(summary.paymentTotal) : '—'}
          />
          <Stat
            label="Anulado"
            value={summary ? formatMoney(summary.reversalTotal) : '—'}
          />
        </div>
      </div>

      {/* Movimientos */}
      <div>
        <h3 className="mb-2 text-sm font-semibold">Movimientos de cuenta</h3>
        {account.isLoading ? (
          <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
            Cargando movimientos...
          </p>
        ) : summary?.entries.length === 0 ? (
          <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
            Aún no hay movimientos.
          </p>
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {summary?.entries.map((e) => (
              <li key={e.id} className="flex items-start gap-3 px-3 py-2.5">
                <span
                  className={
                    'mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md ' +
                    (e.type === 'CHARGE'
                      ? 'bg-amber-100 text-amber-700'
                      : e.type === 'PAYMENT'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-muted text-muted-foreground')
                  }
                >
                  {e.type === 'PAYMENT' ? (
                    <ArrowDownLeft className="h-4 w-4" />
                  ) : e.type === 'REVERSAL' ? (
                    <RotateCcw className="h-4 w-4" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="text-sm font-medium">{TYPE_LABEL[e.type]}</div>
                    <div
                      className={
                        'text-sm font-semibold ' +
                        (e.type === 'CHARGE'
                          ? 'text-amber-700'
                          : 'text-emerald-700')
                      }
                    >
                      {e.type === 'CHARGE' ? '+' : '−'}
                      {formatMoney(e.amount)}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDateTime(e.createdAt)}
                    {e.paymentMethod && ` · ${e.paymentMethod}`}
                    {e.reference && ` · ${e.reference}`}
                  </p>
                  {e.notes && (
                    <p className="break-words text-[11px] text-muted-foreground">
                      {e.notes}
                    </p>
                  )}
                  {e.saleId && (
                    <Link
                      href={`/sales/${e.saleId}`}
                      className="text-[11px] text-primary hover:underline"
                    >
                      Ver venta →
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showEdit && (
        <CustomerFormDialog
          customer={c}
          onClose={() => setShowEdit(false)}
        />
      )}
      {showAbono && summary && (
        <AbonoDialog
          customerId={c.id}
          customerName={c.fullName}
          currentBalance={summary.balance}
          onClose={() => setShowAbono(false)}
        />
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function Stat({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: 'good' | 'warn';
}) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={
          (strong ? 'text-lg font-semibold' : 'text-base font-medium') +
          (tone === 'warn' ? ' text-amber-700' : tone === 'good' ? ' text-emerald-700' : '')
        }
      >
        {value}
      </div>
    </div>
  );
}
