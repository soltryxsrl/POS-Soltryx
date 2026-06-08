'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Trash2 } from 'lucide-react';
import { formatMoney } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { cn } from '@/shared/lib/cn';
import { displayNumeric, selectAllOnFocus } from '@/shared/lib/numeric-field';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { Select } from '@/shared/ui/controls/Select';
import { Textarea } from '@/shared/ui/controls/Textarea';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import { useProducts } from '@/features/products/application/hooks/use-products';
import { useSuppliers } from '@/features/suppliers/application/hooks/use-suppliers';
import { useCreatePurchaseOrder } from '../../application/hooks/use-purchases';
import {
  EMPTY_FISCAL,
  PurchaseFiscalFields,
  validatePurchaseFiscal,
  type PurchaseFiscalValue,
} from './PurchaseFiscalFields';

interface LineDraft {
  key: string;
  productId: string;
  productName: string;
  sku: string;
  taxRate: string;
  quantity: string;
  unitCost: string;
}

function uid() {
  return Math.random().toString(36).slice(2);
}

export function CreatePurchaseOrderForm() {
  const router = useRouter();
  const suppliers = useSuppliers({ isActive: 'true', limit: 200 });
  const create = useCreatePurchaseOrder();
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [supplierInvoice, setSupplierInvoice] = useState('');
  const [fiscal, setFiscal] = useState<PurchaseFiscalValue>(EMPTY_FISCAL);
  const patchFiscal = (patch: Partial<PurchaseFiscalValue>) =>
    setFiscal((f) => ({ ...f, ...patch }));
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(() => computeTotals(lines), [lines]);

  const addProduct = (p: {
    id: string;
    name: string;
    sku: string;
    taxRate: string;
    costPrice: string;
  }) => {
    setLines((rows) => {
      const existing = rows.find((r) => r.productId === p.id);
      if (existing) return rows; // ya está; el usuario puede cambiar cantidad
      return [
        ...rows,
        {
          key: uid(),
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          taxRate: p.taxRate,
          quantity: '1',
          unitCost: p.costPrice || '0.00',
        },
      ];
    });
    setShowPicker(false);
  };

  const update = (key: string, patch: Partial<LineDraft>) =>
    setLines((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const remove = (key: string) =>
    setLines((rows) => rows.filter((r) => r.key !== key));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!supplierId) {
      setError('Selecciona un proveedor.');
      return;
    }
    if (lines.length === 0) {
      setError('Agrega al menos una línea de producto.');
      return;
    }
    for (const l of lines) {
      if (parseFloat(l.quantity) <= 0) {
        setError(`Cantidad para ${l.productName} debe ser > 0.`);
        return;
      }
      if (parseFloat(l.unitCost) < 0) {
        setError(`Costo unitario inválido para ${l.productName}.`);
        return;
      }
    }
    const fiscalErr = validatePurchaseFiscal(
      fiscal,
      Math.round(parseFloat(totals.tax) * 100),
    );
    if (fiscalErr) {
      setError(fiscalErr);
      return;
    }
    try {
      const po = await create.mutateAsync({
        supplierId,
        expectedDate: expectedDate || undefined,
        supplierInvoice: supplierInvoice.trim() || undefined,
        ...(fiscal.supplierFiscalDocTypeCode
          ? {
              supplierFiscalDocTypeCode: fiscal.supplierFiscalDocTypeCode,
              supplierNcf: fiscal.supplierNcf.trim() || undefined,
              supplierInvoiceDate: fiscal.supplierInvoiceDate || undefined,
              itbisRetenido: fiscal.itbisRetenido.trim() || undefined,
              isrRetenido: fiscal.isrRetenido.trim() || undefined,
              isrRetentionType: fiscal.isrRetentionType || undefined,
            }
          : {}),
        paymentMethod: fiscal.paymentMethod,
        notes: notes.trim() || undefined,
        items: lines.map((l) => ({
          productId: l.productId,
          orderedQuantity: l.quantity,
          unitCost: l.unitCost,
          taxRate: l.taxRate,
        })),
      });
      router.push(`/purchases/${po.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Proveedor" required>
          <Select
            required
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
          >
            <option value="">Seleccione</option>
            {suppliers.data?.items.map((s) => (
              <option key={s.id} value={s.id}>
                {s.tradeName}
                {s.rnc ? ` · ${s.rnc}` : ''}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Fecha esperada">
          <Input
            type="date"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
          />
        </FormField>

        <FormField label="N° factura del proveedor" className="sm:col-span-2">
          <Input
            value={supplierInvoice}
            onChange={(e) => setSupplierInvoice(e.target.value)}
            maxLength={120}
            placeholder="F-001-12345"
          />
        </FormField>

        <div className="sm:col-span-2">
          <PurchaseFiscalFields value={fiscal} onChange={patchFiscal} />
        </div>

        <FormField label="Notas" className="sm:col-span-2">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[60px]"
          />
        </FormField>
      </div>

      {/* Líneas */}
      <div className="rounded-2xl border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <h3 className="text-sm font-semibold">Productos a pedir</h3>
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar producto
          </button>
        </div>

        {lines.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Sin productos. Agrega el primero con el botón de arriba.
          </p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Producto</th>
                <th className="px-3 py-2 text-right">Cantidad</th>
                <th className="px-3 py-2 text-right">Costo unit</th>
                <th className="px-3 py-2 text-right">ITBIS %</th>
                <th className="px-3 py-2 text-right">Total línea</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const qty = parseFloat(l.quantity) || 0;
                const cost = parseFloat(l.unitCost) || 0;
                const sub = qty * cost;
                const tax = sub * (parseFloat(l.taxRate) / 100);
                const total = sub + tax;
                return (
                  <tr key={l.key} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <div className="font-medium">{l.productName}</div>
                      <div className="text-[11px] text-muted-foreground">{l.sku}</div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        step="0.001"
                        value={displayNumeric(l.quantity)}
                        onChange={(e) => update(l.key, { quantity: e.target.value })}
                        onFocus={selectAllOnFocus}
                        placeholder="0"
                        className="w-20 rounded-lg border border-border/60 bg-background px-2 py-1 text-right text-sm"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        value={displayNumeric(l.unitCost)}
                        onChange={(e) => update(l.key, { unitCost: e.target.value })}
                        onFocus={selectAllOnFocus}
                        placeholder="0.00"
                        pattern="^\d+(\.\d{1,2})?$"
                        inputMode="decimal"
                        className="w-24 rounded-lg border border-border/60 bg-background px-2 py-1 text-right text-sm"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        value={displayNumeric(l.taxRate)}
                        onChange={(e) => update(l.key, { taxRate: e.target.value })}
                        onFocus={selectAllOnFocus}
                        placeholder="0"
                        pattern="^\d+(\.\d{1,2})?$"
                        inputMode="decimal"
                        className="w-16 rounded-lg border border-border/60 bg-background px-2 py-1 text-right text-sm"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-medium">{formatMoney(total)}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => remove(l.key)}
                        className="text-destructive hover:text-destructive/80"
                        title="Quitar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}

        {lines.length > 0 && (
          <div className="space-y-1 border-t px-4 py-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMoney(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ITBIS</span>
              <span>{formatMoney(totals.tax)}</span>
            </div>
            <div className="my-1 border-t" />
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatMoney(totals.total)}</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}

      <FormFooter>
        <Button
          variant="outline"
          onClick={() => router.push('/purchases')}
          disabled={create.isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? 'Creando...' : 'Crear orden'}
        </Button>
      </FormFooter>

      {showPicker && (
        <ProductPicker
          onPick={addProduct}
          onClose={() => setShowPicker(false)}
        />
      )}
    </form>
  );
}

function computeTotals(lines: LineDraft[]): {
  subtotal: string;
  tax: string;
  total: string;
} {
  let subC = 0;
  let taxC = 0;
  for (const l of lines) {
    const qty = parseFloat(l.quantity) || 0;
    const costC = Math.round((parseFloat(l.unitCost) || 0) * 100);
    const lineSubC = Math.round(costC * qty);
    const taxRateC = Math.round((parseFloat(l.taxRate) || 0) * 100);
    const lineTaxC = Math.round((lineSubC * taxRateC) / (100 * 100));
    subC += lineSubC;
    taxC += lineTaxC;
  }
  const fc = (c: number) =>
    `${Math.trunc(c / 100)}.${(c % 100).toString().padStart(2, '0')}`;
  return { subtotal: fc(subC), tax: fc(taxC), total: fc(subC + taxC) };
}

function ProductPicker({
  onPick,
  onClose,
}: {
  onPick: (p: {
    id: string;
    name: string;
    sku: string;
    taxRate: string;
    costPrice: string;
  }) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const products = useProducts({ q: q || undefined, limit: 30 });

  return (
    <MaintenanceShell open onClose={onClose} title="Buscar producto" size="xl">
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nombre, SKU, código de barras..."
            className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-3 text-sm shadow-sm outline-none focus:border-brand-from focus:ring-2 focus:ring-brand-from/20"
          />
        </div>
        <div className="max-h-[380px] overflow-y-auto rounded-xl border">
          {products.isLoading && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Cargando...
            </p>
          )}
          {products.data?.items.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Sin resultados.
            </p>
          )}
          <ul className="divide-y">
            {products.data?.items.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() =>
                    onPick({
                      id: p.id,
                      name: p.name,
                      sku: p.sku,
                      taxRate: p.taxRate ?? '0',
                      costPrice: p.costPrice ?? '0.00',
                    })
                  }
                  className={cn(
                    'flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-muted/60',
                  )}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground">{p.sku}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Stock: {p.stock}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </MaintenanceShell>
  );
}
