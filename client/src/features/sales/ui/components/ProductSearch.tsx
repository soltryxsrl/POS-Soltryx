'use client';

import { useState, type KeyboardEvent } from 'react';
import { formatMoney, formatQuantity } from '@/shared/lib/format';
import { Input } from '@/shared/ui/controls/Input';
import { useProducts } from '@/features/products/application/hooks/use-products';
import type { Product } from '@/features/products/domain/types';

interface Props {
  onPick: (product: Product) => void;
}

/**
 * Buscador de producto por nombre, SKU o código de barras.
 * Si solo hay un resultado y el usuario presiona Enter → autoselect.
 */
export function ProductSearch({ onPick }: Props) {
  const [q, setQ] = useState('');
  const products = useProducts({ q: q || undefined, isActive: true, limit: 12 });

  const items = products.data?.items ?? [];

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && items.length > 0 && items[0]) {
      onPick(items[0]);
      setQ('');
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Busca por nombre, SKU o código de barras..."
          className="text-base"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Enter para agregar el primer resultado.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {products.isLoading && (
          <div className="col-span-full py-6 text-center text-muted-foreground">Buscando...</div>
        )}
        {!products.isLoading && items.length === 0 && (
          <div className="col-span-full py-6 text-center text-muted-foreground">
            {q ? 'Sin resultados.' : 'Empieza a escribir para buscar productos...'}
          </div>
        )}
        {items.map((p) => {
          const stockNum = Number(p.stock);
          const minNum = Number(p.minStock);
          const low = stockNum <= minNum && minNum > 0;
          const out = stockNum <= 0;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick(p)}
              disabled={out}
              className="flex flex-col items-start rounded-lg border bg-card p-3 text-left transition hover:border-primary/40 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="line-clamp-2 text-sm font-medium">{p.name}</span>
              <span className="mt-0.5 text-xs text-muted-foreground">{p.sku}</span>
              <div className="mt-2 flex w-full items-baseline justify-between">
                <span className="text-sm font-semibold">{formatMoney(p.salePrice)}</span>
                <span
                  className={`text-xs ${
                    out ? 'text-destructive' : low ? 'text-amber-700' : 'text-muted-foreground'
                  }`}
                >
                  Stock: {formatQuantity(p.stock)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
