'use client';

import { CreatePurchaseOrderForm } from '@/features/purchases/ui/components/CreatePurchaseOrderForm';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';

export default function NewPurchaseOrderPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Nueva orden de compra"
        description="Selecciona el proveedor y los productos a pedir. Al recibir se actualiza el stock."
        crumbs={[{ label: 'Compras', href: '/purchases' }]}
      />
      <CreatePurchaseOrderForm />
    </div>
  );
}
