'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { AuthGuard } from '@/features/auth/ui/components/AuthGuard';
import { useAuth } from '@/features/auth/application/hooks/use-auth';
import { useLogout } from '@/features/auth/application/hooks/use-logout';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}

function DashboardShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const logout = useLogout();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
              T1ET POS
            </Link>
            <nav className="hidden gap-4 text-sm text-muted-foreground sm:flex">
              <Link href="/dashboard" className="hover:text-foreground">Inicio</Link>
              <Link href="/dashboard/products" className="hover:text-foreground">Productos</Link>
              <Link href="/dashboard/inventory" className="hover:text-foreground">Inventario</Link>
              <Link href="/dashboard/cash" className="hover:text-foreground">Caja</Link>
              <Link href="/dashboard/pos" className="hover:text-foreground">POS</Link>
              <Link href="/dashboard/sales" className="hover:text-foreground">Ventas</Link>
              <Link href="/dashboard/reports" className="hover:text-foreground">Reportes</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {user?.fullName} · {user?.roles.join(', ')}
            </span>
            <button
              type="button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="rounded-md border px-3 py-1.5 text-sm transition hover:bg-muted disabled:opacity-50"
            >
              {logout.isPending ? 'Saliendo...' : 'Salir'}
            </button>
          </div>
        </div>
      </header>
      <main className="container flex-1 py-8">{children}</main>
    </div>
  );
}
