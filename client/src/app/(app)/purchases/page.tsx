'use client';

import { PurchaseOrdersTable } from '@/features/purchases/ui/components/PurchaseOrdersTable';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';

export default function PurchasesPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Órdenes de compra"
        description="Crea órdenes a tus proveedores, recibe parcial o totalmente, y mantén el stock al día."
      />
      <PurchaseOrdersTable />
    </div>
  );
}
