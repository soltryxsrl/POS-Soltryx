'use client';

import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '@/shared/lib/error-message';
import {
  autoFormatRdIdentifier,
  validateRdIdentifier,
} from '@/shared/lib/rd-identifiers';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { Input } from '@/shared/ui/controls/Input';
import { Select } from '@/shared/ui/controls/Select';
import { Textarea } from '@/shared/ui/controls/Textarea';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import {
  useCreateCustomer,
  useUpdateCustomer,
} from '../../application/hooks/use-customers';
import type { Customer, CustomerDocType } from '../../domain/types';

interface Props {
  /** Si se provee, modo edición; si no, modo creación. */
  customer?: Customer;
  onClose: () => void;
  onSaved?: (customer: Customer) => void;
}

const DOC_TYPES: Array<{ value: CustomerDocType; label: string }> = [
  { value: 'CEDULA', label: 'Cédula' },
  { value: 'RNC', label: 'RNC' },
  { value: 'PASSPORT', label: 'Pasaporte' },
  { value: 'OTHER', label: 'Otro' },
];

export function CustomerFormDialog({ customer, onClose, onSaved }: Props) {
  const isEdit = !!customer;
  const create = useCreateCustomer();
  const update = useUpdateCustomer(customer?.id ?? '__new__');
  const [fullName, setFullName] = useState(customer?.fullName ?? '');
  const [documentType, setDocumentType] = useState<CustomerDocType | ''>(
    customer?.documentType ?? '',
  );
  const [doc, setDoc] = useState(customer?.document ?? '');
  const [email, setEmail] = useState(customer?.email ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [address, setAddress] = useState(customer?.address ?? '');
  const [isActive, setIsActive] = useState(customer?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  const pending = isEdit ? update.isPending : create.isPending;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (fullName.trim().length < 2) {
      setError('El nombre es obligatorio.');
      return;
    }
    // Valida cédula/RNC con dígito verificador antes de mandar al server
    const docErr = validateRdIdentifier(documentType || null, doc);
    if (docErr) {
      setError(docErr);
      return;
    }
    const formattedDoc = doc.trim()
      ? autoFormatRdIdentifier(documentType || null, doc.trim())
      : undefined;
    const payload = {
      fullName: fullName.trim(),
      documentType: documentType || undefined,
      document: formattedDoc,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
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
      title={isEdit ? 'Editar cliente' : 'Nuevo cliente'}
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <FormField label="Nombre completo" required>
          <Input
            autoFocus
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={180}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Tipo de documento">
            <Select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as CustomerDocType | '')}
            >
              <option value="">Sin documento</option>
              {DOC_TYPES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Documento"
            hint={
              documentType === 'CEDULA'
                ? `${doc.replace(/\D/g, '').length}/11 dígitos`
                : documentType === 'RNC'
                  ? `${doc.replace(/\D/g, '').length}/9 dígitos`
                  : undefined
            }
          >
            <Input
              value={doc}
              onChange={(e) => setDoc(e.target.value)}
              maxLength={32}
              placeholder={
                documentType === 'CEDULA'
                  ? '003-1234567-8'
                  : documentType === 'RNC'
                    ? '1-31-12345-6'
                    : 'Cédula / RNC...'
              }
              disabled={!documentType}
            />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
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
          <Textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={255}
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
            Cliente activo
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
            {pending ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear cliente'}
          </Button>
        </FormFooter>
      </form>
    </MaintenanceShell>
  );
}
