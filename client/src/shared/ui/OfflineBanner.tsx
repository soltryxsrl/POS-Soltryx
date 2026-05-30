'use client';

import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/shared/lib/use-online-status';

/** Banner fijo en la parte superior cuando el navegador pierde la conexión. */
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-amber-500 px-3 py-1.5 text-center text-xs font-semibold text-white shadow-md"
    >
      <WifiOff className="h-3.5 w-3.5 flex-shrink-0" />
      Sin conexión — puedes seguir consultando productos, pero no podrás cobrar
      hasta reconectar.
    </div>
  );
}
