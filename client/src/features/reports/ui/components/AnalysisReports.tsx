'use client';

import { formatMoney, formatQuantity } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import {
  useInventoryValuation,
  useProductMargins,
  useReturnsAnalysis,
  useSalesByCategory,
  useSlowMovers,
} from '../../application/hooks/use-reports';
import { StatCard } from './StatCard';

type RangeProps = { from?: string; to?: string; branchId?: string };

function Loading({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-6 text-center text-muted-foreground">
        Cargando...
      </td>
    </tr>
  );
}
function Empty({ cols, text }: { cols: number; text: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-6 text-center text-muted-foreground">
        {text}
      </td>
    </tr>
  );
}
function ErrorRow({ cols, error }: { cols: number; error: unknown }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-6 text-center text-destructive">
        {getErrorMessage(error)}
      </td>
    </tr>
  );
}

/** Valuación del inventario actual: tarjetas + desglose por categoría. */
export function InventoryValuationCard({ branchId }: { branchId?: string }) {
  const q = useInventoryValuation(branchId);
  const d = q.data;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Costo del inventario" value={d ? formatMoney(d.totalCost) : '—'} hint={d ? `${d.skusWithStock} SKU(s) con stock` : ''} />
        <StatCard label="Valor a precio de lista" value={d ? formatMoney(d.totalRetail) : '—'} />
        <StatCard label="Margen potencial" value={d ? formatMoney(d.potentialMargin) : '—'} tone="success" />
        <StatCard label="Unidades en stock" value={d ? formatQuantity(d.totalUnits) : '—'} />
      </div>
      <div className="rounded-lg border bg-card">
        <h3 className="border-b px-4 py-2 text-sm font-medium">Valuación por categoría</h3>
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Categoría</th>
              <th className="px-4 py-2 text-right">SKUs</th>
              <th className="px-4 py-2 text-right">Costo</th>
              <th className="px-4 py-2 text-right">Precio lista</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading && <Loading cols={4} />}
            {q.isError && <ErrorRow cols={4} error={q.error} />}
            {d?.byCategory.length === 0 && <Empty cols={4} text="Sin inventario." />}
            {d?.byCategory.map((c) => (
              <tr key={c.categoryId ?? 'none'} className="border-b last:border-0">
                <td className="px-4 py-2">{c.categoryName}</td>
                <td className="px-4 py-2 text-right text-muted-foreground">{c.skus}</td>
                <td className="px-4 py-2 text-right">{formatMoney(c.totalCost)}</td>
                <td className="px-4 py-2 text-right font-medium">{formatMoney(c.totalRetail)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Margen por producto sobre las ventas del rango. */
export function ProductMarginsTable({ from, to, branchId }: RangeProps) {
  const q = useProductMargins({ from, to, limit: 20, branchId });
  return (
    <div className="rounded-lg border bg-card">
      <h3 className="border-b px-4 py-2 text-sm font-medium">
        Margen por producto{' '}
        <span className="text-xs font-normal text-muted-foreground">(costo actual aprox.)</span>
      </h3>
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2">Producto</th>
            <th className="px-4 py-2 text-right">Vendido</th>
            <th className="px-4 py-2 text-right">Ingresos</th>
            <th className="px-4 py-2 text-right">Costo</th>
            <th className="px-4 py-2 text-right">Margen</th>
            <th className="px-4 py-2 text-right">%</th>
          </tr>
        </thead>
        <tbody>
          {q.isLoading && <Loading cols={6} />}
          {q.isError && <ErrorRow cols={6} error={q.error} />}
          {q.data?.length === 0 && <Empty cols={6} text="Sin ventas en el rango." />}
          {q.data?.map((p) => (
            <tr key={p.productId} className="border-b last:border-0">
              <td className="px-4 py-2">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.sku}</div>
              </td>
              <td className="px-4 py-2 text-right">{formatQuantity(p.unitsSold)}</td>
              <td className="px-4 py-2 text-right">{formatMoney(p.revenue)}</td>
              <td className="px-4 py-2 text-right text-muted-foreground">{formatMoney(p.cost)}</td>
              <td className="px-4 py-2 text-right font-medium">{formatMoney(p.margin)}</td>
              <td
                className={`px-4 py-2 text-right font-medium ${
                  parseFloat(p.marginPct) < 0 ? 'text-destructive' : 'text-emerald-600'
                }`}
              >
                {p.marginPct}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Productos con stock sin venta en N días (capital inmovilizado). */
export function SlowMoversTable({ days = 30, branchId }: { days?: number; branchId?: string }) {
  const q = useSlowMovers({ days, limit: 50, branchId });
  return (
    <div className="rounded-lg border bg-card">
      <h3 className="border-b px-4 py-2 text-sm font-medium">
        Lento movimiento{' '}
        <span className="text-xs font-normal text-muted-foreground">(sin venta en {days} días)</span>
      </h3>
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2">Producto</th>
            <th className="px-4 py-2">Categoría</th>
            <th className="px-4 py-2 text-right">Stock</th>
            <th className="px-4 py-2 text-right">Capital</th>
            <th className="px-4 py-2 text-right">Última venta</th>
          </tr>
        </thead>
        <tbody>
          {q.isLoading && <Loading cols={5} />}
          {q.isError && <ErrorRow cols={5} error={q.error} />}
          {q.data?.length === 0 && <Empty cols={5} text="Sin productos estancados. 🎉" />}
          {q.data?.map((p) => (
            <tr key={p.id} className="border-b last:border-0">
              <td className="px-4 py-2">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.sku}</div>
              </td>
              <td className="px-4 py-2 text-muted-foreground">{p.categoryName ?? '—'}</td>
              <td className="px-4 py-2 text-right">{formatQuantity(p.stock)}</td>
              <td className="px-4 py-2 text-right font-medium">{formatMoney(p.tiedUpCost)}</td>
              <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                {p.lastSoldAt ? new Date(p.lastSoldAt).toLocaleDateString('es-DO') : 'Nunca'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Ventas (ingresos) por categoría. */
export function SalesByCategoryTable({ from, to, branchId }: RangeProps) {
  const q = useSalesByCategory({ from, to, branchId });
  return (
    <div className="rounded-lg border bg-card">
      <h3 className="border-b px-4 py-2 text-sm font-medium">Ventas por categoría</h3>
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2">Categoría</th>
            <th className="px-4 py-2 text-right">Unidades</th>
            <th className="px-4 py-2 text-right">Ingresos</th>
          </tr>
        </thead>
        <tbody>
          {q.isLoading && <Loading cols={3} />}
          {q.isError && <ErrorRow cols={3} error={q.error} />}
          {q.data?.length === 0 && <Empty cols={3} text="Sin ventas en el rango." />}
          {q.data?.map((c) => (
            <tr key={c.categoryId ?? 'none'} className="border-b last:border-0">
              <td className="px-4 py-2">{c.categoryName}</td>
              <td className="px-4 py-2 text-right">{formatQuantity(c.unitsSold)}</td>
              <td className="px-4 py-2 text-right font-medium">{formatMoney(c.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Análisis de devoluciones: tarjetas + por método + por razón. */
export function ReturnsAnalysisCard({ from, to, branchId }: RangeProps) {
  const q = useReturnsAnalysis({ from, to, branchId });
  const d = q.data;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Devoluciones" value={d ? String(d.count) : '—'} tone={d && d.count > 0 ? 'warning' : 'default'} />
        <StatCard label="Total devuelto" value={d ? formatMoney(d.total) : '—'} />
        <StatCard label="ITBIS devuelto" value={d ? formatMoney(d.taxTotal) : '—'} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card">
          <h3 className="border-b px-4 py-2 text-sm font-medium">Por método de reembolso</h3>
          <table className="w-full text-sm">
            <tbody>
              {q.isLoading && <Loading cols={3} />}
              {q.isError && <ErrorRow cols={3} error={q.error} />}
              {d?.byMethod.length === 0 && <Empty cols={3} text="Sin devoluciones." />}
              {d?.byMethod.map((m) => (
                <tr key={m.refundMethod} className="border-b last:border-0">
                  <td className="px-4 py-2">{m.refundMethod}</td>
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground">{m.count}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatMoney(m.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-lg border bg-card">
          <h3 className="border-b px-4 py-2 text-sm font-medium">Por razón</h3>
          <table className="w-full text-sm">
            <tbody>
              {q.isLoading && <Loading cols={3} />}
              {q.isError && <ErrorRow cols={3} error={q.error} />}
              {d?.byReason.length === 0 && <Empty cols={3} text="Sin devoluciones." />}
              {d?.byReason.map((r, i) => (
                <tr key={`${r.reason}-${i}`} className="border-b last:border-0">
                  <td className="px-4 py-2">{r.reason}</td>
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground">{r.count}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatMoney(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
