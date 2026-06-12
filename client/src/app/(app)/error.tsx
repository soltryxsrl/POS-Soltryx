'use client';

import { RotateCcw, TriangleAlert } from 'lucide-react';
import { Button } from '@/shared/ui/controls/Button';

/**
 * Error boundary de las pantallas autenticadas: un error de render en una
 * página no tumba el shell completo (nav, header) y el usuario puede
 * reintentar sin perder la sesión. El carrito persiste en localStorage y la
 * cola offline en IndexedDB, así que recuperarse aquí es seguro.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
          <TriangleAlert className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">
          Esta pantalla encontró un error
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          El resto del sistema sigue funcionando. Tu carrito y las ventas sin
          sincronizar están a salvo. Reintenta o vuelve al inicio.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-muted-foreground/70">
            Código de referencia: {error.digest}
          </p>
        )}
        <div className="mt-5 flex justify-center gap-2">
          <Button onClick={() => reset()}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Reintentar
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = '/')}>
            Ir al inicio
          </Button>
        </div>
      </div>
    </div>
  );
}
