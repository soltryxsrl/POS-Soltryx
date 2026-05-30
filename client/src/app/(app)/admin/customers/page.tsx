'use client';

import { CustomersTable } from '@/features/customers/ui/components/CustomersTable';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Clientes"
        description="Lista de clientes registrados, con búsqueda y acceso a su cuenta corriente."
        crumbs={[{ label: 'Administración' }]}
      />
      <CustomersTable />
    </div>
  );
}
