'use client';

import { StockMovementsTable } from '@/features/inventory/ui/components/StockMovementsTable';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Inventario" />
      <StockMovementsTable />
    </div>
  );
}
