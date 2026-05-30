'use client';

import { useEffect } from 'react';

/**
 * Registra el service worker (/sw.js) que cachea el app shell y las lecturas
 * GET del API para resiliencia offline. Solo en producción: en `next dev`
 * interferiría con el HMR.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Registro fallido: la app sigue funcionando con conexión normal.
      });
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);
  return null;
}
