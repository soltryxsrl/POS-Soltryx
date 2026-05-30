'use client';

import { ProductForm } from '@/features/products/ui/components/ProductForm';

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nuevo producto</h1>
        <p className="text-sm text-muted-foreground">
          Si indicas un stock inicial &gt; 0 se registrará un movimiento{' '}
          <code>PURCHASE</code> automáticamente.
        </p>
      </div>
      <ProductForm />
    </div>
  );
}
