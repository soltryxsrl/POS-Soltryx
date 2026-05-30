'use client';

import { useState } from 'react';
import { Inbox } from 'lucide-react';
import { Button } from '@/shared/ui/controls/Button';
import { usePrinter } from '../application/use-printer';

/**
 * Botón "Abrir cajón" (no-sale). Envía el pulso ESC/POS de apertura por Web
 * Serial. Se oculta si el navegador no soporta Web Serial (no-Chromium). La
 * primera vez muestra el selector de dispositivo del navegador.
 */
export function DrawerButton() {
  const { supported, openDrawer } = usePrinter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!supported) return null;

  const onClick = async () => {
    setErr(null);
    setBusy(true);
    try {
      await openDrawer(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo abrir el cajón');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={busy}
      className="flex-shrink-0"
      title={err ?? 'Abrir cajón monedero (impresora térmica)'}
    >
      <Inbox className="h-4 w-4" />
      Cajón
    </Button>
  );
}
