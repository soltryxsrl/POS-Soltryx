'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatMoney, formatQuantity } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { useProducts, useRemoveProduct } from '../../application/hooks/use-products';
import { AdjustStockDialog } from '@/features/inventory/ui/components/AdjustStockDialog';

export function ProductsTable() {
  const [q, setQ] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const products = useProducts({ q: q || undefined, lowStock: onlyLow || undefined, limit: 100 });
  const remove = useRemoveProduct();
  const [adjustingId, setAdjustingId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          placeholder="Buscar por nombre, SKU o barcode..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-72 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyLow}
            onChange={(e) => setOnlyLow(e.target.checked)}
          />
          Solo stock bajo
        </label>
        <div className="ml-auto">
          <Link
            href="/dashboard/products/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            + Nuevo producto
          </Link>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">SKU</th>
              <th className="px-4 py-2">Categoría</th>
              <th className="px-4 py-2 text-right">Precio</th>
              <th className="px-4 py-2 text-right">Stock</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Cargando...
                </td>
              </tr>
            )}
            {products.isError && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-destructive">
                  {getErrorMessage(products.error)}
                </td>
              </tr>
            )}
            {products.data?.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No hay productos.
                </td>
              </tr>
            )}
            {products.data?.items.map((p) => {
              const low = Number(p.stock) <= Number(p.minStock) && Number(p.minStock) > 0;
              return (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-4 py-2 font-medium">
                    <Link href={`/dashboard/products/${p.id}`} className="hover:underline">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{p.sku}</td>
                  <td className="px-4 py-2 text-muted-foreground">{p.category?.name ?? '—'}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(p.salePrice)}</td>
                  <td className={`px-4 py-2 text-right ${low ? 'text-destructive font-medium' : ''}`}>
                    {formatQuantity(p.stock)}
                    {low && <span className="ml-1 text-xs">⚠</span>}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        p.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {p.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => setAdjustingId(p.id)}
                      className="text-xs text-primary hover:underline"
                    >
                      Ajustar stock
                    </button>
                    <Link
                      href={`/dashboard/products/${p.id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      Editar
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`¿Eliminar "${p.name}"?`)) remove.mutate(p.id);
                      }}
                      className="text-xs text-destructive hover:underline"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {products.data && (
          <div className="border-t px-4 py-2 text-xs text-muted-foreground">
            Total: {products.data.total} producto(s)
          </div>
        )}
      </div>

      {adjustingId && (
        <AdjustStockDialog
          productId={adjustingId}
          onClose={() => setAdjustingId(null)}
        />
      )}
    </div>
  );
}
