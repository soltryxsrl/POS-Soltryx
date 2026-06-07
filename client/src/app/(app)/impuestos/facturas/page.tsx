'use client';

import { FiscalDocumentsTable } from '@/features/fiscal/ui/components/FiscalDocumentsTable';

export default function FacturasFiscalesPage() {
  return (
    <div className="flex h-[calc(100vh-6.5rem)] min-h-[480px] flex-col">
      <FiscalDocumentsTable fillHeight title="Comprobantes emitidos" />
    </div>
  );
}
