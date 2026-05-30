'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../application/hooks/use-auth';

/**
 * Envuelve secciones protegidas. Si la sesión está cargando, muestra spinner.
 * Si está unauthenticated, redirige a /login conservando el path actual en `?next=`.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, status } = useAuth();

  useEffect(() => {
    if (status === 'unauthenticated') {
      const next = encodeURIComponent(pathname ?? '/');
      router.replace(`/login?next=${next}`);
    }
  }, [status, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    );
  }
  if (!isAuthenticated) return null;
  return <>{children}</>;
}
