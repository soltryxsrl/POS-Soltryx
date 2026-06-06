'use client';

import { Banknote, Coins } from 'lucide-react';
import { formatMoney } from '@/shared/lib/format';
import { displayNumeric, selectAllOnFocus } from '@/shared/lib/numeric-field';
import type { DenominationCounts } from '../../domain/types';
import {
  RD_DENOMINATIONS,
  sumDenominations,
} from '../../application/math/denominations';

interface Props {
  value: DenominationCounts;
  onChange: (next: DenominationCounts) => void;
  /** Cuando se setea, muestra la diferencia con la suma actual. */
  expectedTotal?: string;
  disabled?: boolean;
}

/**
 * Grid editable de denominaciones. El total se calcula en vivo y se compara
 * con `expectedTotal` si se provee, para ayudar al cajero a cuadrar.
 */
export function DenominationCounter({ value, onChange, expectedTotal, disabled }: Props) {
  const total = sumDenominations(value);
  const diff =
    expectedTotal !== undefined ? Number(total) - Number(expectedTotal) : null;

  const set = (denom: number, count: number) => {
    const next = { ...value, [String(denom)]: Math.max(0, Math.floor(count)) };
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {RD_DENOMINATIONS.map((d) => {
          const count = value[String(d.value)] ?? 0;
          const contribution = count * d.value;
          return (
            <div
              key={d.value}
              className="flex items-center gap-2 rounded-lg border bg-background px-2 py-1.5"
            >
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                {d.kind === 'bill' ? (
                  <Banknote className="h-4 w-4" />
                ) : (
                  <Coins className="h-4 w-4" />
                )}
              </span>
              <span className="w-12 text-sm font-medium">RD$ {d.label}</span>
              <input
                type="number"
                min={0}
                step={1}
                value={displayNumeric(count)}
                onChange={(e) => set(d.value, Number(e.target.value) || 0)}
                onFocus={selectAllOnFocus}
                disabled={disabled}
                placeholder="0"
                className="ml-auto w-16 rounded-lg border border-border/60 bg-background/60 px-2 py-1 text-right text-sm shadow-sm transition-all outline-none hover:border-border focus:border-brand-from/60 focus:ring-2 focus:ring-brand-from/20 disabled:opacity-50"
              />
              {count > 0 && (
                <span className="w-20 text-right text-xs text-muted-foreground">
                  {formatMoney(contribution)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm">
        <span className="font-medium">Total contado</span>
        <span className="text-base font-semibold">{formatMoney(total)}</span>
      </div>

      {expectedTotal !== undefined && diff !== null && (
        <div
          className={
            diff === 0
              ? 'rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200'
              : diff > 0
                ? 'rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200'
                : 'rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200'
          }
        >
          {diff === 0
            ? 'Cuadre exacto'
            : `Diferencia: ${diff > 0 ? '+' : ''}${formatMoney(diff)} vs esperado (${formatMoney(expectedTotal)})`}
        </div>
      )}
    </div>
  );
}
