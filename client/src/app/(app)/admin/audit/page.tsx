'use client';

import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Shield,
} from 'lucide-react';
import { http } from '@/shared/lib/http-client';
import { formatDateTime } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';

interface AuditEvent {
  id: string;
  actorUserId: string | null;
  actorName: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  payload: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface AuditList {
  items: AuditEvent[];
  total: number;
}

// Etiquetas en español para cada acción auditable. El código técnico se sigue
// mostrando en gris al lado (referencia), pero el título es legible.
const ACTION_LABEL: Record<string, string> = {
  'auth.login.success': 'Inicio de sesión',
  'auth.login.failed': 'Intento de inicio fallido',
  'users.created': 'Usuario creado',
  'users.updated': 'Usuario actualizado',
  'users.deactivated': 'Usuario desactivado',
  'users.deleted': 'Usuario eliminado',
  'roles.created': 'Rol creado',
  'roles.updated': 'Rol actualizado',
  'roles.deleted': 'Rol eliminado',
  'sales.cancel': 'Venta anulada',
  'sales.return': 'Devolución registrada',
  'sales.discount.override': 'Descuento autorizado',
  'promotions.applied': 'Promoción aplicada',
  'purchases.receive': 'Orden de compra recibida',
  'purchases.cancel': 'Orden de compra cancelada',
};

// Etiquetas legibles para el tipo de entidad afectada.
const ENTITY_LABEL: Record<string, string> = {
  user: 'Usuario',
  role: 'Rol',
  sale: 'Venta',
  sale_return: 'Devolución',
  purchase_order: 'Orden de compra',
};

export default function AuditPage() {
  const [actionFilter, setActionFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const events = useQuery({
    queryKey: ['audit', 'list', { action: actionFilter, page, pageSize }] as const,
    queryFn: () =>
      http<AuditList>('/audit-events', {
        searchParams: {
          ...(actionFilter ? { action: actionFilter } : {}),
          limit: pageSize,
          offset: (page - 1) * pageSize,
        },
      }),
    placeholderData: (prev) => prev,
  });

  const total = events.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="flex h-[calc(100vh-6.5rem)] min-h-[480px] flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Bitácora de auditoría</h1>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Filtrar por acción:</span>
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-brand-from"
          >
            <option value="">Todas</option>
            <optgroup label="Acceso">
              <option value="auth.login.success">Inicios de sesión</option>
              <option value="auth.login.failed">Intentos fallidos</option>
            </optgroup>
            <optgroup label="Ventas">
              <option value="sales.cancel">Ventas anuladas</option>
              <option value="sales.return">Devoluciones</option>
              <option value="sales.discount.override">Descuentos autorizados</option>
            </optgroup>
            <optgroup label="Compras">
              <option value="purchases.receive">Recepciones de compra</option>
              <option value="purchases.cancel">Compras canceladas</option>
            </optgroup>
            <optgroup label="Usuarios y roles">
              <option value="users.created">Usuarios creados</option>
              <option value="users.updated">Usuarios actualizados</option>
              <option value="users.deactivated">Usuarios desactivados</option>
              <option value="users.deleted">Usuarios eliminados</option>
              <option value="roles.created">Roles creados</option>
              <option value="roles.updated">Roles actualizados</option>
              <option value="roles.deleted">Roles eliminados</option>
            </optgroup>
          </select>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-card">
        <div className="min-h-0 flex-1 overflow-y-auto">
        {events.isLoading && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Cargando...</p>
        )}
        {events.isError && (
          <p className="px-4 py-8 text-center text-sm text-destructive">
            {getErrorMessage(events.error)}
          </p>
        )}
        {events.data?.items.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Sin eventos registrados aún. Las acciones sensibles aparecerán acá.
          </p>
        )}
        <ul className="divide-y">
          {events.data?.items.map((e) => {
            const isOpen = expanded === e.id;
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : e.id)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-muted/40"
                >
                  <Shield className="h-4 w-4 flex-shrink-0 text-brand-from" />
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium">
                      {ACTION_LABEL[e.action] ?? e.action}
                    </span>
                    <div className="text-[11px] text-muted-foreground">
                      {formatDateTime(e.createdAt)}
                      {e.actorName && ` · ${e.actorName}`}
                      {e.entityType &&
                        ` · ${ENTITY_LABEL[e.entityType] ?? e.entityType}`}
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {isOpen && (
                  <div className="space-y-3 border-t bg-muted/30 px-4 py-3">
                    <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-[11px] sm:grid-cols-2">
                      <DetailRow label="Acción">
                        {ACTION_LABEL[e.action] ?? e.action}
                        <span className="ml-1 text-muted-foreground">({e.action})</span>
                      </DetailRow>
                      <DetailRow label="Fecha">{formatDateTime(e.createdAt)}</DetailRow>
                      {e.actorName && <DetailRow label="Usuario">{e.actorName}</DetailRow>}
                      {e.entityType && (
                        <DetailRow label="Entidad">
                          {ENTITY_LABEL[e.entityType] ?? e.entityType}
                          {e.entityId && (
                            <span className="ml-1 font-mono text-muted-foreground">{e.entityId}</span>
                          )}
                        </DetailRow>
                      )}
                      {e.ip && <DetailRow label="IP">{e.ip}</DetailRow>}
                      {e.userAgent && <DetailRow label="Dispositivo">{e.userAgent}</DetailRow>}
                    </dl>
                    {e.payload && Object.keys(e.payload).length > 0 ? (
                      <div>
                        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Detalle
                        </div>
                        <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-background p-2 text-[11px]">
                          {JSON.stringify(e.payload, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        Sin detalles adicionales para este evento.
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        </div>
        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2 text-xs text-muted-foreground">
            <div>
              Mostrando {from}–{to} de {total}
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                <span>Por página</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs outline-none focus:border-brand-from/60 focus:ring-2 focus:ring-brand-from/20"
                >
                  {[25, 50, 100, 200].map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center gap-1">
                <PagerButton disabled={!canPrev} onClick={() => setPage(1)} title="Primera página">
                  <ChevronsLeft className="h-4 w-4" />
                </PagerButton>
                <PagerButton disabled={!canPrev} onClick={() => setPage(page - 1)} title="Página anterior">
                  <ChevronLeft className="h-4 w-4" />
                </PagerButton>
                <span className="px-2 tabular-nums">
                  {page} / {totalPages}
                </span>
                <PagerButton disabled={!canNext} onClick={() => setPage(page + 1)} title="Página siguiente">
                  <ChevronRight className="h-4 w-4" />
                </PagerButton>
                <PagerButton disabled={!canNext} onClick={() => setPage(totalPages)} title="Última página">
                  <ChevronsRight className="h-4 w-4" />
                </PagerButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="min-w-[64px] flex-shrink-0 font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-foreground">{children}</dd>
    </div>
  );
}

function PagerButton({
  children,
  disabled,
  onClick,
  title,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
    >
      {children}
    </button>
  );
}
