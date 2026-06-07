'use client';

import { UsersTable } from '@/features/admin/ui/components/UsersTable';

export default function AdminUsersPage() {
  return (
    <div className="flex h-[calc(100vh-6.5rem)] min-h-[480px] flex-col">
      <UsersTable fillHeight title="Usuarios" />
    </div>
  );
}
