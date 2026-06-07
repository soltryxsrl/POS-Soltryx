'use client';

import { RolesTable } from '@/features/admin/ui/components/RolesTable';

export default function AdminRolesPage() {
  return (
    <div className="flex h-[calc(100vh-6.5rem)] min-h-[480px] flex-col">
      <RolesTable fillHeight title="Roles y permisos" />
    </div>
  );
}
