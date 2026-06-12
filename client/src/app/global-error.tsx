'use client';

/**
 * Error boundary de ÚLTIMA instancia (reemplaza el layout raíz completo).
 * Sin esto, un error de render dejaba la app en blanco sin recuperación.
 * Recargar es seguro: el carrito persiste en localStorage y la cola de ventas
 * offline en IndexedDB.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#f8fafc',
          color: '#0f172a',
          margin: 0,
          padding: '1rem',
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Algo salió mal
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '1.25rem' }}>
            Ocurrió un error inesperado en la aplicación. Tu carrito y las ventas
            sin sincronizar están a salvo. Recarga para continuar.
          </p>
          {error.digest && (
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1rem' }}>
              Código de referencia: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              borderRadius: '0.75rem',
              border: 'none',
              background: '#0f172a',
              color: '#fff',
              padding: '0.6rem 1.4rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              marginRight: '0.5rem',
            }}
          >
            Reintentar
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              borderRadius: '0.75rem',
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#0f172a',
              padding: '0.6rem 1.4rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Recargar la página
          </button>
        </div>
      </body>
    </html>
  );
}
