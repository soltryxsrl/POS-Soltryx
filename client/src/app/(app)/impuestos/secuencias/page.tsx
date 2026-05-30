'use client';

import { SequencesTable } from '@/features/fiscal/ui/components/SequencesTable';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';

export default function FiscalSequencesPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Secuencias Fiscales"
        description="Rangos NCF autorizados por DGII. Al renovar, la secuencia activa anterior queda como histórica."
        crumbs={[{ label: 'Impuestos' }]}
      />
      <SequencesTable />
    </div>
  );
}
