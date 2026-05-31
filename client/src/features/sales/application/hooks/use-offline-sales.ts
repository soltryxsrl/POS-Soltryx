'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { HttpClientError } from '@/shared/lib/http-client';
import { salesApiHttp } from '../../infrastructure/api/sales.api.http';
import {
  PENDING_SALES_CHANGED,
  allPendingSales,
  markPendingFailed,
  removePendingSale,
} from '../offline/sale-offline-queue';

/**
 * Sincroniza la cola de ventas offline: al reconectar (evento `online`), por
 * intervalo y al cambiar la cola, reenvía cada venta pendiente a /sales. La
 * idempotencia del server evita duplicar. Distingue "pendientes" (esperando
 * conexión) de "con conflicto" (falla permanente: sesión cerrada, stock, etc.).
 */
export function useOfflineSalesSync() {
  const qc = useQueryClient();
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);
  const draining = useRef(false);

  const refresh = useCallback(async () => {
    const all = await allPendingSales();
    setPending(all.filter((r) => !r.failedReason).length);
    setFailed(all.filter((r) => r.failedReason).length);
  }, []);

  const drain = useCallback(async () => {
    if (draining.current) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await refresh();
      return;
    }
    draining.current = true;
    let synced = 0;
    try {
      const items = (await allPendingSales()).filter((r) => !r.failedReason);
      for (const rec of items) {
        try {
          await salesApiHttp.create(rec.payload);
          await removePendingSale(rec.id);
          synced += 1;
        } catch (e) {
          if (e instanceof HttpClientError) {
            // Falla permanente (sesión cerrada, stock insuficiente, validación):
            // se marca con conflicto y se sigue con las demás.
            await markPendingFailed(rec, e.message);
          } else {
            // Falla de red → seguimos sin conexión; reintentar luego.
            break;
          }
        }
      }
    } finally {
      draining.current = false;
      if (synced > 0) {
        qc.invalidateQueries({ queryKey: ['sales'] });
        qc.invalidateQueries({ queryKey: ['products'] });
        qc.invalidateQueries({ queryKey: ['cash'] });
      }
      await refresh();
    }
  }, [qc, refresh]);

  useEffect(() => {
    void drain();
    const onOnline = () => void drain();
    const onChanged = () => void drain();
    window.addEventListener('online', onOnline);
    window.addEventListener(PENDING_SALES_CHANGED, onChanged);
    const iv = setInterval(() => void drain(), 20_000);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener(PENDING_SALES_CHANGED, onChanged);
      clearInterval(iv);
    };
  }, [drain]);

  return { pending, failed };
}
