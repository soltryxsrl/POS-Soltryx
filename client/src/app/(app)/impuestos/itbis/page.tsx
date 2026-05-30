'use client';

import { TaxTypesTable } from '@/features/tax-types/ui/components/TaxTypesTable';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';

export default function TaxTypesPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Tipos de ITBIS"
        description="Tasas de impuesto DGII: 18% general, 16% reducida, 0% tasa cero y Exento. Activa las que uses y marca la tasa por defecto para productos nuevos."
        crumbs={[{ label: 'Impuestos' }]}
      />
      <TaxTypesTable />
    </div>
  );
}
