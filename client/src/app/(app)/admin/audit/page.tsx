'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Filter, Shield } from 'lucide-react';
import { http } from '@/shared/lib/http-client';
import { formatDateTime } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';

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

  const events = useQuery({
    queryKey: ['audit', 'list', { action: actionFilter }] as const,
    queryFn: () =>
      http<AuditList>('/audit-events', {
        searchParams: {
          ...(actionFilter ? { action: actionFilter } : {}),
          limit: 100,
        },
      }),
  });

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Bitácora de auditoría"
        description="Registro inmutable de acciones sensibles del sistema."
        crumbs={[{ label: 'Administración' }]}
      />

      <div className="flex items-center gap-2 rounded-xl border bg-card p-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Filtrar por acción:</span>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
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

      <div className="rounded-2xl border bg-card">
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
                {isOpen && e.payload && (
                  <div className="border-t bg-muted/30 px-4 py-3">
                    <pre className="overflow-x-auto whitespace-pre-wrap break-words text-[11px]">
                      {JSON.stringify(e.payload, null, 2)}
                    </pre>
                    {e.ip && (
                      <div className="mt-2 text-[10px] text-muted-foreground">
                        IP: {e.ip}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {events.data && (
          <div className="border-t px-4 py-2 text-xs text-muted-foreground">
            {events.data.total} evento(s)
          </div>
        )}
      </div>
    </div>
  );
}
