'use client';

import { SalesTable } from '@/features/sales/ui/components/SalesTable';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';

export default function SalesPage() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Ventas" />
      <SalesTable />
    </div>
  );
}
