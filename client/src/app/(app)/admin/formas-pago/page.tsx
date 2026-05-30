'use client';

import { PaymentMethodsTable } from '@/features/payment-methods/ui/components/PaymentMethodsTable';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';

export default function PaymentMethodsPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Formas de pago"
        description="Personaliza el nombre visible, si pide referencia y cuáles aparecen al cobrar. El comportamiento (efectivo da vuelto, crédito carga a cuenta) es fijo por clase."
        crumbs={[{ label: 'Administración' }]}
      />
      <PaymentMethodsTable />
    </div>
  );
}
