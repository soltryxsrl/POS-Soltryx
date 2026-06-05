'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatQuantity } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { useLowStock } from '../../application/hooks/use-reports';
import { ReportPager } from './ReportShell';

const PAGE = 50;

export function LowStockTable({ branchId }: { branchId?: string } = {}) {
  const [offset, setOffset] = useState(0);
  useEffect(() => setOffset(0), [branchId]);
  const q = useLowStock({ branchId, limit: PAGE, offset });
  const d = q.data;

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h3 className="text-sm font-medium">Stock bajo</h3>
        {d && d.total > 0 && (
          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
            {d.total} producto(s)
          </span>
        )}
      </div>
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2">Producto</th>
            <th className="px-4 py-2">Categoría</th>
            <th className="px-4 py-2 text-right">Stock</th>
            <th className="px-4 py-2 text-right">Umbral</th>
          </tr>
        </thead>
        <tbody>
          {q.isLoading && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                Cargando...
              </td>
            </tr>
          )}
          {q.isError && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-destructive">
                {getErrorMessage(q.error)}
              </td>
            </tr>
          )}
          {d?.items.length === 0 && !q.isLoading && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                Ningún producto bajo su umbral.
              </td>
            </tr>
          )}
          {d?.items.map((p) => (
            <tr key={p.id} className="border-b last:border-0">
              <td className="px-4 py-2">
                <Link href={`/products/${p.id}`} className="font-medium hover:underline">
                  {p.name}
                </Link>
                <div className="text-xs text-muted-foreground">{p.sku}</div>
              </td>
              <td className="px-4 py-2 text-muted-foreground">{p.categoryName ?? '—'}</td>
              <td className="px-4 py-2 text-right font-medium text-destructive">
                {formatQuantity(p.stock)}
              </td>
              <td
                className="px-4 py-2 text-right text-muted-foreground"
                title={
                  Number(p.reorderPoint) > 0
                    ? `Punto de reorden ${formatQuantity(p.reorderPoint)}`
                    : `Stock mínimo ${formatQuantity(p.minStock)}`
                }
              >
                {formatQuantity(p.threshold)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ReportPager total={d?.total ?? 0} limit={PAGE} offset={offset} onChange={setOffset} />
    </div>
  );
}
