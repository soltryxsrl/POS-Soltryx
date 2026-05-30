'use client';

import { RolesTable } from '@/features/admin/ui/components/RolesTable';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';

export default function AdminRolesPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Roles y permisos"
        crumbs={[{ label: 'Administración' }]}
      />
      <RolesTable />
    </div>
  );
}
