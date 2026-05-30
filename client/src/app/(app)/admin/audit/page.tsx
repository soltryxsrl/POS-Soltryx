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

const ACTION_LABEL: Record<string, string> = {
  'sales.cancel': 'Venta anulada',
  'sales.return': 'Devolución registrada',
  'purchases.receive': 'Orden recibida',
  'purchases.cancel': 'Orden cancelada',
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
          <option value="sales.cancel">Ventas anuladas</option>
          <option value="sales.return">Devoluciones</option>
          <option value="purchases.receive">Recepciones de compra</option>
          <option value="purchases.cancel">Compras canceladas</option>
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
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium">
                        {ACTION_LABEL[e.action] ?? e.action}
                      </span>
                      <code className="text-[10px] text-muted-foreground">{e.action}</code>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {formatDateTime(e.createdAt)}
                      {e.actorName && ` · ${e.actorName}`}
                      {e.entityType && ` · ${e.entityType}`}
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
