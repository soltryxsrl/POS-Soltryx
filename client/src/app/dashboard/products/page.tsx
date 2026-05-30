'use client';

import { ProductsTable } from '@/features/products/ui/components/ProductsTable';

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Productos</h1>
        <p className="text-sm text-muted-foreground">
          Catálogo de productos. El stock se mueve solo a través de inventario.
        </p>
      </div>
      <ProductsTable />
    </div>
  );
}
