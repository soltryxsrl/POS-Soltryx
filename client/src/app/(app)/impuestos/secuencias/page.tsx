'use client';

import { SequencesTable } from '@/features/fiscal/ui/components/SequencesTable';

export default function FiscalSequencesPage() {
  return (
    <div className="flex h-[calc(100vh-6.5rem)] min-h-[480px] flex-col">
      <SequencesTable fillHeight title="Secuencias Fiscales" />
    </div>
  );
}
