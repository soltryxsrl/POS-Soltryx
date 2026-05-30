# Restaurar / arrancar T1ET en una PC nueva

Guía para clonar este proyecto en otra máquina y dejarlo corriendo.
También sirve cuando algo se rompió y quieres volver a un estado limpio.

---

## 0. Requisitos previos (instalar una vez por PC)

| Tool | Versión mínima | Cómo verificar |
|---|---|---|
| **Node.js** | 20 LTS (probado con 24) | `node --version` |
| **pnpm** | 9+ (probado con 10) | `pnpm --version` |
| **Docker Desktop** | 20+ (probado con 28) | `docker --version` |
| **Git** | cualquiera reciente | `git --version` |

Si falta pnpm:
```bash
npm install -g pnpm
```

> **Importante en Windows:** si tienes un Postgres nativo de Windows corriendo en el puerto 5432, **no hay conflicto** — este proyecto usa `5433`. Verifícalo con `netstat -ano | findstr ":5432"`.

---

## 1. Clonar y entrar al repo

```bash
git clone <url-del-repo> T1ET
cd T1ET
```

Estructura que deberías ver:
```
T1ET/
├── client/           ← Next.js (frontend)
├── server/           ← NestJS (backend) + docker-compose
├── README.md
└── restore.md        ← este archivo
```

---

## 2. Backend (`server/`)

```bash
cd server

# 2.1 — Variables de entorno (no se commitea el .env real)
cp .env.example .env
#       ↑ revisa que DB_PORT=5433 y que JWT_*_SECRET tengan ≥32 caracteres

# 2.2 — Dependencias
pnpm install

# 2.3 — Postgres (Docker)
docker compose up -d postgres
#       ↑ crea contenedor "t1et_postgres" + volumen "t1et_pg_data"

# 2.4 — Datos iniciales (admin + categoría + caja)
#       Solo primera vez. Es idempotente (puedes correrlo de nuevo sin problemas).
pnpm seed

# 2.5 — Arrancar
pnpm dev
```

**Las migraciones se aplican AUTOMÁTICAMENTE** al arrancar el server gracias a `migrationsRun: true` en `server/src/config/typeorm.config.ts`. Cualquier migración nueva que agregues en el futuro corre sola al hacer `pnpm dev` o `pnpm start`.

Verifica que esté arriba:
- Health: <http://localhost:3001/health> → `{"status":"ok","info":{"database":{"status":"up"}}}`

---

## 3. Frontend (`client/`)

En **otra terminal**:

```bash
cd client

cp .env.local.example .env.local

pnpm install

pnpm dev
```

Abre <http://localhost:3000> y entra con:

```
admin@t1et.local
Admin123!
```

---

## 4. Comandos del día a día

### En `server/`

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Arranca API en watch mode (auto-aplica migraciones pendientes) |
| `pnpm seed` | Re-corre el seed (idempotente; no duplica nada) |
| `docker compose up -d postgres` | Levanta Postgres |
| `docker compose stop postgres` | Detiene Postgres (mantiene datos) |
| `pnpm migration:show` | Lista estado de migraciones |
| `pnpm migration:run` | Aplica migraciones manualmente (no suele ser necesario) |
| `pnpm migration:revert` | Revierte la última migración |
| `pnpm typecheck` | Chequea TypeScript |
| `pnpm test` | Tests (cuando los agregues) |

### En `client/`

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Next.js en watch mode |
| `pnpm build` | Build de producción |
| `pnpm typecheck` | Chequea TypeScript |

---

## 5. Wipeo completo (volver a foja cero)

Cuando quieras tirar todo y arrancar como recién clonado:

```bash
cd server

# 5.1 — Tira contenedor + volumen (BORRA TODA la data)
docker compose down -v

# 5.2 — Borra builds y caches locales
rm -rf node_modules dist .eslintcache
cd ../client
rm -rf node_modules .next .eslintcache

# 5.3 — Repetir pasos 2 y 3 de arriba
```

---

## 6. Wipeo solo de datos (mantiene código + node_modules)

```bash
cd server
docker compose down -v       # borra volumen Postgres
docker compose up -d postgres
pnpm seed                    # re-crea admin, categoría, caja
pnpm dev                     # migraciones se re-aplican solas
```

---

## 7. Problemas comunes

### "EADDRINUSE: address already in use 0.0.0.0:3001"

Hay un Node zombie del dev server anterior. En Windows:
```powershell
Get-NetTCPConnection -State Listen -LocalPort 3001 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```
En Linux/Mac:
```bash
lsof -ti:3001 | xargs kill -9
```
Misma idea para `:3000`.

### "password authentication failed for user 't1et_app'"

Otro Postgres está respondiendo en el puerto antes que el contenedor. Verifica con:
```bash
docker ps                # ¿está corriendo t1et_postgres?
netstat -ano | findstr ":5433"   # ¿quién escucha en 5433? (debería ser Docker)
```
Si el conflicto está en `5432`, no afecta — usamos `5433`. Si está en `5433`, cambia `DB_PORT` en `.env` (y en `docker-compose.yml`) a otro puerto libre, ej. `5434`.

### "Cannot find module '@t1et/...'"

Quedó un import viejo de cuando esto era monorepo. No debería pasar — pero si pasa, busca:
```bash
grep -r "@t1et/" client/src server/src
```
y reemplaza por imports relativos o desde `@/shared/types/enums`.

### "Migration X has already been executed" o "relation already exists"

Estado inconsistente entre código y DB. La forma rápida: wipeo completo (sección 5).

### El cliente arranca pero login falla con CORS o "Network Error"

Revisa que `server/.env` tenga `WEB_ORIGIN=http://localhost:3000` exacto, y que `client/.env.local` tenga `NEXT_PUBLIC_API_URL=http://localhost:3001`.

### El admin login falla con "Credenciales inválidas"

No corriste `pnpm seed`. Hazlo desde `server/`. Es idempotente.

---

## 8. Estado del proyecto al momento de restaurar

```
✅ Fase 1 — Base técnica
✅ Fase 2 — Auth (JWT access + refresh httpOnly)
✅ Fase 3 — Productos / Categorías / Inventario
✅ Fase 4 — Caja (open/close + summary)
✅ Fase 5 — Ventas (POS transaccional)
✅ Fase 6 — Reportes
🔜 Fase 7 — Fiscal e-CF RD (tablas listas, módulo pendiente)
```

---

## 9. Estructura de carpetas (referencia rápida)

```
T1ET/
├── server/
│   ├── docker-compose.yml          ← Postgres 16
│   ├── .env.example
│   ├── package.json                ← scripts: dev, seed, migration:*, typecheck
│   └── src/
│       ├── main.ts                 ← arranque NestJS
│       ├── app.module.ts           ← raíz de módulos
│       ├── config/                 ← env validation (Zod) + typeorm config
│       ├── common/persistence/     ← UnitOfWork port + adapter
│       ├── database/
│       │   ├── data-source.ts      ← config standalone para CLI (migration:*)
│       │   ├── migrations/         ← 5 migraciones SQL
│       │   └── seeds/run-seed.ts
│       └── modules/
│           ├── auth/               ← hexagonal (JWT, bcryptjs)
│           ├── categories/         ← CRUD simple
│           ├── products/           ← CRUD simple
│           ├── inventory/          ← hexagonal (stock movements, UoW)
│           ├── cash-sessions/      ← hexagonal (open/close)
│           ├── sales/              ← hexagonal (transaccional, sequence)
│           ├── reports/            ← raw SQL aggregations
│           └── health/             ← healthcheck público
│
└── client/
    ├── package.json
    ├── next.config.mjs
    ├── tailwind.config.ts
    └── src/
        ├── app/                    ← Next.js App Router
        │   ├── login/
        │   └── dashboard/
        │       ├── products/
        │       ├── inventory/
        │       ├── cash/
        │       ├── pos/
        │       ├── sales/
        │       └── reports/
        ├── features/               ← una carpeta por dominio del UI
        │   ├── auth/
        │   ├── products/
        │   ├── categories/
        │   ├── inventory/
        │   ├── cash/
        │   ├── sales/
        │   └── reports/
        └── shared/
            ├── lib/                ← http-client, format, error-message, cn, query-client
            └── types/enums.ts      ← enums DGII, SaleStatus, PaymentMethod, etc.
```

---

## 10. Si vas a deployear a producción más adelante

Cosas a revisar antes de exponer al mundo:

1. **JWT secrets** en `.env`: cambiar a strings random largos. Genera con:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
2. **`COOKIE_SECURE=true`** y `WEB_ORIGIN` con `https://` real.
3. **DB credentials** distintas (no `12345678`).
4. **Cambiar el password del admin** después del primer login (UI pendiente — por ahora `UPDATE users SET password_hash = crypt('nuevo', gen_salt('bf'))` desde psql).
5. **Decidir si quieres `migrationsRun: true` en prod**: cómodo pero no recomendado si corres múltiples instancias del API tras un load balancer. Si tienes una sola instancia, déjalo.
6. **Docker** del API: agrega un Dockerfile y un service más en `docker-compose.yml` (no lo tienes ahora — corre vía `pnpm dev/start`).
7. **HTTPS**: detrás de un reverse proxy (Caddy, Nginx, Cloudflare Tunnel).
8. **Backup de Postgres**: `pg_dump` periódico del volumen `t1et_pg_data`.
