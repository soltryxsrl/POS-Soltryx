# T1ET POS

POS web escalable. Dos proyectos independientes en un mismo repo local:

- [`server/`](./server) — API NestJS + TypeORM + PostgreSQL
- [`client/`](./client) — Web Next.js (App Router) + Tailwind + shadcn/ui

Cada uno se instala y corre por separado, con su propio `package.json`, `tsconfig`, `.env`, y `node_modules`.

## Arquitectura

Hexagonal pragmática:
- **Server**: ports & adapters en módulos core (`Sales`, `Inventory`, `CashSessions`). CRUDs simples (Categories, Products) usan NestJS estándar.
- **Client**: features con `domain/` (types, ports) + `application/` (hooks, stores) + `infrastructure/` (adapter HTTP) + `ui/` (componentes y páginas).

## Stack

| Capa | Tecnología |
|---|---|
| API | NestJS 10 + TypeScript + TypeORM 0.3 |
| DB | PostgreSQL 16 |
| Web | Next.js 14 (App Router) + React 18 + Tailwind + shadcn/ui |
| Estado UI | Zustand |
| Estado servidor | TanStack Query |
| Auth | JWT access + refresh (cookie httpOnly) |

## Requisitos

- Node 20+ (recomendado LTS)
- pnpm 9+ (o npm)
- Docker (para Postgres local)

## Arranque (primera vez en una PC nueva)

```bash
# 1) Levantar Postgres
cd server
docker compose up -d postgres

# 2) Instalar dependencias + arrancar server
#    Las migraciones se aplican AUTOMÁTICAMENTE al arrancar (migrationsRun: true)
cp .env.example .env
pnpm install
pnpm seed       # crea admin + categoría "General" + caja "CR-001" (solo primera vez, idempotente)
pnpm dev        # http://localhost:3001

# 3) Cliente (en otra terminal)
cd ../client
cp .env.local.example .env.local
pnpm install
pnpm dev        # http://localhost:3000
```

Healthcheck: <http://localhost:3001/health>

> Postgres queda expuesto en `localhost:5433` (el `5432` lo usa otra instalación local).

## Arranque cotidiano (PC ya configurada)

```bash
docker compose up -d postgres        # desde server/
cd server && pnpm dev
cd client && pnpm dev                # otra terminal
```

Migraciones nuevas se aplican solas al arrancar el server.

## Credenciales por defecto

```
admin@t1et.local  /  Admin123!
```

## Comandos útiles

| Comando (desde `server/`) | Descripción |
|---|---|
| `pnpm dev` | Arranca API en modo watch (auto-corre migraciones pendientes) |
| `pnpm migration:run` | Aplica migraciones manualmente (normalmente innecesario) |
| `pnpm migration:revert` | Revierte la última migración |
| `pnpm migration:show` | Lista estado de migraciones |
| `pnpm seed` | Inserta datos iniciales (idempotente) |
| `docker compose up -d postgres` | Levanta DB |
| `docker compose down` | Detiene DB (mantiene datos) |
| `docker compose down -v` | Detiene DB **y borra datos** |

## Estado del proyecto

```
✅ Fase 1 — Base técnica (monorepo separado, Docker, migraciones, seed)
✅ Fase 2 — Auth (JWT + refresh rotativo, guards, decoradores)
✅ Fase 3 — Productos / Categorías / Inventario (stock movements, UoW)
✅ Fase 4 — Caja (open/close + summary)
✅ Fase 5 — Ventas / POS (transaccional + cancelación)
✅ Fase 6 — Reportes (KPI día, top productos, stock bajo, por método/cajero)
🔜 Fase 7 — Fiscal e-CF RD (tablas migradas, módulo pendiente)
```

## Notas

- Los tipos compartidos (enums DGII, `SaleStatus`, `PaymentMethod`, etc.) viven duplicados en `server/` y `client/`. Mantenerlos sincronizados manualmente al cambiarlos.
- `docker-compose.yml` vive en `server/` porque Postgres es responsabilidad del API.
- `migrationsRun: true` está activo en `server/src/config/typeorm.config.ts`. Si más adelante despliegas a producción y prefieres correr migraciones como step separado, cambia ese flag a `false`.
