'use client';

import { PaymentMethodsTable } from '@/features/payment-methods/ui/components/PaymentMethodsTable';

export default function PaymentMethodsPage() {
  return (
    <div className="flex h-[calc(100vh-6.5rem)] min-h-[480px] flex-col">
      <PaymentMethodsTable fillHeight title="Formas de pago" />
    </div>
  );
}
