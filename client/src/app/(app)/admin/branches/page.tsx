'use client';

import { BranchesManager } from '@/features/branches/ui/components/BranchesManager';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';

export default function BranchesPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Sucursales"
        description="Gestiona las sucursales del negocio. Cada sucursal tiene su propio catálogo, inventario y secuencias fiscales."
        crumbs={[{ label: 'Administración' }]}
      />
      <BranchesManager />
    </div>
  );
}
