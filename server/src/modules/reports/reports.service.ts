import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface DailySalesSummary {
  date: string;
  salesCount: number;
  cancelledCount: number;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  total: string;
  byMethod: Array<{ method: string; count: number; total: string }>;
  byUser: Array<{ userId: string; username: string; fullName: string; salesCount: number; total: string }>;
}

export interface TopProduct {
  productId: string;
  name: string;
  sku: string;
  unitsSold: string;
  revenue: string;
}

export interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  stock: string;
  minStock: string;
  categoryName: string | null;
}

export interface SalesByMethod {
  method: string;
  count: number;
  total: string;
}

export interface SessionsByUser {
  userId: string;
  username: string;
  fullName: string;
  sessionsCount: number;
  salesCount: number;
  totalSold: string;
}

export interface InventoryValuation {
  skusWithStock: number;
  totalUnits: string;
  totalCost: string;
  totalRetail: string;
  /** Margen potencial = retail - costo (si se vendiera todo a precio de lista). */
  potentialMargin: string;
  byCategory: Array<{
    categoryId: string | null;
    categoryName: string;
    skus: number;
    totalCost: string;
    totalRetail: string;
  }>;
}

export interface ProductMargin {
  productId: string;
  name: string;
  sku: string;
  unitsSold: string;
  revenue: string;
  /** Costo aproximado = unidades × costo ACTUAL del producto (no histórico). */
  cost: string;
  margin: string;
  marginPct: string;
}

export interface SlowMover {
  id: string;
  name: string;
  sku: string;
  stock: string;
  costPrice: string;
  /** Capital inmovilizado = stock × costo. */
  tiedUpCost: string;
  categoryName: string | null;
  lastSoldAt: string | null;
}

export interface CategorySales {
  categoryId: string | null;
  categoryName: string;
  unitsSold: string;
  revenue: string;
}

export interface ReturnsAnalysis {
  count: number;
  total: string;
  taxTotal: string;
  byMethod: Array<{ refundMethod: string; count: number; total: string }>;
  byReason: Array<{ reason: string; count: number; total: string }>;
}

@Injectable()
export class ReportsService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  /**
   * Resumen completo del día (timezone-aware: usa la zona de la conexión).
   * Por defecto: hoy en la TZ de la app.
   */
  async dailySummary(date: string, branchId: string | null): Promise<DailySalesSummary> {
    // branchId null = CONSOLIDADO (todas las sucursales). El patrón
    // `$2::uuid IS NULL OR ... = $2` filtra por sucursal o no, según el param.
    const [agg]: Array<{
      sales_count: string;
      subtotal: string | null;
      discount_total: string | null;
      tax_total: string | null;
      total: string | null;
    }> = await this.ds.query(
      `SELECT COUNT(*)::int AS sales_count,
              COALESCE(SUM(subtotal), 0)::text AS subtotal,
              COALESCE(SUM(discount_total), 0)::text AS discount_total,
              COALESCE(SUM(tax_total), 0)::text AS tax_total,
              COALESCE(SUM(total), 0)::text AS total
       FROM sales
       WHERE status = 'COMPLETED'
         AND ($2::uuid IS NULL OR branch_id = $2)
         AND created_at::date = $1::date`,
      [date, branchId],
    );

    const [cancelledRow]: Array<{ cancelled_count: number }> = await this.ds.query(
      `SELECT COUNT(*)::int AS cancelled_count
       FROM sales
       WHERE status = 'CANCELLED'
         AND ($2::uuid IS NULL OR branch_id = $2)
         AND created_at::date = $1::date`,
      [date, branchId],
    );

    const byMethod: Array<{ method: string; count: number; total: string }> =
      await this.ds.query(
        `SELECT p.method::text AS method,
                COUNT(*)::int AS count,
                COALESCE(SUM(p.amount), 0)::text AS total
         FROM payments p
         JOIN sales s ON s.id = p.sale_id
         WHERE s.status = 'COMPLETED'
           AND ($2::uuid IS NULL OR s.branch_id = $2)
           AND s.created_at::date = $1::date
           AND p.status = 'COMPLETED'
         GROUP BY p.method
         ORDER BY total DESC`,
        [date, branchId],
      );

    // El monto por método suma p.amount (lo TENDIDO). En efectivo eso incluye el
    // vuelto, así que la suma de métodos excede el total de ventas. Calculamos el
    // vuelto total (solo el efectivo da vuelto) para descontarlo del efectivo y
    // que los métodos reconcilien con el total de ventas.
    const [changeRow]: Array<{ change: string }> = await this.ds.query(
      `SELECT COALESCE(SUM(GREATEST(0, paid - total)), 0)::text AS change
       FROM (
         SELECT s.total, SUM(p.amount) AS paid
         FROM sales s
         JOIN payments p ON p.sale_id = s.id
         WHERE s.status = 'COMPLETED'
           AND ($2::uuid IS NULL OR s.branch_id = $2)
           AND s.created_at::date = $1::date
           AND p.status = 'COMPLETED'
         GROUP BY s.id, s.total
       ) t`,
      [date, branchId],
    );
    const cashChange = Number(changeRow?.change ?? 0);

    const byUser: Array<{
      user_id: string;
      username: string;
      full_name: string;
      sales_count: number;
      total: string;
    }> = await this.ds.query(
      `SELECT s.user_id,
              u.username,
              u.full_name,
              COUNT(*)::int AS sales_count,
              COALESCE(SUM(s.total), 0)::text AS total
       FROM sales s
       JOIN users u ON u.id = s.user_id
       WHERE s.status = 'COMPLETED'
         AND ($2::uuid IS NULL OR s.branch_id = $2)
         AND s.created_at::date = $1::date
       GROUP BY s.user_id, u.username, u.full_name
       ORDER BY total DESC`,
      [date, branchId],
    );

    return {
      date,
      salesCount: agg?.sales_count ? Number(agg.sales_count) : 0,
      cancelledCount: cancelledRow?.cancelled_count ?? 0,
      subtotal: agg?.subtotal ?? '0.00',
      discountTotal: agg?.discount_total ?? '0.00',
      taxTotal: agg?.tax_total ?? '0.00',
      total: agg?.total ?? '0.00',
      byMethod: byMethod
        .map((r) => ({
          method: r.method,
          count: Number(r.count),
          // El efectivo se neta del vuelto; los demás métodos no dan vuelto.
          total:
            r.method === 'CASH'
              ? Math.max(0, Number(r.total) - cashChange).toFixed(2)
              : r.total,
        }))
        .sort((a, b) => Number(b.total) - Number(a.total)),
      byUser: byUser.map((r) => ({
        userId: r.user_id,
        username: r.username,
        fullName: r.full_name,
        salesCount: Number(r.sales_count),
        total: r.total,
      })),
    };
  }

  async topProducts(
    from: string,
    to: string,
    limit: number,
    branchId: string | null,
  ): Promise<TopProduct[]> {
    const rows: Array<{
      product_id: string;
      name: string;
      sku: string;
      units_sold: string;
      revenue: string;
    }> = await this.ds.query(
      `SELECT si.product_id,
              MAX(si.product_name_snapshot) AS name,
              MAX(si.product_sku_snapshot)  AS sku,
              COALESCE(SUM(si.quantity), 0)::text AS units_sold,
              COALESCE(SUM(si.total), 0)::text    AS revenue
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       WHERE s.status = 'COMPLETED'
         AND ($4::uuid IS NULL OR s.branch_id = $4)
         AND s.created_at::date BETWEEN $1::date AND $2::date
       GROUP BY si.product_id
       ORDER BY revenue DESC
       LIMIT $3`,
      [from, to, limit, branchId],
    );
    return rows.map((r) => ({
      productId: r.product_id,
      name: r.name,
      sku: r.sku,
      unitsSold: r.units_sold,
      revenue: r.revenue,
    }));
  }

  async lowStock(branchId: string | null): Promise<LowStockProduct[]> {
    const rows: Array<{
      id: string;
      name: string;
      sku: string;
      stock: string;
      min_stock: string;
      category_name: string | null;
    }> = await this.ds.query(
      `SELECT p.id, p.name, p.sku, p.stock::text, p.min_stock::text,
              c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.is_active = true
         AND ($1::uuid IS NULL OR p.branch_id = $1)
         AND p.deleted_at IS NULL
         AND p.min_stock > 0
         AND p.stock <= p.min_stock
       ORDER BY (p.stock - p.min_stock) ASC, p.name ASC`,
      [branchId],
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      sku: r.sku,
      stock: r.stock,
      minStock: r.min_stock,
      categoryName: r.category_name,
    }));
  }

  async salesByMethod(from: string, to: string, branchId: string | null): Promise<SalesByMethod[]> {
    const rows: Array<{ method: string; count: number; total: string }> =
      await this.ds.query(
        `SELECT p.method::text AS method,
                COUNT(*)::int AS count,
                COALESCE(SUM(p.amount), 0)::text AS total
         FROM payments p
         JOIN sales s ON s.id = p.sale_id
         WHERE s.status = 'COMPLETED'
           AND p.status = 'COMPLETED'
           AND ($3::uuid IS NULL OR s.branch_id = $3)
           AND s.created_at::date BETWEEN $1::date AND $2::date
         GROUP BY p.method
         ORDER BY total DESC`,
        [from, to, branchId],
      );
    // p.amount incluye el vuelto en efectivo → descontamos el vuelto del efectivo
    // para que los métodos reconcilien con el total vendido (solo efectivo da vuelto).
    const [changeRow]: Array<{ change: string }> = await this.ds.query(
      `SELECT COALESCE(SUM(GREATEST(0, paid - total)), 0)::text AS change
       FROM (
         SELECT s.total, SUM(p.amount) AS paid
         FROM sales s
         JOIN payments p ON p.sale_id = s.id
         WHERE s.status = 'COMPLETED'
           AND p.status = 'COMPLETED'
           AND ($3::uuid IS NULL OR s.branch_id = $3)
           AND s.created_at::date BETWEEN $1::date AND $2::date
         GROUP BY s.id, s.total
       ) t`,
      [from, to, branchId],
    );
    const cashChange = Number(changeRow?.change ?? 0);
    return rows
      .map((r) => ({
        method: r.method,
        count: Number(r.count),
        total:
          r.method === 'CASH'
            ? Math.max(0, Number(r.total) - cashChange).toFixed(2)
            : r.total,
      }))
      .sort((a, b) => Number(b.total) - Number(a.total));
  }

  async sessionsByUser(from: string, to: string, branchId: string | null): Promise<SessionsByUser[]> {
    const rows: Array<{
      user_id: string;
      username: string;
      full_name: string;
      sessions_count: number;
      sales_count: number;
      total_sold: string;
    }> = await this.ds.query(
      `SELECT u.id AS user_id,
              u.username,
              u.full_name,
              COUNT(DISTINCT cs.id)::int AS sessions_count,
              COUNT(s.id) FILTER (WHERE s.status = 'COMPLETED')::int AS sales_count,
              COALESCE(SUM(s.total) FILTER (WHERE s.status = 'COMPLETED'), 0)::text AS total_sold
       FROM cash_sessions cs
       JOIN users u ON u.id = cs.opened_by_id
       LEFT JOIN sales s ON s.cash_session_id = cs.id
       WHERE ($3::uuid IS NULL OR cs.branch_id = $3)
         AND cs.opened_at::date BETWEEN $1::date AND $2::date
       GROUP BY u.id, u.username, u.full_name
       ORDER BY total_sold DESC`,
      [from, to, branchId],
    );
    return rows.map((r) => ({
      userId: r.user_id,
      username: r.username,
      fullName: r.full_name,
      sessionsCount: Number(r.sessions_count),
      salesCount: Number(r.sales_count),
      totalSold: r.total_sold,
    }));
  }

  /** Valuación del inventario ACTUAL (a costo y a precio de lista) + por categoría. */
  async inventoryValuation(branchId: string | null): Promise<InventoryValuation> {
    const [agg]: Array<{
      skus: string;
      units: string;
      cost: string;
      retail: string;
    }> = await this.ds.query(
      `SELECT COUNT(*) FILTER (WHERE p.stock > 0)::int AS skus,
              COALESCE(SUM(p.stock), 0)::text AS units,
              ROUND(COALESCE(SUM(p.stock * p.cost_price), 0), 2)::text AS cost,
              ROUND(COALESCE(SUM(p.stock * p.sale_price), 0), 2)::text AS retail
       FROM products p
       WHERE p.deleted_at IS NULL AND p.is_active = true
         AND ($1::uuid IS NULL OR p.branch_id = $1)`,
      [branchId],
    );
    const byCategory: Array<{
      category_id: string | null;
      category_name: string | null;
      skus: number;
      cost: string;
      retail: string;
    }> = await this.ds.query(
      `SELECT c.id AS category_id, c.name AS category_name,
              COUNT(*) FILTER (WHERE p.stock > 0)::int AS skus,
              ROUND(COALESCE(SUM(p.stock * p.cost_price), 0), 2)::text AS cost,
              ROUND(COALESCE(SUM(p.stock * p.sale_price), 0), 2)::text AS retail
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.deleted_at IS NULL AND p.is_active = true
         AND ($1::uuid IS NULL OR p.branch_id = $1)
       GROUP BY c.id, c.name
       ORDER BY cost DESC`,
      [branchId],
    );
    const cost = agg?.cost ?? '0.00';
    const retail = agg?.retail ?? '0.00';
    return {
      skusWithStock: agg?.skus ? Number(agg.skus) : 0,
      totalUnits: agg?.units ?? '0.000',
      totalCost: cost,
      totalRetail: retail,
      potentialMargin: subtractDecimals(retail, cost),
      byCategory: byCategory.map((r) => ({
        categoryId: r.category_id,
        categoryName: r.category_name ?? '(Sin categoría)',
        skus: Number(r.skus),
        totalCost: r.cost,
        totalRetail: r.retail,
      })),
    };
  }

  /**
   * Margen por producto sobre las ventas del rango. El costo usa el snapshot
   * vigente al vender (`unit_cost_snapshot`, promedio móvil) y cae al costo
   * ACTUAL del producto para ventas previas a esa columna.
   */
  async productMargins(
    from: string,
    to: string,
    limit: number,
    branchId: string | null,
  ): Promise<ProductMargin[]> {
    const rows: Array<{
      product_id: string;
      name: string;
      sku: string;
      units: string;
      revenue: string;
      cost: string;
    }> = await this.ds.query(
      `SELECT si.product_id,
              MAX(si.product_name_snapshot) AS name,
              MAX(si.product_sku_snapshot)  AS sku,
              COALESCE(SUM(si.quantity), 0)::text AS units,
              ROUND(COALESCE(SUM(si.total), 0), 2)::text    AS revenue,
              ROUND(COALESCE(SUM(si.quantity * COALESCE(si.unit_cost_snapshot, p.cost_price, 0)), 0), 2)::text AS cost
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id AND s.status = 'COMPLETED'
       LEFT JOIN products p ON p.id = si.product_id
       WHERE si.product_id IS NOT NULL
         AND s.created_at::date BETWEEN $1::date AND $2::date
         AND ($4::uuid IS NULL OR s.branch_id = $4)
       GROUP BY si.product_id
       ORDER BY (COALESCE(SUM(si.total), 0) - COALESCE(SUM(si.quantity * COALESCE(si.unit_cost_snapshot, p.cost_price, 0)), 0)) DESC
       LIMIT $3`,
      [from, to, limit, branchId],
    );
    return rows.map((r) => {
      const revenue = r.revenue;
      const cost = r.cost;
      const margin = subtractDecimals(revenue, cost);
      const rev = parseFloat(revenue);
      const marginPct = rev > 0 ? ((parseFloat(margin) / rev) * 100).toFixed(2) : '0.00';
      return {
        productId: r.product_id,
        name: r.name,
        sku: r.sku,
        unitsSold: r.units,
        revenue,
        cost,
        margin,
        marginPct,
      };
    });
  }

  /** Productos con stock que NO se han vendido en los últimos `days` días. */
  async slowMovers(
    days: number,
    limit: number,
    branchId: string | null,
  ): Promise<SlowMover[]> {
    const rows: Array<{
      id: string;
      name: string;
      sku: string;
      stock: string;
      cost_price: string;
      category_name: string | null;
      last_sold_at: string | null;
    }> = await this.ds.query(
      `SELECT p.id, p.name, p.sku, p.stock::text, p.cost_price::text,
              c.name AS category_name,
              (SELECT MAX(s.created_at)
                 FROM sale_items si JOIN sales s ON s.id = si.sale_id AND s.status = 'COMPLETED'
                WHERE si.product_id = p.id) AS last_sold_at
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.deleted_at IS NULL AND p.is_active = true AND p.stock > 0
         AND ($3::uuid IS NULL OR p.branch_id = $3)
         AND NOT EXISTS (
           SELECT 1 FROM sale_items si
           JOIN sales s ON s.id = si.sale_id AND s.status = 'COMPLETED'
           WHERE si.product_id = p.id
             AND s.created_at >= now() - make_interval(days => $1)
         )
       ORDER BY last_sold_at ASC NULLS FIRST, (p.stock * p.cost_price) DESC
       LIMIT $2`,
      [days, limit, branchId],
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      sku: r.sku,
      stock: r.stock,
      costPrice: r.cost_price,
      tiedUpCost: multiplyDecimals(r.stock, r.cost_price),
      categoryName: r.category_name,
      lastSoldAt: r.last_sold_at ? new Date(r.last_sold_at).toISOString() : null,
    }));
  }

  /** Ventas (ingresos) por categoría en el rango. */
  async salesByCategory(
    from: string,
    to: string,
    branchId: string | null,
  ): Promise<CategorySales[]> {
    const rows: Array<{
      category_id: string | null;
      category_name: string | null;
      units: string;
      revenue: string;
    }> = await this.ds.query(
      `SELECT c.id AS category_id, c.name AS category_name,
              COALESCE(SUM(si.quantity), 0)::text AS units,
              COALESCE(SUM(si.total), 0)::text AS revenue
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id AND s.status = 'COMPLETED'
       LEFT JOIN products p ON p.id = si.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE s.created_at::date BETWEEN $1::date AND $2::date
         AND ($3::uuid IS NULL OR s.branch_id = $3)
       GROUP BY c.id, c.name
       ORDER BY revenue DESC`,
      [from, to, branchId],
    );
    return rows.map((r) => ({
      categoryId: r.category_id,
      categoryName: r.category_name ?? '(Sin categoría)',
      unitsSold: r.units,
      revenue: r.revenue,
    }));
  }

  /** Análisis de devoluciones del rango: volumen, por método y por razón. */
  async returnsAnalysis(
    from: string,
    to: string,
    branchId: string | null,
  ): Promise<ReturnsAnalysis> {
    const [agg]: Array<{ count: number; total: string; tax: string }> = await this.ds.query(
      `SELECT COUNT(*)::int AS count,
              COALESCE(SUM(total), 0)::text AS total,
              COALESCE(SUM(tax_total), 0)::text AS tax
       FROM sale_returns
       WHERE created_at::date BETWEEN $1::date AND $2::date
         AND ($3::uuid IS NULL OR branch_id = $3)`,
      [from, to, branchId],
    );
    const byMethod: Array<{ refund_method: string; count: number; total: string }> =
      await this.ds.query(
        `SELECT refund_method, COUNT(*)::int AS count, COALESCE(SUM(total), 0)::text AS total
         FROM sale_returns
         WHERE created_at::date BETWEEN $1::date AND $2::date
           AND ($3::uuid IS NULL OR branch_id = $3)
         GROUP BY refund_method
         ORDER BY total DESC`,
        [from, to, branchId],
      );
    const byReason: Array<{ reason: string | null; count: number; total: string }> =
      await this.ds.query(
        `SELECT COALESCE(NULLIF(TRIM(reason), ''), '(Sin razón)') AS reason,
                COUNT(*)::int AS count, COALESCE(SUM(total), 0)::text AS total
         FROM sale_returns
         WHERE created_at::date BETWEEN $1::date AND $2::date
           AND ($3::uuid IS NULL OR branch_id = $3)
         GROUP BY 1
         ORDER BY count DESC`,
        [from, to, branchId],
      );
    return {
      count: agg?.count ? Number(agg.count) : 0,
      total: agg?.total ?? '0.00',
      taxTotal: agg?.tax ?? '0.00',
      byMethod: byMethod.map((r) => ({
        refundMethod: r.refund_method,
        count: Number(r.count),
        total: r.total,
      })),
      byReason: byReason.map((r) => ({
        reason: r.reason ?? '(Sin razón)',
        count: Number(r.count),
        total: r.total,
      })),
    };
  }
}

/** Resta de decimales "a.bb" en centavos, devuelve "a.bb" (admite negativos). */
function subtractDecimals(a: string, b: string): string {
  const cents = Math.round(parseFloat(a) * 100) - Math.round(parseFloat(b) * 100);
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.trunc(abs / 100)}.${(abs % 100).toString().padStart(2, '0')}`;
}

/** Multiplica stock (3 dp) × costo (2 dp) → monto "a.bb". */
function multiplyDecimals(qty: string, price: string): string {
  const cents = Math.round(parseFloat(qty) * parseFloat(price) * 100);
  return `${Math.trunc(cents / 100)}.${(cents % 100).toString().padStart(2, '0')}`;
}
