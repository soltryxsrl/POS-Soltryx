import type { CreateSaleInput } from '../../domain/types';

/**
 * Cola de ventas OFFLINE en IndexedDB. Cuando el POS no tiene conexión, la venta
 * se guarda aquí con su `idempotencyKey`; al reconectar se reenvía a /sales (la
 * idempotencia del server evita duplicar el cobro). Wrapper mínimo sin dependencias.
 */
const DB_NAME = 'soltryx-pos';
const STORE = 'pending_sales';
const VERSION = 1;

export interface PendingSale {
  /** = idempotencyKey (UUID). Clave primaria. */
  id: string;
  payload: CreateSaleInput;
  /** Sucursal activa al momento de la venta (informativo). */
  branchId: string | null;
  createdAt: string;
  /** Si el reenvío falló de forma permanente (no de red), el mensaje. */
  failedReason?: string | null;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      }),
  );
}

/** Evento para que el indicador de pendientes se refresque al instante. */
export const PENDING_SALES_CHANGED = 'pos:pending-sales-changed';
function notifyChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PENDING_SALES_CHANGED));
}

export async function enqueueSale(payload: CreateSaleInput, branchId: string | null): Promise<void> {
  const rec: PendingSale = {
    id: payload.idempotencyKey ?? crypto.randomUUID(),
    payload,
    branchId,
    createdAt: new Date().toISOString(),
    failedReason: null,
  };
  await tx('readwrite', (s) => s.put(rec));
  notifyChanged();
}

export async function allPendingSales(): Promise<PendingSale[]> {
  try {
    const rows = await tx<PendingSale[]>('readonly', (s) => s.getAll() as IDBRequest<PendingSale[]>);
    return rows ?? [];
  } catch {
    return [];
  }
}

export async function removePendingSale(id: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(id) as unknown as IDBRequest<undefined>);
  notifyChanged();
}

export async function markPendingFailed(rec: PendingSale, reason: string): Promise<void> {
  await tx('readwrite', (s) => s.put({ ...rec, failedReason: reason }));
}

export async function countPendingSales(): Promise<number> {
  try {
    return await tx<number>('readonly', (s) => s.count());
  } catch {
    return 0;
  }
}
