'use client';

import { TaxTypesTable } from '@/features/tax-types/ui/components/TaxTypesTable';

export default function TaxTypesPage() {
  return (
    <div className="flex h-[calc(100vh-6.5rem)] min-h-[480px] flex-col">
      <TaxTypesTable fillHeight title="Tipos de ITBIS" />
    </div>
  );
}
