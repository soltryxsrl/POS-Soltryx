'use client';

import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import { useCreateBranch, useUpdateBranch } from '../../application/hooks/use-branches';
import type { Branch } from '../../domain/types';

/** Deriva un código interno desde el nombre (mayúsculas, sin acentos, _). */
function codeFromName(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_');
  if (!base) return 'SUC';
  return /^[A-Z]/.test(base) ? base : `S_${base}`;
}

interface Props {
  branch?: Branch;
  /** Solo lectura (acción "Ver"). */
  readOnly?: boolean;
  onClose: () => void;
}

export function BranchFormDialog({ branch, readOnly, onClose }: Props) {
  const isEdit = !!branch;
  const create = useCreateBranch();
  const update = useUpdateBranch(branch?.id ?? '__new__');
  const [name, setName] = useState(branch?.name ?? '');
  const [rnc, setRnc] = useState(branch?.rnc ?? '');
  const [address, setAddress] = useState(branch?.address ?? '');
  const [phone, setPhone] = useState(branch?.phone ?? '');
  const [isActive, setIsActive] = useState(branch?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  const pending = isEdit ? update.isPending : create.isPending;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError('El nombre de la sucursal es obligatorio.');
      return;
    }
    try {
      if (isEdit) {
        await update.mutateAsync({
          name: name.trim(),
          rnc: rnc.trim() || undefined,
          address: address.trim() || undefined,
          phone: phone.trim() || undefined,
          isActive,
        });
      } else {
        await create.mutateAsync({
          code: codeFromName(name),
          name: name.trim(),
          rnc: rnc.trim() || undefined,
          address: address.trim() || undefined,
          phone: phone.trim() || undefined,
        });
      }
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <MaintenanceShell
      open
      onClose={onClose}
      title={readOnly ? 'Sucursal' : isEdit ? 'Editar sucursal' : 'Nueva sucursal'}
      size="md"
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <fieldset disabled={readOnly} className="contents space-y-5">
          <FormField label="Nombre" required>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder="Ej: Sucursal Norte"
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="RNC">
              <Input
                value={rnc}
                onChange={(e) => setRnc(e.target.value)}
                maxLength={32}
                placeholder="RNC"
              />
            </FormField>
            <FormField label="Teléfono">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={32}
                placeholder="809-555-1234"
              />
            </FormField>
          </div>
          <FormField label="Dirección">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={255}
              placeholder="Calle, sector, ciudad"
            />
          </FormField>
          {isEdit && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-border"
              />
              Sucursal activa
            </label>
          )}
        </fieldset>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}

        {readOnly ? (
          <FormFooter>
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </FormFooter>
        ) : (
          <FormFooter>
            <Button variant="outline" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear sucursal'}
            </Button>
          </FormFooter>
        )}
      </form>
    </MaintenanceShell>
  );
}
