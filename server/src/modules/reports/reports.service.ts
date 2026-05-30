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

@Injectable()
export class ReportsService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  /**
   * Resumen completo del día (timezone-aware: usa la zona de la conexión).
   * Por defecto: hoy en la TZ de la app.
   */
  async dailySummary(date: string): Promise<DailySalesSummary> {
    // Sumas globales (solo COMPLETED), conteo de canceladas aparte
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
         AND created_at::date = $1::date`,
      [date],
    );

    const [cancelledRow]: Array<{ cancelled_count: number }> = await this.ds.query(
      `SELECT COUNT(*)::int AS cancelled_count
       FROM sales
       WHERE status = 'CANCELLED'
         AND created_at::date = $1::date`,
      [date],
    );

    const byMethod: Array<{ method: string; count: number; total: string }> =
      await this.ds.query(
        `SELECT p.method::text AS method,
                COUNT(*)::int AS count,
                COALESCE(SUM(p.amount), 0)::text AS total
         FROM payments p
         JOIN sales s ON s.id = p.sale_id
         WHERE s.status = 'COMPLETED'
           AND s.created_at::date = $1::date
           AND p.status = 'COMPLETED'
         GROUP BY p.method
         ORDER BY total DESC`,
        [date],
      );

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
         AND s.created_at::date = $1::date
       GROUP BY s.user_id, u.username, u.full_name
       ORDER BY total DESC`,
      [date],
    );

    return {
      date,
      salesCount: agg?.sales_count ? Number(agg.sales_count) : 0,
      cancelledCount: cancelledRow?.cancelled_count ?? 0,
      subtotal: agg?.subtotal ?? '0.00',
      discountTotal: agg?.discount_total ?? '0.00',
      taxTotal: agg?.tax_total ?? '0.00',
      total: agg?.total ?? '0.00',
      byMethod: byMethod.map((r) => ({
        method: r.method,
        count: Number(r.count),
        total: r.total,
      })),
      byUser: byUser.map((r) => ({
        userId: r.user_id,
        username: r.username,
        fullName: r.full_name,
        salesCount: Number(r.sales_count),
        total: r.total,
      })),
    };
  }

  async topProducts(from: string, to: string, limit = 10): Promise<TopProduct[]> {
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
         AND s.created_at::date BETWEEN $1::date AND $2::date
       GROUP BY si.product_id
       ORDER BY revenue DESC
       LIMIT $3`,
      [from, to, limit],
    );
    return rows.map((r) => ({
      productId: r.product_id,
      name: r.name,
      sku: r.sku,
      unitsSold: r.units_sold,
      revenue: r.revenue,
    }));
  }

  async lowStock(): Promise<LowStockProduct[]> {
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
         AND p.deleted_at IS NULL
         AND p.min_stock > 0
         AND p.stock <= p.min_stock
       ORDER BY (p.stock - p.min_stock) ASC, p.name ASC`,
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

  async salesByMethod(from: string, to: string): Promise<SalesByMethod[]> {
    const rows: Array<{ method: string; count: number; total: string }> =
      await this.ds.query(
        `SELECT p.method::text AS method,
                COUNT(*)::int AS count,
                COALESCE(SUM(p.amount), 0)::text AS total
         FROM payments p
         JOIN sales s ON s.id = p.sale_id
         WHERE s.status = 'COMPLETED'
           AND p.status = 'COMPLETED'
           AND s.created_at::date BETWEEN $1::date AND $2::date
         GROUP BY p.method
         ORDER BY total DESC`,
        [from, to],
      );
    return rows.map((r) => ({
      method: r.method,
      count: Number(r.count),
      total: r.total,
    }));
  }

  async sessionsByUser(from: string, to: string): Promise<SessionsByUser[]> {
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
       WHERE cs.opened_at::date BETWEEN $1::date AND $2::date
       GROUP BY u.id, u.username, u.full_name
       ORDER BY total_sold DESC`,
      [from, to],
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
}
