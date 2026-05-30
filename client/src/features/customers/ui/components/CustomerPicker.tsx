'use client';

import { useState } from 'react';
import { Search, UserPlus, X } from 'lucide-react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import { useCustomers } from '../../application/hooks/use-customers';
import type { Customer } from '../../domain/types';
import { CustomerFormDialog } from './CustomerFormDialog';

interface Props {
  onPick: (customer: Customer) => void;
  onClose: () => void;
  /** Si se provee, muestra opción "Quitar cliente" para limpiar la selección. */
  onClear?: () => void;
}

/**
 * Modal de selección de cliente para el POS.
 * Permite buscar, seleccionar, o crear uno nuevo al vuelo.
 */
export function CustomerPicker({ onPick, onClose, onClear }: Props) {
  const [q, setQ] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const customers = useCustomers({ q: q || undefined, isActive: 'true', limit: 30 });

  return (
    <MaintenanceShell open onClose={onClose} title="Asignar cliente" size="lg">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, cédula, teléfono..."
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-3 text-sm shadow-sm outline-none transition focus:border-brand-from focus:ring-2 focus:ring-brand-from/20"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-2.5 text-sm font-medium hover:bg-muted"
          >
            <UserPlus className="h-4 w-4" />
            Nuevo
          </button>
        </div>

        <div className="max-h-[420px] overflow-y-auto rounded-xl border">
          {customers.isLoading && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Cargando...
            </p>
          )}
          {customers.isError && (
            <p className="px-3 py-6 text-center text-sm text-destructive">
              {getErrorMessage(customers.error)}
            </p>
          )}
          {customers.data?.items.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No se encontraron clientes. Crea uno con el botón &quot;Nuevo&quot;.
            </p>
          )}
          <ul className="divide-y">
            {customers.data?.items.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(c);
                    onClose();
                  }}
                  className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition hover:bg-muted/60"
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-tint text-xs font-semibold text-brand-from">
                    {initials(c.fullName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{c.fullName}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {c.document
                        ? `${c.documentType ?? ''} ${c.document}`
                        : 'Sin documento'}
                      {c.phone && ` · ${c.phone}`}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {onClear && (
          <button
            type="button"
            onClick={() => {
              onClear();
              onClose();
            }}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-3 py-2 text-sm text-muted-foreground hover:border-foreground/30 hover:text-foreground"
          >
            <X className="h-4 w-4" />
            Quitar cliente de esta venta
          </button>
        )}
      </div>

      {showCreate && (
        <CustomerFormDialog
          onClose={() => setShowCreate(false)}
          onSaved={(c) => {
            onPick(c);
            setShowCreate(false);
            onClose();
          }}
        />
      )}
    </MaintenanceShell>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || '?';
}
