'use client';

import { useAuth } from '@/features/auth/application/hooks/use-auth';

export default function DashboardPage() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bienvenido, {user?.fullName}</h1>
        <p className="text-sm text-muted-foreground">
          Fase 2 — Auth está lista. Próximo: módulos de productos, caja y ventas.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <LinkCard title="Productos" hint="Catálogo + stock" href="/dashboard/products" />
        <LinkCard title="Inventario" hint="Historial de movimientos" href="/dashboard/inventory" />
        <LinkCard title="Caja" hint="Abrir / cerrar sesión" href="/dashboard/cash" />
        <LinkCard title="POS" hint="Punto de venta" href="/dashboard/pos" />
        <LinkCard title="Ventas" hint="Historial + recibo" href="/dashboard/sales" />
        <LinkCard title="Reportes" hint="Día, top productos, stock bajo" href="/dashboard/reports" />
        <PlaceholderCard title="Clientes" hint="Pendiente" />
      </div>
    </div>
  );
}

function LinkCard({ title, hint, href }: { title: string; hint: string; href: string }) {
  return (
    <a
      href={href}
      className="rounded-lg border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm"
    >
      <div className="font-medium">{title}</div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </a>
  );
}

function PlaceholderCard({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-lg border bg-card p-5 opacity-60">
      <div className="font-medium">{title}</div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
