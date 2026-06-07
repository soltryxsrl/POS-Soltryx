'use client';

import { CurrenciesTable } from '@/features/currencies/ui/components/CurrenciesTable';

export default function MonedasPage() {
  return (
    <div className="flex h-[calc(100vh-6.5rem)] min-h-[480px] flex-col">
      <CurrenciesTable fillHeight title="Monedas y tasas de cambio" />
    </div>
  );
}
