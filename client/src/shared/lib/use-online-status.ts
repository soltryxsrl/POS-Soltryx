'use client';

import { useEffect, useState } from 'react';

/**
 * Estado de conexión del navegador. SSR-safe: arranca en `true` y se ajusta al
 * montar. Escucha los eventos `online`/`offline` del navegador.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);
  return online;
}
