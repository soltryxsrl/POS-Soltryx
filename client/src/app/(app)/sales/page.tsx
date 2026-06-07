'use client';

import { SalesTable } from '@/features/sales/ui/components/SalesTable';

export default function SalesPage() {
  return (
    <div className="flex h-[calc(100vh-6.5rem)] min-h-[480px] flex-col">
      <SalesTable fillHeight title="Ventas" />
    </div>
  );
}
