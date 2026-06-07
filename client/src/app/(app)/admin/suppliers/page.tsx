'use client';

import { SuppliersTable } from '@/features/suppliers/ui/components/SuppliersTable';

export default function SuppliersPage() {
  return (
    <div className="flex h-[calc(100vh-6.5rem)] min-h-[480px] flex-col">
      <SuppliersTable fillHeight title="Proveedores" />
    </div>
  );
}
