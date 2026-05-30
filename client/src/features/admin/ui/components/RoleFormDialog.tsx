'use client';

import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import { useAdminRole } from '../../application/hooks/use-admin-roles';
import { RoleForm } from './RoleForm';

interface Props {
  roleId?: string | null;
  onClose: () => void;
}

export function RoleFormDialog({ roleId, onClose }: Props) {
  const role = useAdminRole(roleId ?? undefined);
  const isEdit = !!roleId;
  const loadingEdit = isEdit && role.isLoading;

  return (
    <MaintenanceShell
      open
      onClose={onClose}
      title={isEdit ? (role.data?.name ?? 'Editar rol') : 'Nuevo rol'}
      size="xl"
    >
      {loadingEdit ? (
        <div className="py-12 text-center text-muted-foreground">Cargando rol...</div>
      ) : isEdit && !role.data ? (
        <div className="py-6 text-center text-destructive">No se pudo cargar el rol.</div>
      ) : (
        <RoleForm role={isEdit ? role.data : undefined} onSuccess={onClose} onCancel={onClose} />
      )}
    </MaintenanceShell>
  );
}
