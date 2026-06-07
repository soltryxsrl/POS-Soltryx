'use client';

import { DocTypesTable } from '@/features/fiscal/ui/components/DocTypesTable';

export default function FiscalDocTypesPage() {
  return (
    <div className="flex h-[calc(100vh-6.5rem)] min-h-[480px] flex-col">
      <DocTypesTable fillHeight title="Tipos de Comprobantes" />
    </div>
  );
}
