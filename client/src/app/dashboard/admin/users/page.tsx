'use client';

import { UsersTable } from '@/features/admin/ui/components/UsersTable';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Usuarios"
        crumbs={[{ label: 'Administración' }]}
      />
      <UsersTable />
    </div>
  );
}
