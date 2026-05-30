'use client';

import { useEffect } from 'react';
import { authApiHttp } from '../../infrastructure/api/auth.api.http';
import { setupHttpAuth } from '../setup-http-auth';
import { useAuthStore } from '../stores/auth.store';

/**
 * Llamar UNA VEZ desde el provider raíz. Hace dos cosas:
 *   1) Conecta el http-client con el store y el adapter de refresh.
 *   2) Intenta `refresh()` para rehidratar la sesión cuando la cookie httpOnly
 *      sigue válida tras recargar la página.
 */
export function useBootstrapAuth() {
  const setSession = useAuthStore((s) => s.setSession);
  const setStatus = useAuthStore((s) => s.setStatus);
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    setupHttpAuth();
  }, []);

  useEffect(() => {
    if (status !== 'idle') return;
    setStatus('loading');
    let cancelled = false;
    void (async () => {
      const session = await authApiHttp.refresh();
      if (cancelled) return;
      if (session) setSession(session);
      else setStatus('unauthenticated');
    })();
    return () => {
      cancelled = true;
    };
  }, [status, setSession, setStatus]);
}
