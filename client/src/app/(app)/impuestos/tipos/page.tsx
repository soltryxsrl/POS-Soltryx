'use client';

import { DocTypesTable } from '@/features/fiscal/ui/components/DocTypesTable';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';

export default function FiscalDocTypesPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Tipos de Comprobantes"
        description="Catálogo DGII de tipos de e-CF. Activa solo los que tu negocio emite."
        crumbs={[{ label: 'Impuestos' }]}
      />
      <DocTypesTable />
    </div>
  );
}
