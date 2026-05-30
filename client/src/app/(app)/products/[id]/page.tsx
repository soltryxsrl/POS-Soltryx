'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { BarcodesManager } from '@/features/products/ui/components/BarcodesManager';
import { KitComponentsManager } from '@/features/products/ui/components/KitComponentsManager';
import { ProductForm } from '@/features/products/ui/components/ProductForm';
import { VariantsManager } from '@/features/products/ui/components/VariantsManager';
import { useProduct } from '@/features/products/application/hooks/use-products';
import { StockMovementsTable } from '@/features/inventory/ui/components/StockMovementsTable';
import { formatQuantity } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const product = useProduct(id);

  if (product.isLoading) {
    return (
      <div className="py-12 text-center text-muted-foreground">Cargando producto...</div>
    );
  }
  if (product.isError || !product.data) {
    return (
      <div className="space-y-3">
        <p className="text-destructive">{getErrorMessage(product.error)}</p>
        <Link href="/products" className="text-sm text-primary hover:underline">
          ← Volver a productos
        </Link>
      </div>
    );
  }
  const p = product.data;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/products" className="text-sm text-muted-foreground hover:text-foreground">
          ← Productos
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{p.name}</h1>
        <p className="text-sm text-muted-foreground">
          SKU: <code>{p.sku}</code> · Stock actual: <strong>{formatQuantity(p.stock)}</strong>
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Editar datos</h2>
        <ProductForm product={p} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Códigos de barras</h2>
        <BarcodesManager productId={p.id} />
      </section>

      {p.isKit && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Componentes del kit</h2>
          <KitComponentsManager productId={p.id} />
        </section>
      )}

      {!p.isKit && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Variantes</h2>
          <VariantsManager product={p} />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Historial de stock</h2>
        <StockMovementsTable productId={p.id} />
      </section>
    </div>
  );
}
