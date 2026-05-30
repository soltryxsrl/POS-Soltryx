'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useCategories } from '@/features/categories/application/hooks/use-categories';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { Select } from '@/shared/ui/controls/Select';
import { Switch } from '@/shared/ui/controls/Switch';
import { Textarea } from '@/shared/ui/controls/Textarea';
import {
  useCreateProduct,
  useUpdateProduct,
} from '../../application/hooks/use-products';
import type { CreateProductInput, Product, UpdateProductInput } from '../../domain/types';

interface Props {
  product?: Product;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ProductForm({ product, onSuccess, onCancel }: Props) {
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

  const finish = () => {
    if (onSuccess) onSuccess();
    else router.push('/dashboard/products');
  };

  const cancel = () => {
    if (onCancel) onCancel();
    else router.back();
  };

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
        finish();
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
        finish();
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const pending = create.isPending || update.isPending;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nombre" required>
          <Input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={180}
          />
        </FormField>
        <FormField label="SKU" required>
          <Input
            required
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            maxLength={64}
          />
        </FormField>
        <FormField label="Código de barras">
          <Input
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            maxLength={64}
          />
        </FormField>
        <FormField label="Categoría">
          <Select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Seleccione</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Precio costo">
          <Input
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            inputMode="decimal"
            pattern="^\d+(\.\d{1,2})?$"
          />
        </FormField>
        <FormField label="Precio venta" required>
          <Input
            required
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            inputMode="decimal"
            pattern="^\d+(\.\d{1,2})?$"
          />
        </FormField>
        <FormField label="ITBIS / impuesto (%)">
          <Input
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
            inputMode="decimal"
            pattern="^\d+(\.\d{1,2})?$"
          />
        </FormField>
        <FormField label="Stock mínimo">
          <Input
            value={minStock}
            onChange={(e) => setMinStock(e.target.value)}
            inputMode="decimal"
            pattern="^\d+(\.\d{1,3})?$"
          />
        </FormField>

        {!isEdit && (
          <FormField label="Stock inicial (opcional)">
            <Input
              value={initialStock}
              onChange={(e) => setInitialStock(e.target.value)}
              inputMode="decimal"
              pattern="^\d+(\.\d{1,3})?$"
            />
          </FormField>
        )}

        <div className="sm:col-span-2">
          <FormField label="Descripción">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormField>
        </div>

        {isEdit && (
          <div className="sm:col-span-2">
            <Switch checked={isActive} onChange={setIsActive} label="Activo" />
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}

      <FormFooter>
        <Button variant="outline" onClick={cancel} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear producto'}
        </Button>
      </FormFooter>
    </form>
  );
}
