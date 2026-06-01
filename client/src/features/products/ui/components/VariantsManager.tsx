'use client';

import { useState, type FormEvent } from 'react';
import { Pencil, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { formatMoney, formatQuantity } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { ConfirmDialog } from '@/shared/ui/feedback/ConfirmDialog';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import { AdjustStockDialog } from '@/features/inventory/ui/components/AdjustStockDialog';
import {
  useCreateVariant,
  useDeleteVariant,
  useUpdateVariant,
  useVariants,
} from '../../application/hooks/use-products';
import type { Product, ProductVariant } from '../../domain/types';

interface Props {
  product: Product;
}

export function VariantsManager({ product }: Props) {
  const variants = useVariants(product.id);
  const remove = useDeleteVariant(product.id);
  const [editing, setEditing] = useState<ProductVariant | null>(null);
  const [adjusting, setAdjusting] = useState<ProductVariant | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState<ProductVariant | null>(null);
  const [delError, setDelError] = useState<string | null>(null);

  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">
        Define las variantes (talla, color, sabor, tamaño) que se venden bajo
        este producto. Cada una tiene su propio SKU, stock y precio opcional.
      </p>

      {variants.isLoading && (
        <p className="text-sm text-muted-foreground">Cargando variantes...</p>
      )}
      {variants.isError && (
        <p className="text-sm text-destructive">{getErrorMessage(variants.error)}</p>
      )}
      {variants.data?.length === 0 && (
        <p className="rounded-md border bg-background p-3 text-sm text-muted-foreground">
          Este producto todavía no tiene variantes.
        </p>
      )}

      {(variants.data?.length ?? 0) > 0 && (
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-2 py-2">Nombre</th>
              <th className="px-2 py-2">SKU</th>
              <th className="px-2 py-2 text-right">Precio</th>
              <th className="px-2 py-2 text-right">Stock</th>
              <th className="px-2 py-2">Estado</th>
              <th className="px-2 py-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {variants.data?.map((v) => (
              <tr key={v.id} className="border-b last:border-0">
                <td className="px-2 py-2 font-medium">{v.name}</td>
                <td className="px-2 py-2 text-muted-foreground">
                  <code className="text-xs">{v.sku}</code>
                </td>
                <td className="px-2 py-2 text-right">
                  {v.salePrice
                    ? formatMoney(v.salePrice)
                    : (
                        <span className="text-muted-foreground">
                          hereda ({formatMoney(product.salePrice)})
                        </span>
                      )}
                </td>
                <td className="px-2 py-2 text-right">{formatQuantity(v.stock)}</td>
                <td className="px-2 py-2">
                  <span
                    className={
                      v.isActive
                        ? 'rounded-full bg-green-100 px-2 py-0.5 text-[10px] text-green-700'
                        : 'rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground'
                    }
                  >
                    {v.isActive ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td className="px-2 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setAdjusting(v)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Ajustar stock"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(v)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDelError(null);
                        setDeleting(v);
                      }}
                      disabled={remove.isPending}
                      className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                      title="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="flex justify-end border-t pt-3">
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Nueva variante
        </Button>
      </div>

      {showCreate && (
        <VariantDialog
          product={product}
          onClose={() => setShowCreate(false)}
        />
      )}
      {editing && (
        <VariantDialog
          product={product}
          variant={editing}
          onClose={() => setEditing(null)}
        />
      )}
      {adjusting && (
        <AdjustStockDialog
          productId={product.id}
          variantId={adjusting.id}
          contextLabel={`${product.name} · ${adjusting.name}`}
          onClose={() => setAdjusting(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Eliminar variante"
          message={
            <>
              ¿Eliminar la variante <strong>{deleting.name}</strong>? Esta acción
              no se puede deshacer.
            </>
          }
          confirmLabel="Eliminar"
          destructive
          pending={remove.isPending}
          error={delError}
          onConfirm={async () => {
            setDelError(null);
            try {
              await remove.mutateAsync(deleting.id);
              setDeleting(null);
            } catch (err) {
              setDelError(getErrorMessage(err));
            }
          }}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

interface DialogProps {
  product: Product;
  variant?: ProductVariant;
  onClose: () => void;
}

function VariantDialog({ product, variant, onClose }: DialogProps) {
  const isEdit = !!variant;
  const create = useCreateVariant(product.id);
  const update = useUpdateVariant(product.id);
  const [name, setName] = useState(variant?.name ?? '');
  const [sku, setSku] = useState(variant?.sku ?? '');
  const [barcode, setBarcode] = useState(variant?.barcode ?? '');
  const [salePrice, setSalePrice] = useState(variant?.salePrice ?? '');
  const [costPrice, setCostPrice] = useState(variant?.costPrice ?? '');
  const [initialStock, setInitialStock] = useState('0');
  const [minStock, setMinStock] = useState(variant?.minStock ?? '0');
  const [isActive, setIsActive] = useState(variant?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  const pending = isEdit ? update.isPending : create.isPending;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !sku.trim()) {
      setError('Nombre y SKU son obligatorios.');
      return;
    }
    try {
      if (isEdit && variant) {
        await update.mutateAsync({
          variantId: variant.id,
          input: {
            name: name.trim(),
            sku: sku.trim(),
            barcode: barcode.trim() || null,
            salePrice: salePrice.trim() || null,
            costPrice: costPrice.trim() || null,
            minStock: minStock || undefined,
            isActive,
          },
        });
      } else {
        await create.mutateAsync({
          name: name.trim(),
          sku: sku.trim(),
          barcode: barcode.trim() || undefined,
          salePrice: salePrice.trim() || undefined,
          costPrice: costPrice.trim() || undefined,
          initialStock:
            initialStock && Number(initialStock) > 0 ? initialStock : undefined,
          minStock: minStock || undefined,
          isActive,
        });
      }
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <MaintenanceShell
      open
      onClose={onClose}
      title={isEdit ? `Editar variante · ${variant?.name}` : 'Nueva variante'}
      size="md"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="Nombre" required hint="Ej: Mediano, Rojo M, Vainilla">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="SKU" required>
            <Input value={sku} onChange={(e) => setSku(e.target.value)} maxLength={64} />
          </FormField>
          <FormField label="Código de barras">
            <Input
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              maxLength={64}
            />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField
            label="Precio venta override"
            hint={`Si vacío, hereda ${product.salePrice}`}
          >
            <Input
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              inputMode="decimal"
              pattern="^\d+(\.\d{1,2})?$"
            />
          </FormField>
          <FormField label="Precio costo override">
            <Input
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              inputMode="decimal"
              pattern="^\d+(\.\d{1,2})?$"
            />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {!isEdit && (
            <FormField label="Stock inicial">
              <Input
                value={initialStock}
                onChange={(e) => setInitialStock(e.target.value)}
                inputMode="decimal"
                pattern="^\d+(\.\d{1,3})?$"
              />
            </FormField>
          )}
          <FormField label="Stock mínimo">
            <Input
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              inputMode="decimal"
              pattern="^\d+(\.\d{1,3})?$"
            />
          </FormField>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-border"
          />
          Variante activa
        </label>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}

        <FormFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear variante'}
          </Button>
        </FormFooter>
      </form>
    </MaintenanceShell>
  );
}
