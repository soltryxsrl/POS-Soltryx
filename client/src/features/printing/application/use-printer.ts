'use client';

import { useCallback } from 'react';
import { INIT, KICK_DRAWER, toBytes } from '../domain/escpos';
import {
  connectPrinter,
  isSerialSupported,
  printerConnected,
  writeToPrinter,
} from '../infrastructure/web-serial';

/**
 * Acceso a la impresora térmica por Web Serial (ESC/POS crudo + apertura de
 * cajón). El recibo "normal" sigue imprimiéndose por el diálogo del navegador;
 * esto agrega la capacidad de patear el cajón y, opcionalmente, imprimir crudo.
 */
export function usePrinter() {
  const supported = isSerialSupported();

  /** Abre el cajón monedero. `allowPrompt=true` para una acción explícita. */
  const openDrawer = useCallback(async (allowPrompt = false) => {
    await writeToPrinter(toBytes(INIT, KICK_DRAWER), allowPrompt);
  }, []);

  /** Envía bytes ESC/POS ya construidos (recibo crudo, etc.). */
  const printBytes = useCallback(async (data: Uint8Array, allowPrompt = false) => {
    await writeToPrinter(data, allowPrompt);
  }, []);

  return {
    supported,
    connected: printerConnected(),
    connect: connectPrinter,
    openDrawer,
    printBytes,
  };
}
