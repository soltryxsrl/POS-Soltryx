'use client';

import { formatDateTime, formatMoney } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { useCashSessions } from '../../application/hooks/use-cash';

export function SessionsTable() {
  const sessions = useCashSessions({ limit: 100 });

  return (
    <div className="rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2">Abierta</th>
            <th className="px-4 py-2">Cerrada</th>
            <th className="px-4 py-2 text-right">Inicial</th>
            <th className="px-4 py-2 text-right">Esperado</th>
            <th className="px-4 py-2 text-right">Contado</th>
            <th className="px-4 py-2 text-right">Diferencia</th>
            <th className="px-4 py-2">Estado</th>
          </tr>
        </thead>
        <tbody>
          {sessions.isLoading && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                Cargando...
              </td>
            </tr>
          )}
          {sessions.isError && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-destructive">
                {getErrorMessage(sessions.error)}
              </td>
            </tr>
          )}
          {sessions.data?.items.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                Sin sesiones todavía.
              </td>
            </tr>
          )}
          {sessions.data?.items.map((s) => {
            const diffNum = s.difference ? parseFloat(s.difference) : null;
            return (
              <tr key={s.id} className="border-b last:border-0">
                <td className="px-4 py-2 text-xs">{formatDateTime(s.openedAt)}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">
                  {s.closedAt ? formatDateTime(s.closedAt) : '—'}
                </td>
                <td className="px-4 py-2 text-right">{formatMoney(s.openingAmount)}</td>
                <td className="px-4 py-2 text-right">
                  {s.expectedAmount ? formatMoney(s.expectedAmount) : '—'}
                </td>
                <td className="px-4 py-2 text-right">
                  {s.countedAmount ? formatMoney(s.countedAmount) : '—'}
                </td>
                <td
                  className={`px-4 py-2 text-right font-medium ${
                    diffNum === null
                      ? ''
                      : diffNum === 0
                        ? 'text-green-700'
                        : diffNum > 0
                          ? 'text-amber-700'
                          : 'text-destructive'
                  }`}
                >
                  {s.difference
                    ? `${diffNum && diffNum > 0 ? '+' : ''}${formatMoney(s.difference)}`
                    : '—'}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      s.status === 'OPEN'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {s.status === 'OPEN' ? 'Abierta' : 'Cerrada'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sessions.data && (
        <div className="border-t px-4 py-2 text-xs text-muted-foreground">
          Total: {sessions.data.total} sesión(es)
        </div>
      )}
    </div>
  );
}
