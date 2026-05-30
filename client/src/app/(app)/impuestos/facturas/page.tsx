'use client';

import { FiscalDocumentsTable } from '@/features/fiscal/ui/components/FiscalDocumentsTable';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';

export default function FacturasFiscalesPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Comprobantes emitidos"
        description="Historial de NCF emitidos por el POS (B01/B02/B04 tradicionales y E31–E34 e-CF)."
        crumbs={[{ label: 'Impuestos' }]}
      />
      <FiscalDocumentsTable />
    </div>
  );
}
