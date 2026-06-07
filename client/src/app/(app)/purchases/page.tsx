'use client';

import { PurchaseOrdersTable } from '@/features/purchases/ui/components/PurchaseOrdersTable';

export default function PurchasesPage() {
  return (
    <div className="flex h-[calc(100vh-6.5rem)] min-h-[480px] flex-col">
      <PurchaseOrdersTable fillHeight title="Órdenes de compra" />
    </div>
  );
}
