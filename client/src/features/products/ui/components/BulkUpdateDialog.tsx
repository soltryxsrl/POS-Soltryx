'use client';

import { useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { Select } from '@/shared/ui/controls/Select';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import { useCategories } from '@/features/categories/application/hooks/use-categories';
import {
  useBulkUpdatePrices,
  useBulkUpdateStockLevels,
} from '../../application/hooks/use-products';
import type {
  BulkPriceUpdateInput,
  BulkStockLevelsInput,
} from '../../domain/types';

interface Props {
  onClose: () => void;
}

type Tab = 'prices' | 'stock';
type Scope = 'all' | 'category';

const QTY_PATTERN = '^\\d+(\\.\\d{1,3})?$';
const MONEY_PATTERN = '^\\d+(\\.\\d{1,2})?$';

export function BulkUpdateDialog({ onClose }: Props) {
  const categories = useCategories({ isActive: true });
  const bulkPrices = useBulkUpdatePrices();
  const bulkStock = useBulkUpdateStockLevels();

  const [tab, setTab] = useState<Tab>('prices');
  const [scope, setScope] = useState<Scope>('all');
  const [categoryId, setCategoryId] = useState('');

  // Precios
  const [field, setField] = useState<'salePrice' | 'costPrice'>('salePrice');
  const [mode, setMode] = useState<BulkPriceUpdateInput['mode']>('increasePct');
  const [value, setValue] = useState('');

  // Niveles de stock
  const [minStock, setMinStock] = useState('');
  const [maxStock, setMaxStock] = useState('');
  const [reorderPoint, setReorderPoint] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<number | null>(null);

  const pending = bulkPrices.isPending || bulkStock.isPending;

  const target = (): { scope: Scope; categoryId?: string } =>
    scope === 'category' ? { scope, categoryId } : { scope };

  const validate = (): string | null => {
    if (scope === 'category' && !categoryId) return 'Selecciona una categoría.';
    if (tab === 'prices') {
      if (!value.trim()) return 'Indica un valor.';
      if (!new RegExp(MONEY_PATTERN).test(value.trim()))
        return 'El valor debe ser un número con hasta 2 decimales.';
    } else {
      const provided = [minStock, maxStock, reorderPoint].filter((v) => v.trim());
      if (provided.length === 0)
        return 'Indica al menos un nivel (mínimo, reorden o máximo).';
      for (const v of provided) {
        if (!new RegExp(QTY_PATTERN).test(v.trim()))
          return 'Los niveles deben ser números con hasta 3 decimales.';
      }
    }
    return null;
  };

  const onSubmit = async () => {
    setError(null);
    setResult(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    try {
      if (tab === 'prices') {
        const input: BulkPriceUpdateInput = {
          ...target(),
          field,
          mode,
          value: value.trim(),
        };
        const res = await bulkPrices.mutateAsync(input);
        setResult(res.updated);
      } else {
        const input: BulkStockLevelsInput = {
          ...target(),
          ...(minStock.trim() && { minStock: minStock.trim() }),
          ...(maxStock.trim() && { maxStock: maxStock.trim() }),
          ...(reorderPoint.trim() && { reorderPoint: reorderPoint.trim() }),
        };
        const res = await bulkStock.mutateAsync(input);
        setResult(res.updated);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <MaintenanceShell open onClose={onClose} title="Actualización masiva" size="lg">
      <div className="space-y-6">
        {/* Pestaña: qué cambiar */}
        <div
          role="group"
          aria-label="Tipo de actualización"
          className="inline-flex overflow-hidden rounded-lg border border-border/60"
        >
          {([
            { key: 'prices', label: 'Precios' },
            { key: 'stock', label: 'Niveles de stock' },
          ] as const).map((t, i) => (
            <button
              key={t.key}
              type="button"
              aria-pressed={tab === t.key}
              onClick={() => {
                setTab(t.key);
                setError(null);
                setResult(null);
              }}
              className={cn(
                'px-4 py-1.5 text-xs font-medium transition',
                i > 0 && 'border-l border-border/60',
                tab === t.key
                  ? 'bg-brand-from/10 text-brand-from'
                  : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Alcance */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Aplicar a">
            <Select
              value={scope}
              onChange={(e) => setScope(e.target.value as Scope)}
            >
              <option value="all">Todos los productos</option>
              <option value="category">Una categoría</option>
            </Select>
          </FormField>
          {scope === 'category' && (
            <FormField label="Categoría">
              <Select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={categories.isLoading}
              >
                <option value="">Seleccione</option>
                {categories.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
        </div>

        {/* Cuerpo según pestaña */}
        {tab === 'prices' ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Precio">
              <Select
                value={field}
                onChange={(e) =>
                  setField(e.target.value as 'salePrice' | 'costPrice')
                }
              >
                <option value="salePrice">Precio de venta</option>
                <option value="costPrice">Precio de costo</option>
              </Select>
            </FormField>
            <FormField label="Operación">
              <Select
                value={mode}
                onChange={(e) =>
                  setMode(e.target.value as BulkPriceUpdateInput['mode'])
                }
              >
                <option value="increasePct">Aumentar %</option>
                <option value="decreasePct">Reducir %</option>
                <option value="increaseAmount">Aumentar monto</option>
                <option value="decreaseAmount">Reducir monto</option>
                <option value="set">Fijar valor</option>
              </Select>
            </FormField>
            <FormField
              label={
                mode === 'increasePct' || mode === 'decreasePct'
                  ? 'Porcentaje'
                  : 'Monto'
              }
            >
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                inputMode="decimal"
                pattern={MONEY_PATTERN}
                placeholder={
                  mode === 'increasePct' || mode === 'decreasePct' ? '10' : '0.00'
                }
              />
            </FormField>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Stock mínimo" hint="Dejar vacío = no cambiar.">
              <Input
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                inputMode="decimal"
                pattern={QTY_PATTERN}
                placeholder="—"
              />
            </FormField>
            <FormField label="Punto de reorden" hint="Dejar vacío = no cambiar.">
              <Input
                value={reorderPoint}
                onChange={(e) => setReorderPoint(e.target.value)}
                inputMode="decimal"
                pattern={QTY_PATTERN}
                placeholder="—"
              />
            </FormField>
            <FormField label="Stock máximo" hint="Dejar vacío = no cambiar.">
              <Input
                value={maxStock}
                onChange={(e) => setMaxStock(e.target.value)}
                inputMode="decimal"
                pattern={QTY_PATTERN}
                placeholder="—"
              />
            </FormField>
          </div>
        )}

        {tab === 'prices' && (
          <p className="text-xs text-muted-foreground">
            Los precios resultantes se redondean a 2 decimales y nunca bajan de 0.
            Las variantes conservan su propio precio.
          </p>
        )}

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}
        {result !== null && !error && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
            {result === 0
              ? 'No se actualizó ningún producto (revisa el alcance).'
              : `${result} producto${result === 1 ? '' : 's'} actualizado${
                  result === 1 ? '' : 's'
                }.`}
          </p>
        )}

        <FormFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {result !== null ? 'Cerrar' : 'Cancelar'}
          </Button>
          <Button onClick={onSubmit} disabled={pending}>
            {pending ? 'Aplicando...' : 'Aplicar'}
          </Button>
        </FormFooter>
      </div>
    </MaintenanceShell>
  );
}
