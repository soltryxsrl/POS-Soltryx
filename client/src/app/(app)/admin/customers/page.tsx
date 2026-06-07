'use client';

import { CustomersTable } from '@/features/customers/ui/components/CustomersTable';

export default function CustomersPage() {
  return (
    <div className="flex h-[calc(100vh-6.5rem)] min-h-[480px] flex-col">
      <CustomersTable fillHeight title="Clientes" />
    </div>
  );
}
