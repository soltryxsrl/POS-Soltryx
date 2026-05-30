'use client';

import { SalesTable } from '@/features/sales/ui/components/SalesTable';

export default function SalesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ventas</h1>
        <p className="text-sm text-muted-foreground">Historial de ventas registradas.</p>
      </div>
      <SalesTable />
    </div>
  );
}
