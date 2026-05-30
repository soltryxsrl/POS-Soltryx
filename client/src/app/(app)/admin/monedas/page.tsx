'use client';

import { CurrenciesTable } from '@/features/currencies/ui/components/CurrenciesTable';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';

export default function MonedasPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Monedas y tasas de cambio"
        description="Activa monedas extranjeras y actualiza sus tasas. DOP es la moneda base del sistema."
        crumbs={[{ label: 'Administración' }]}
      />
      <CurrenciesTable />
    </div>
  );
}
