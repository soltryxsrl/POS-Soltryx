'use client';

import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { useCategories } from '@/features/categories/application/hooks/use-categories';
import {
  useProducts,
  useVariants,
} from '@/features/products/application/hooks/use-products';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { Select } from '@/shared/ui/controls/Select';
import { Textarea } from '@/shared/ui/controls/Textarea';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import {
  useCreatePromotion,
  useUpdatePromotion,
} from '../../application/hooks/use-promotions';
import type { Promotion, PromotionType } from '../../domain/types';

interface Props {
  promotion?: Promotion;
  onClose: () => void;
}

const TYPE_OPTIONS: Array<{ value: PromotionType; label: string; hint: string }> = [
  {
    value: 'PRODUCT_PERCENT_OFF',
    label: '% off por producto',
    hint: 'Descuento porcentual sobre cada unidad del producto/categoría',
  },
  {
    value: 'PRODUCT_AMOUNT_OFF',
    label: 'RD$ off por producto',
    hint: 'Descuento fijo por unidad del producto/categoría',
  },
  {
    value: 'PRODUCT_BUY_X_GET_Y',
    label: 'Compra X, lleva Y gratis',
    hint: 'Ej: 2x1 = compra 2, lleva 1 gratis (paga 1)',
  },
  {
    value: 'ORDER_PERCENT_OFF',
    label: '% off en la orden',
    hint: 'Descuento porcentual sobre el subtotal de la venta',
  },
  {
    value: 'ORDER_AMOUNT_OFF',
    label: 'RD$ off en la orden',
    hint: 'Monto fijo descontado del total',
  },
];

const SCOPE_OPTIONS = [
  { value: 'all', label: 'Todos los productos' },
  { value: 'product', label: 'Producto específico' },
  { value: 'category', label: 'Categoría entera' },
] as const;

type Scope = (typeof SCOPE_OPTIONS)[number]['value'];

export function PromotionFormDialog({ promotion, onClose }: Props) {
  const isEdit = !!promotion;
  const create = useCreatePromotion();
  const update = useUpdatePromotion(promotion?.id ?? '__new__');
  const categories = useCategories();
  const products = useProducts({ limit: 200 });

  const [name, setName] = useState(promotion?.name ?? '');
  const [description, setDescription] = useState(promotion?.description ?? '');
  const [type, setType] = useState<PromotionType>(
    (promotion?.type ?? 'PRODUCT_PERCENT_OFF') as PromotionType,
  );
  const [scope, setScope] = useState<Scope>(
    promotion?.productId
      ? 'product'
      : promotion?.categoryId
        ? 'category'
        : 'all',
  );
  const [productId, setProductId] = useState(promotion?.productId ?? '');
  const [variantId, setVariantId] = useState(promotion?.variantId ?? '');
  const [categoryId, setCategoryId] = useState(promotion?.categoryId ?? '');
  const [percentOff, setPercentOff] = useState(promotion?.percentOff ?? '');
  const [amountOff, setAmountOff] = useState(promotion?.amountOff ?? '');
  const [minQuantity, setMinQuantity] = useState(
    promotion?.minQuantity?.toString() ?? '',
  );
  const [freeQuantity, setFreeQuantity] = useState(
    promotion?.freeQuantity?.toString() ?? '',
  );
  const [minOrderTotal, setMinOrderTotal] = useState(promotion?.minOrderTotal ?? '');
  const [validFrom, setValidFrom] = useState(
    promotion?.validFrom ? promotion.validFrom.slice(0, 10) : '',
  );
  const [validUntil, setValidUntil] = useState(
    promotion?.validUntil ? promotion.validUntil.slice(0, 10) : '',
  );
  const [isActive, setIsActive] = useState(promotion?.isActive ?? true);
  const [priority, setPriority] = useState(promotion?.priority?.toString() ?? '0');
  const [error, setError] = useState<string | null>(null);

  const pending = isEdit ? update.isPending : create.isPending;
  const isProductScope = type.startsWith('PRODUCT_');
  const selectedProduct = products.data?.items.find((p) => p.id === productId);
  const showVariantPicker =
    isProductScope && scope === 'product' && !!selectedProduct?.hasVariants;
  const variantsForProduct = useVariants(
    showVariantPicker ? productId : undefined,
    showVariantPicker,
  );
  const needsPercent =
    type === 'PRODUCT_PERCENT_OFF' || type === 'ORDER_PERCENT_OFF';
  const needsAmount =
    type === 'PRODUCT_AMOUNT_OFF' || type === 'ORDER_AMOUNT_OFF';
  const needsBxGy = type === 'PRODUCT_BUY_X_GET_Y';
  const isOrderScope = type.startsWith('ORDER_');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError('El nombre es obligatorio.');
      return;
    }
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      productId: isProductScope && scope === 'product' ? productId || undefined : undefined,
      variantId:
        isProductScope && scope === 'product' && showVariantPicker
          ? variantId || undefined
          : undefined,
      categoryId: isProductScope && scope === 'category' ? categoryId || undefined : undefined,
      percentOff: needsPercent ? percentOff || undefined : undefined,
      amountOff: needsAmount ? amountOff || undefined : undefined,
      minQuantity: needsBxGy ? Number(minQuantity) || undefined : undefined,
      freeQuantity: needsBxGy ? Number(freeQuantity) || undefined : undefined,
      minOrderTotal: isOrderScope ? minOrderTotal || undefined : undefined,
      validFrom: validFrom || undefined,
      validUntil: validUntil || undefined,
      isActive,
      priority: Number(priority) || 0,
    };
    try {
      if (isEdit) await update.mutateAsync(payload);
      else await create.mutateAsync(payload);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <MaintenanceShell
      open
      onClose={onClose}
      title={isEdit ? 'Editar promoción' : 'Nueva promoción'}
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <FormField label="Nombre" required>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={180}
            placeholder="Ej: 2x1 todos los aceites"
          />
        </FormField>

        <FormField label="Tipo de promoción" required>
          <Select value={type} onChange={(e) => setType(e.target.value as PromotionType)}>
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {TYPE_OPTIONS.find((o) => o.value === type)?.hint}
          </p>
        </FormField>

        {isProductScope && (
          <FormField label="Alcance">
            <div className="grid grid-cols-3 gap-2">
              {SCOPE_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setScope(s.value)}
                  className={
                    'rounded-xl border-2 px-3 py-2 text-sm transition ' +
                    (scope === s.value
                      ? 'border-brand-from bg-brand-tint'
                      : 'border-border bg-card hover:border-foreground/20')
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>
            {scope === 'product' && (
              <>
                <Select
                  value={productId}
                  onChange={(e) => {
                    setProductId(e.target.value);
                    setVariantId('');
                  }}
                  className="mt-2"
                >
                  <option value="">Seleccione producto</option>
                  {products.data?.items.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                      {p.hasVariants ? ' · con variantes' : ''}
                    </option>
                  ))}
                </Select>
                {showVariantPicker && (
                  <Select
                    value={variantId}
                    onChange={(e) => setVariantId(e.target.value)}
                    className="mt-2"
                  >
                    <option value="">Todas las variantes</option>
                    {variantsForProduct.data?.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.sku})
                      </option>
                    ))}
                  </Select>
                )}
              </>
            )}
            {scope === 'category' && (
              <Select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="mt-2"
              >
                <option value="">Seleccione categoría</option>
                {categories.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
        )}

        {needsPercent && (
          <FormField label="Porcentaje de descuento" required>
            <Input
              value={percentOff}
              onChange={(e) => setPercentOff(e.target.value)}
              pattern="^\d+(\.\d{1,2})?$"
              inputMode="decimal"
              placeholder="Ej: 10 (= 10%)"
            />
          </FormField>
        )}

        {needsAmount && (
          <FormField label="Monto de descuento (RD$)" required>
            <Input
              value={amountOff}
              onChange={(e) => setAmountOff(e.target.value)}
              pattern="^\d+(\.\d{1,2})?$"
              inputMode="decimal"
              placeholder="Ej: 50 (= RD$50 off)"
            />
          </FormField>
        )}

        {needsBxGy && (
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Compra (cantidad)" required hint="Ej: 2 para '2x1'">
              <Input
                type="number"
                min={2}
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
              />
            </FormField>
            <FormField label="Lleva gratis" required hint="Ej: 1 para '2x1'">
              <Input
                type="number"
                min={1}
                value={freeQuantity}
                onChange={(e) => setFreeQuantity(e.target.value)}
              />
            </FormField>
          </div>
        )}

        {isOrderScope && (
          <FormField
            label="Total mínimo de orden (RD$)"
            hint="Opcional — solo aplica si el subtotal supera este monto."
          >
            <Input
              value={minOrderTotal}
              onChange={(e) => setMinOrderTotal(e.target.value)}
              pattern="^\d+(\.\d{1,2})?$"
              inputMode="decimal"
            />
          </FormField>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Válido desde">
            <Input
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
            />
          </FormField>
          <FormField label="Válido hasta">
            <Input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </FormField>
        </div>

        <FormField
          label="Prioridad"
          hint="Mayor número = evalúa primero. Útil cuando hay varias promos posibles."
        >
          <Input
            type="number"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          />
        </FormField>

        <FormField label="Descripción">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[60px]"
          />
        </FormField>

        {isEdit && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-border"
            />
            Promoción activa
          </label>
        )}

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
            {pending ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear promoción'}
          </Button>
        </FormFooter>
      </form>
    </MaintenanceShell>
  );
}
