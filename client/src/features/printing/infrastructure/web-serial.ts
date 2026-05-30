'use client';

/**
 * Transporte de impresión por Web Serial API (Chromium + contexto seguro:
 * https o localhost). Definimos solo la porción del API que usamos para no
 * depender de @types/w3c-web-serial.
 *
 * El puerto autorizado se recuerda a nivel de módulo durante la sesión; entre
 * recargas, `getPorts()` devuelve los puertos ya concedidos por el usuario, así
 * que reconecta sin volver a mostrar el selector.
 */

interface SerialPortLike {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readonly writable: WritableStream<Uint8Array> | null;
}

interface SerialLike {
  requestPort(): Promise<SerialPortLike>;
  getPorts(): Promise<SerialPortLike[]>;
}

function getSerial(): SerialLike | null {
  if (typeof navigator === 'undefined') return null;
  const s = (navigator as unknown as { serial?: SerialLike }).serial;
  return s ?? null;
}

/** ¿El navegador soporta Web Serial? (Chrome/Edge en https o localhost.) */
export function isSerialSupported(): boolean {
  return getSerial() !== null;
}

let activePort: SerialPortLike | null = null;

async function ensurePortOpen(allowPrompt: boolean): Promise<SerialPortLike | null> {
  const serial = getSerial();
  if (!serial) return null;
  if (activePort?.writable) return activePort;

  // Reusa un puerto ya autorizado por el usuario (incluso tras recargar).
  const granted = await serial.getPorts();
  let port: SerialPortLike | null = granted[0] ?? null;
  if (!port) {
    if (!allowPrompt) return null;
    port = await serial.requestPort(); // muestra el selector del navegador
  }
  await port.open({ baudRate: 9600 });
  activePort = port;
  return port;
}

/** ¿Hay un puerto abierto y escribible en esta sesión? */
export function printerConnected(): boolean {
  return !!activePort?.writable;
}

/**
 * Conecta a una impresora (muestra el selector del navegador si hace falta).
 * Devuelve true si quedó lista para escribir.
 */
export async function connectPrinter(): Promise<boolean> {
  const port = await ensurePortOpen(true);
  return !!port?.writable;
}

/**
 * Envía bytes crudos a la impresora.
 * - `allowPrompt=true`: si no hay puerto, muestra el selector (acción explícita).
 * - `allowPrompt=false`: si no hay puerto ya autorizado, no hace nada visible
 *   (lanza para que el caller decida) — usado en auto-acciones silenciosas.
 */
export async function writeToPrinter(data: Uint8Array, allowPrompt = false): Promise<void> {
  const port = await ensurePortOpen(allowPrompt);
  if (!port?.writable) {
    throw new Error('No hay impresora conectada (Web Serial).');
  }
  const writer = port.writable.getWriter();
  try {
    await writer.write(data);
  } finally {
    writer.releaseLock();
  }
}
