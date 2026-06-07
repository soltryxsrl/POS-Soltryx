'use client';

import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { Select } from '@/shared/ui/controls/Select';
import { Textarea } from '@/shared/ui/controls/Textarea';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import { useCreateCategory, useUpdateCategory } from '../../application/hooks/use-categories';
import type { Category } from '../../domain/types';

interface Props {
  category?: Category;
  /** Catálogo actual — para elegir categoría padre (se excluye la propia). */
  categories: Category[];
  onClose: () => void;
}

export function CategoryFormDialog({ category, categories, onClose }: Props) {
  const isEdit = !!category;
  const create = useCreateCategory();
  const update = useUpdateCategory(category?.id ?? '__new__');

  const [name, setName] = useState(category?.name ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [parentId, setParentId] = useState(category?.parentId ?? '');
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  const pending = isEdit ? update.isPending : create.isPending;
  const parentOptions = categories.filter((c) => c.id !== category?.id);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 1) {
      setError('El nombre es obligatorio.');
      return;
    }
    try {
      if (isEdit) {
        await update.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          parentId: parentId || null,
          isActive,
        });
      } else {
        await create.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          parentId: parentId || undefined,
          isActive,
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
      title={isEdit ? 'Editar categoría' : 'Nueva categoría'}
      size="md"
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <FormField label="Nombre" required>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            placeholder="Bebidas"
          />
        </FormField>

        <FormField label="Descripción">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={255}
            className="min-h-[60px]"
          />
        </FormField>

        <FormField label="Categoría padre" hint="Opcional. Úsala para crear subcategorías.">
          <Select value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">Sin categoría padre</option>
            {parentOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </FormField>

        {isEdit && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-border"
            />
            Categoría activa
          </label>
        )}

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}

        <FormFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear categoría'}
          </Button>
        </FormFooter>
      </form>
    </MaintenanceShell>
  );
}
