'use client';

import { SuppliersTable } from '@/features/suppliers/ui/components/SuppliersTable';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';

export default function SuppliersPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Proveedores"
        description="Listado de proveedores con datos de contacto y RNC."
        crumbs={[{ label: 'Administración' }]}
      />
      <SuppliersTable />
    </div>
  );
}
