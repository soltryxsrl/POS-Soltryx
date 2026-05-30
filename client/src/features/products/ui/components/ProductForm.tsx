'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useCategories } from '@/features/categories/application/hooks/use-categories';
import { getErrorMessage } from '@/shared/lib/error-message';
import {
  useCreateProduct,
  useUpdateProduct,
} from '../../application/hooks/use-products';
import type { CreateProductInput, Product, UpdateProductInput } from '../../domain/types';

interface Props {
  product?: Product;
}

export function ProductForm({ product }: Props) {
  const router = useRouter();
  const isEdit = !!product;
  const create = useCreateProduct();
  const update = useUpdateProduct(product?.id ?? '');
  const categories = useCategories({ isActive: true });

  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(product?.name ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [barcode, setBarcode] = useState(product?.barcode ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? '');
  const [costPrice, setCostPrice] = useState(product?.costPrice ?? '0.00');
  const [salePrice, setSalePrice] = useState(product?.salePrice ?? '0.00');
  const [taxRate, setTaxRate] = useState(product?.taxRate ?? '18.00');
  const [initialStock, setInitialStock] = useState('0');
  const [minStock, setMinStock] = useState(product?.minStock ?? '0');
  const [isActive, setIsActive] = useState(product?.isActive ?? true);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (isEdit && product) {
        const payload: UpdateProductInput = {
          name,
          sku,
          barcode: barcode || null,
          description: description || null,
          categoryId: categoryId || null,
          costPrice,
          salePrice,
          taxRate,
          minStock,
          isActive,
        };
        await update.mutateAsync(payload);
        router.push('/dashboard/products');
      } else {
        const payload: CreateProductInput = {
          name,
          sku,
          ...(barcode && { barcode }),
          ...(description && { description }),
          ...(categoryId && { categoryId }),
          costPrice,
          salePrice,
          taxRate,
          ...(initialStock && Number(initialStock) > 0 && { initialStock }),
          minStock,
          isActive,
        };
        await create.mutateAsync(payload);
        router.push('/dashboard/products');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const pending = create.isPending || update.isPending;

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre *">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            maxLength={180}
          />
        </Field>
        <Field label="SKU *">
          <input
            required
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className={inputCls}
            maxLength={64}
          />
        </Field>
        <Field label="Código de barras">
          <input
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            className={inputCls}
            maxLength={64}
          />
        </Field>
        <Field label="Categoría">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={inputCls}
          >
            <option value="">— Sin categoría —</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Precio costo">
          <input
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            className={inputCls}
            inputMode="decimal"
            pattern="^\d+(\.\d{1,2})?$"
          />
        </Field>
        <Field label="Precio venta *">
          <input
            required
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            className={inputCls}
            inputMode="decimal"
            pattern="^\d+(\.\d{1,2})?$"
          />
        </Field>
        <Field label="ITBIS / impuesto (%)">
          <input
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
            className={inputCls}
            inputMode="decimal"
            pattern="^\d+(\.\d{1,2})?$"
          />
        </Field>
        <Field label="Stock mínimo">
          <input
            value={minStock}
            onChange={(e) => setMinStock(e.target.value)}
            className={inputCls}
            inputMode="decimal"
            pattern="^\d+(\.\d{1,3})?$"
          />
        </Field>

        {!isEdit && (
          <Field label="Stock inicial (opcional)">
            <input
              value={initialStock}
              onChange={(e) => setInitialStock(e.target.value)}
              className={inputCls}
              inputMode="decimal"
              pattern="^\d+(\.\d{1,3})?$"
            />
          </Field>
        )}

        <Field label="Descripción">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${inputCls} min-h-[80px]`}
          />
        </Field>

        <label className="flex items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <span className="text-sm">Activo</span>
        </label>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear producto'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border px-4 py-2 text-sm transition hover:bg-muted"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

const inputCls =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
