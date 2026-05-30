'use client';

import { useEffect, useRef } from 'react';
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
  const bootstrapped = useRef(false);

  useEffect(() => {
    setupHttpAuth();
    if (bootstrapped.current) return;
    if (useAuthStore.getState().status !== 'idle') return;
    bootstrapped.current = true;

    const { setSession, setStatus } = useAuthStore.getState();
    setStatus('loading');
    void (async () => {
      const session = await authApiHttp.refresh();
      if (session) setSession(session);
      else setStatus('unauthenticated');
    })();
  }, []);
}
