'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
import { useCategories } from '@/features/categories/application/hooks/use-categories';
import { useTaxTypes } from '@/features/tax-types/application/hooks/use-tax-types';
import { getErrorMessage } from '@/shared/lib/error-message';
import { uploadImage } from '@/shared/lib/http-client';
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
  const taxTypes = useTaxTypes({ activeOnly: true });

  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(product?.name ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [barcode, setBarcode] = useState(product?.barcode ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? '');
  const [imageBroken, setImageBroken] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? '');
  const [costPrice, setCostPrice] = useState(product?.costPrice ?? '0.00');
  const [salePrice, setSalePrice] = useState(product?.salePrice ?? '0.00');
  const [taxTypeCode, setTaxTypeCode] = useState(product?.taxTypeCode ?? '');
  const [initialStock, setInitialStock] = useState('0');
  const [minStock, setMinStock] = useState(product?.minStock ?? '0');
  const [maxStock, setMaxStock] = useState(product?.maxStock ?? '0');
  const [reorderPoint, setReorderPoint] = useState(product?.reorderPoint ?? '0');
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [isKit, setIsKit] = useState(product?.isKit ?? false);
  const [soldByWeight, setSoldByWeight] = useState(product?.soldByWeight ?? false);

  // Sube la imagen al CDN (MinIO/S3) y guarda la URL pública en el form. Sirve
  // tanto para alta como para edición (no depende de que el producto ya exista).
  const onImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite re-elegir el mismo archivo
    if (!file) return;
    setError(null);
    setUploadingImage(true);
    try {
      const url = await uploadImage(file, 'products');
      setImageUrl(url);
      setImageBroken(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploadingImage(false);
    }
  };

  // Inicializa el tipo de ITBIS cuando carga el catálogo: en edición legacy
  // (sin tipo) matchea por la tasa guardada; en alta usa el tipo por defecto.
  useEffect(() => {
    if (taxTypeCode) return;
    const list = taxTypes.data;
    if (!list?.length) return;
    const matchByRate = product
      ? list.find((t) => Number(t.rate) === Number(product.taxRate))
      : undefined;
    const def = list.find((t) => t.isDefault) ?? list[0];
    setTaxTypeCode((matchByRate ?? def)?.code ?? '');
  }, [taxTypes.data, product, taxTypeCode]);

  const finish = () => {
    if (onSuccess) onSuccess();
    else router.push('/products');
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
          imageUrl: imageUrl.trim() || null,
          categoryId: categoryId || null,
          costPrice,
          salePrice,
          ...(taxTypeCode && { taxTypeCode }),
          minStock,
          maxStock,
          reorderPoint,
          isActive,
          isKit,
          soldByWeight,
        };
        await update.mutateAsync(payload);
        finish();
      } else {
        const payload: CreateProductInput = {
          name,
          sku,
          ...(barcode && { barcode }),
          ...(description && { description }),
          ...(imageUrl.trim() && { imageUrl: imageUrl.trim() }),
          ...(categoryId && { categoryId }),
          costPrice,
          salePrice,
          ...(taxTypeCode && { taxTypeCode }),
          ...(initialStock && Number(initialStock) > 0 && { initialStock }),
          minStock,
          maxStock,
          reorderPoint,
          isActive,
          isKit,
          soldByWeight,
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
        <FormField
          label="Tipo de ITBIS"
          hint="Tasas del catálogo (Impuestos › Tipos de ITBIS)."
        >
          <Select
            value={taxTypeCode}
            onChange={(e) => setTaxTypeCode(e.target.value)}
            disabled={taxTypes.isLoading}
          >
            {!taxTypeCode && <option value="">Seleccione</option>}
            {taxTypes.data?.map((t) => (
              <option key={t.code} value={t.code}>
                {t.name} ({Number(t.rate).toFixed(2)}%)
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Stock mínimo">
          <Input
            value={minStock}
            onChange={(e) => setMinStock(e.target.value)}
            inputMode="decimal"
            pattern="^\d+(\.\d{1,3})?$"
          />
        </FormField>
        <FormField
          label="Punto de reorden"
          hint="Umbral de alerta de stock bajo. 0 = usa el mínimo."
        >
          <Input
            value={reorderPoint}
            onChange={(e) => setReorderPoint(e.target.value)}
            inputMode="decimal"
            pattern="^\d+(\.\d{1,3})?$"
          />
        </FormField>
        <FormField
          label="Stock máximo"
          hint="Tope deseado al reponer. 0 = sin definir."
        >
          <Input
            value={maxStock}
            onChange={(e) => setMaxStock(e.target.value)}
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

        <div className="sm:col-span-2">
          <FormField
            label="Imagen del producto"
            hint="Sube un archivo (se guarda en el CDN) o pega una URL pública. Se muestra en los tiles del POS."
          >
            <div className="flex items-start gap-3">
              <div className="flex flex-1 flex-col gap-2">
                <Input
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setImageBroken(false);
                  }}
                  placeholder="https://..."
                  maxLength={500}
                  inputMode="url"
                />
                <label
                  className={
                    'inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium transition hover:border-brand-from/50 hover:bg-brand-tint ' +
                    (uploadingImage ? 'pointer-events-none opacity-60' : '')
                  }
                >
                  <Upload className="h-3.5 w-3.5" />
                  {uploadingImage ? 'Subiendo…' : 'Subir imagen'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={onImageFile}
                    disabled={uploadingImage}
                  />
                </label>
              </div>
              {imageUrl.trim() && !imageBroken ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl.trim()}
                  alt="Vista previa"
                  onError={() => setImageBroken(true)}
                  className="h-14 w-14 flex-shrink-0 rounded-lg border border-border object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-[10px] text-muted-foreground">
                  {imageBroken ? 'URL inválida' : 'Sin img'}
                </div>
              )}
            </div>
          </FormField>
        </div>

        {isEdit && (
          <div className="sm:col-span-2">
            <Switch checked={isActive} onChange={setIsActive} label="Activo" />
          </div>
        )}

        <div className="sm:col-span-2">
          <Switch
            checked={isKit}
            onChange={setIsKit}
            label="Es un kit/combo"
          />
          {isKit && (
            <p className="mt-1 text-xs text-muted-foreground">
              Al venderlo se descuenta stock de sus componentes (no del kit).
              Configura los componentes después de guardar el producto.
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <Switch
            checked={soldByWeight}
            onChange={setSoldByWeight}
            label="Se vende por peso (kg)"
          />
          {soldByWeight && (
            <p className="mt-1 text-xs text-muted-foreground">
              En el POS se mostrará la unidad &quot;kg&quot; y el cajero podrá teclear
              cantidades con decimales (ej. 0.750).
            </p>
          )}
        </div>
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
