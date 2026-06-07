'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { useAuth } from '@/features/auth/application/hooks/use-auth';
import { Fab } from '@/shared/ui/controls/Fab';
import {
  DataTable,
  useClientSort,
  type DataTableColumn,
} from '@/shared/ui/data-table';
import { useFiscalSequences } from '../../application/hooks/use-fiscal';
import type { FiscalSequence } from '../../domain/types';
import { SequenceFormDialog } from './SequenceFormDialog';

const EXPIRE_WARN_DAYS = 30;
const LOW_REMAINING_PCT = 10;

export function SequencesTable({
  fillHeight,
  title,
}: {
  fillHeight?: boolean;
  title?: ReactNode;
} = {}) {
  const { user } = useAuth();
  const canManage = !!user && user.permissions.includes('fiscal.sequences.manage');
  const sequences = useFiscalSequences();
  const [showCreate, setShowCreate] = useState(false);
  const [renewing, setRenewing] = useState<FiscalSequence | null>(null);

  const sort = useClientSort<FiscalSequence>(sequences.data, 'docType', 'asc', (s, k) => {
    if (k === 'range') return Number(BigInt(s.rangeFrom));
    if (k === 'validUntil') return s.validUntil;
    return (s as unknown as Record<string, unknown>)[k];
  });

  const columns = useMemo<DataTableColumn<FiscalSequence>[]>(
    () => [
      {
        key: 'docType',
        header: 'Tipo',
        sortable: true,
        render: (s) => <span className="font-mono text-xs font-medium">{s.docType}</span>,
      },
      {
        key: 'prefix',
        header: 'Prefijo',
        sortable: true,
        render: (s) => <span className="text-xs">{s.prefix}</span>,
      },
      {
        key: 'range',
        header: 'Rango',
        sortable: true,
        align: 'right',
        render: (s) => (
          <span className="text-xs">
            {s.rangeFrom} – {s.rangeTo}
          </span>
        ),
      },
      {
        key: 'nextNumber',
        header: 'Próximo',
        sortable: true,
        align: 'right',
        render: (s) => s.nextNumber,
      },
      {
        key: 'remaining',
        header: 'Restante',
        sortable: true,
        align: 'right',
        render: (s) => {
          const total = Number(BigInt(s.rangeTo) - BigInt(s.rangeFrom) + 1n);
          const remainingPct = total > 0 ? (s.remaining / total) * 100 : 0;
          const lowRemaining = s.isActive && s.remaining > 0 && remainingPct < LOW_REMAINING_PCT;
          const exhausted = s.isActive && s.remaining === 0;
          return (
            <span
              className={
                exhausted
                  ? 'font-semibold text-destructive'
                  : lowRemaining
                    ? 'font-medium text-amber-700'
                    : ''
              }
            >
              {s.remaining.toLocaleString()}
            </span>
          );
        },
      },
      {
        key: 'validUntil',
        header: 'Vence',
        sortable: true,
        render: (s) => {
          if (!s.validUntil) return '—';
          const expiring =
            s.isActive && s.daysToExpire !== null && s.daysToExpire <= EXPIRE_WARN_DAYS;
          const expired = s.isActive && s.daysToExpire !== null && s.daysToExpire < 0;
          return (
            <span
              className={`text-xs ${
                expired
                  ? 'text-destructive'
                  : expiring
                    ? 'text-amber-700'
                    : 'text-muted-foreground'
              }`}
            >
              {s.validUntil}
              {s.daysToExpire !== null && s.daysToExpire >= 0 && (
                <span className="ml-1 text-[10px]">({s.daysToExpire}d)</span>
              )}
            </span>
          );
        },
      },
      {
        key: 'status',
        header: 'Estado',
        render: (s) => {
          const total = Number(BigInt(s.rangeTo) - BigInt(s.rangeFrom) + 1n);
          const remainingPct = total > 0 ? (s.remaining / total) * 100 : 0;
          const lowRemaining = s.isActive && s.remaining > 0 && remainingPct < LOW_REMAINING_PCT;
          const exhausted = s.isActive && s.remaining === 0;
          const expiring =
            s.isActive && s.daysToExpire !== null && s.daysToExpire <= EXPIRE_WARN_DAYS;
          const expired = s.isActive && s.daysToExpire !== null && s.daysToExpire < 0;
          return (
            <>
              {s.isActive ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                  Activa
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  Histórica
                </span>
              )}
              {(exhausted || expired) && (
                <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  {exhausted ? 'Agotada' : 'Vencida'} — renueva ya
                </div>
              )}
              {!exhausted && !expired && (lowRemaining || expiring) && (
                <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-amber-700">
                  <AlertTriangle className="h-3 w-3" />
                  {lowRemaining ? 'Quedan pocos' : 'Por vencer'}
                </div>
              )}
            </>
          );
        },
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (s) =>
          canManage && s.isActive ? (
            <button
              type="button"
              onClick={() => setRenewing(s)}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Renovar
            </button>
          ) : null,
      },
    ],
    [canManage],
  );

  return (
    <>
      <DataTable<FiscalSequence>
        columns={columns}
        rows={sort.sorted}
        total={sort.sorted.length}
        rowKey={(s) => s.id}
        page={1}
        pageSize={Math.max(sort.sorted.length, 25)}
        onPageChange={() => undefined}
        sortKey={sort.sortKey}
        sortDir={sort.sortDir}
        onSortChange={sort.onSortChange}
        isLoading={sequences.isLoading}
        isFetching={sequences.isFetching}
        errorMessage={sequences.isError ? getErrorMessage(sequences.error) : null}
        emptyState={'Sin secuencias todavía. Crea la primera con "Nueva secuencia".'}
        title={title}
        fillHeight={fillHeight}
      />

      {showCreate && <SequenceFormDialog onClose={() => setShowCreate(false)} />}
      {renewing && (
        <SequenceFormDialog renewFrom={renewing} onClose={() => setRenewing(null)} />
      )}

      {canManage && (
        <Fab label="Nueva secuencia" onClick={() => setShowCreate(true)} />
      )}
    </>
  );
}
