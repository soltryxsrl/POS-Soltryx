-- =====================================================================
-- reset-demo.sql — Deja el POS en estado DEMO LIMPIO.
--
-- Borra TODO lo transaccional + TODO el catálogo. CONSERVA la base del seed
-- (roles, permisos, usuarios, sucursales, categoría 'General', cajas, tipos
-- fiscales/ITBIS, monedas, formas de pago) y la config del negocio
-- (business_settings). Resetea los contadores NCF a 1 y pone multi-sucursal OFF.
--
-- ⚠️  DESTRUCTIVO E IRREVERSIBLE. Hacer pg_dump de respaldo ANTES de correrlo.
--     Verificado contra un clon de la BD (transaccional+catálogo → 0; seed intacto).
--     Todo va en una transacción: si algo falla, no se aplica nada.
--
-- Uso (reemplaza <DB_URL> por la "External Database URL" de Render):
--   psql "<DB_URL>" -v ON_ERROR_STOP=1 -f reset-demo.sql
-- =====================================================================
BEGIN;

-- 1) Transaccional + sesiones + auditoría + tokens de sesión
TRUNCATE
  sale_return_items, sale_returns,
  payments, sale_items, sales,
  purchase_order_items, purchase_orders,
  cash_movements, cash_sessions,
  stock_count_items, stock_counts,
  stock_transfer_items, stock_transfers,
  stock_movements,
  fiscal_document_items, fiscal_documents, fiscal_provider_logs,
  customer_account_entries,
  parked_carts, price_history, audit_events,
  refresh_tokens
RESTART IDENTITY CASCADE;

-- 2) Catálogo completo (vaciar todo)
TRUNCATE
  product_kit_components, product_barcodes, product_variants, products,
  customers, suppliers, promotions
RESTART IDENTITY CASCADE;

-- 3) Categorías: conservar solo 'General' (la del seed)
DELETE FROM categories WHERE name <> 'General';

-- 4) Resetear contadores NCF: el demo emite comprobantes desde el inicio del rango
UPDATE fiscal_sequences SET next_number = range_from;

-- 5) Multi-sucursal OFF (demo mono-sucursal)
UPDATE plan_limits SET multi_branch_enabled = false WHERE id = 1;

COMMIT;
