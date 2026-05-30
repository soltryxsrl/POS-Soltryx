'use client';

import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import { useAdminUser } from '../../application/hooks/use-admin-users';
import { UserForm } from './UserForm';

interface Props {
  userId?: string | null;
  onClose: () => void;
}

export function UserFormDialog({ userId, onClose }: Props) {
  const user = useAdminUser(userId ?? undefined);
  const isEdit = !!userId;
  const loadingEdit = isEdit && user.isLoading;

  return (
    <MaintenanceShell
      open
      onClose={onClose}
      title={isEdit ? (user.data?.fullName ?? 'Editar usuario') : 'Nuevo usuario'}
      size="xl"
    >
      {loadingEdit ? (
        <div className="py-12 text-center text-muted-foreground">Cargando usuario...</div>
      ) : isEdit && !user.data ? (
        <div className="py-6 text-center text-destructive">No se pudo cargar el usuario.</div>
      ) : (
        <UserForm user={isEdit ? user.data : undefined} onSuccess={onClose} onCancel={onClose} />
      )}
    </MaintenanceShell>
  );
}
