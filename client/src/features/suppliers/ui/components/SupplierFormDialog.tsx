'use client';

import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { autoFormatRdIdentifier, validateRdIdentifier } from '@/shared/lib/rd-identifiers';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { Textarea } from '@/shared/ui/controls/Textarea';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import {
  useCreateSupplier,
  useUpdateSupplier,
} from '../../application/hooks/use-suppliers';
import type { Supplier } from '../../domain/types';

interface Props {
  supplier?: Supplier;
  /** Solo lectura (acción "Ver"): inputs deshabilitados y sin botón Guardar. */
  readOnly?: boolean;
  onClose: () => void;
  onSaved?: (s: Supplier) => void;
}

export function SupplierFormDialog({ supplier, readOnly, onClose, onSaved }: Props) {
  const isEdit = !!supplier;
  const create = useCreateSupplier();
  const update = useUpdateSupplier(supplier?.id ?? '__new__');
  const [tradeName, setTradeName] = useState(supplier?.tradeName ?? '');
  const [legalName, setLegalName] = useState(supplier?.legalName ?? '');
  const [rnc, setRnc] = useState(supplier?.rnc ?? '');
  const [contactName, setContactName] = useState(supplier?.contactName ?? '');
  const [phone, setPhone] = useState(supplier?.phone ?? '');
  const [email, setEmail] = useState(supplier?.email ?? '');
  const [address, setAddress] = useState(supplier?.address ?? '');
  const [notes, setNotes] = useState(supplier?.notes ?? '');
  const [isActive, setIsActive] = useState(supplier?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  const pending = isEdit ? update.isPending : create.isPending;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (tradeName.trim().length < 2) {
      setError('El nombre comercial es obligatorio.');
      return;
    }
    // Valida RNC con dígito verificador si se proveyó
    const rncErr = validateRdIdentifier('RNC', rnc);
    if (rncErr) {
      setError(rncErr);
      return;
    }
    const formattedRnc = rnc.trim() ? autoFormatRdIdentifier('RNC', rnc.trim()) : undefined;
    const payload = {
      tradeName: tradeName.trim(),
      legalName: legalName.trim() || undefined,
      rnc: formattedRnc,
      contactName: contactName.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
      isActive,
    };
    try {
      const saved = isEdit
        ? await update.mutateAsync(payload)
        : await create.mutateAsync(payload);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <MaintenanceShell
      open
      onClose={onClose}
      title={readOnly ? 'Proveedor' : isEdit ? 'Editar proveedor' : 'Nuevo proveedor'}
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <fieldset disabled={readOnly} className="contents">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Nombre comercial" required>
            <Input
              autoFocus
              value={tradeName}
              onChange={(e) => setTradeName(e.target.value)}
              maxLength={180}
              placeholder="Distribuidora El Sol"
            />
          </FormField>
          <FormField label="Razón social">
            <Input
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              maxLength={180}
              placeholder="El Sol Comercial SRL"
            />
          </FormField>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="RNC" hint={`${rnc.replace(/\D/g, '').length}/9 dígitos`}>
            <Input
              value={rnc}
              onChange={(e) => setRnc(e.target.value)}
              placeholder="1-31-12345-6"
              maxLength={32}
            />
          </FormField>
          <FormField label="Persona de contacto">
            <Input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              maxLength={180}
              placeholder="Maria Fernandez"
            />
          </FormField>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Teléfono">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={32}
              placeholder="809-555-1234"
            />
          </FormField>
          <FormField label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={160}
            />
          </FormField>
        </div>

        <FormField label="Dirección">
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={255}
          />
        </FormField>

        <FormField label="Notas">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[60px]"
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
            Proveedor activo
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
              {pending ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear proveedor'}
            </Button>
          </FormFooter>
        )}
      </form>
    </MaintenanceShell>
  );
}
