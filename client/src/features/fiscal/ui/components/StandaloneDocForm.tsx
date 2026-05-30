'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { formatMoney } from '@/shared/lib/format';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { Input } from '@/shared/ui/controls/Input';
import { Select } from '@/shared/ui/controls/Select';
import { Textarea } from '@/shared/ui/controls/Textarea';
import { useIssueStandaloneDocument } from '../../application/hooks/use-fiscal';
import type { IssueStandaloneDocumentInput } from '../../domain/types';

interface Props {
  /** Códigos DGII permitidos en este form (ej. ['E41','B11'] o ['E43','B13']). */
  allowedTypes: Array<'E41' | 'E43' | 'B11' | 'B13'>;
  /** Etiqueta del campo "contraparte": "Proveedor" o "Concepto". */
  counterpartyLabel: string;
  /** Si true, muestra campo RNC/Cédula opcional (compras informales sí, gastos no). */
  showCounterpartyRnc: boolean;
  /** Si true, muestra campo de ITBIS (compras formales sí, gastos típicamente no). */
  showTax: boolean;
  defaultTaxRate?: string;
  /** Si se provee, se llama cuando el comprobante se emite OK. El form
   *  queda limpio y disponible para otra emisión, o el caller cierra el dialog. */
  onIssued?: (result: { ncf: string; docType: string }) => void;
  /** Si se provee, muestra un botón "Cancelar" además de "Limpiar". */
  onCancel?: () => void;
}

export function StandaloneDocForm({
  allowedTypes,
  counterpartyLabel,
  showCounterpartyRnc,
  showTax,
  defaultTaxRate = '0',
  onIssued,
  onCancel,
}: Props) {
  const issue = useIssueStandaloneDocument();
  const [docTypeCode, setDocTypeCode] = useState<Props['allowedTypes'][number]>(
    allowedTypes[0]!,
  );
  const [counterpartyName, setCounterpartyName] = useState('');
  const [counterpartyRnc, setCounterpartyRnc] = useState('');
  const [description, setDescription] = useState('');
  const [subtotal, setSubtotal] = useState('');
  const [taxRate, setTaxRate] = useState(defaultTaxRate);
  const [error, setError] = useState<string | null>(null);
  const [lastIssued, setLastIssued] = useState<{
    ncf: string;
    docType: string;
  } | null>(null);

  const computed = useMemo(() => {
    const subC = Math.max(0, Math.round(Number(subtotal || '0') * 100));
    const taxBp = Math.max(0, Math.round(Number(taxRate || '0') * 100));
    const taxC = Math.round((subC * taxBp) / (100 * 100));
    const totalC = subC + taxC;
    return {
      subtotal: (subC / 100).toFixed(2),
      taxTotal: (taxC / 100).toFixed(2),
      total: (totalC / 100).toFixed(2),
    };
  }, [subtotal, taxRate]);

  const reset = () => {
    setCounterpartyName('');
    setCounterpartyRnc('');
    setDescription('');
    setSubtotal('');
    setTaxRate(defaultTaxRate);
    setError(null);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (Number(computed.total) <= 0) {
      setError('El monto debe ser mayor que 0.');
      return;
    }
    try {
      const input: IssueStandaloneDocumentInput = {
        docTypeCode,
        counterpartyName: counterpartyName.trim() || undefined,
        counterpartyRnc: counterpartyRnc.trim() || undefined,
        subtotal: computed.subtotal,
        taxTotal: computed.taxTotal,
        total: computed.total,
        items: description.trim()
          ? [
              {
                description: description.trim(),
                quantity: '1',
                unitPrice: computed.subtotal,
                taxRate,
                taxTotal: computed.taxTotal,
                total: computed.total,
              },
            ]
          : undefined,
      };
      const result = await issue.mutateAsync(input);
      setLastIssued({ ncf: result.ncf, docType: result.docType });
      reset();
      onIssued?.({ ncf: result.ncf, docType: result.docType });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          label="Tipo de comprobante"
          required
          hint={
            allowedTypes.length > 1
              ? 'Elige e-CF (E) o NCF tradicional (B) según el régimen activo.'
              : undefined
          }
        >
          <Select
            value={docTypeCode}
            onChange={(e) =>
              setDocTypeCode(e.target.value as Props['allowedTypes'][number])
            }
          >
            {allowedTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={counterpartyLabel}>
          <Input
            value={counterpartyName}
            onChange={(e) => setCounterpartyName(e.target.value)}
            maxLength={180}
            placeholder={
              counterpartyLabel.toLowerCase().includes('proveedor')
                ? 'Nombre del proveedor o vendedor'
                : 'Beneficiario / nota'
            }
          />
        </FormField>
        {showCounterpartyRnc && (
          <FormField
            label="RNC / Cédula (opcional)"
            hint="9 dígitos RNC o 11 cédula. Sin guiones."
          >
            <Input
              value={counterpartyRnc}
              onChange={(e) => setCounterpartyRnc(e.target.value)}
              maxLength={16}
              placeholder="123456789"
            />
          </FormField>
        )}
        <FormField label="Subtotal (RD$)" required>
          <Input
            value={subtotal}
            onChange={(e) => setSubtotal(e.target.value)}
            pattern="^\d+(\.\d{1,2})?$"
            inputMode="decimal"
            placeholder="0.00"
          />
        </FormField>
        {showTax && (
          <FormField label="ITBIS (%)">
            <Input
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              pattern="^\d+(\.\d{1,2})?$"
              inputMode="decimal"
            />
          </FormField>
        )}
        <div className="sm:col-span-2">
          <FormField label="Descripción / concepto">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={255}
              className="min-h-[60px]"
              placeholder="Detalle del bien o servicio adquirido"
            />
          </FormField>
        </div>
      </div>

      {Number(computed.total) > 0 && (
        <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{formatMoney(computed.subtotal)}</span>
          </div>
          {showTax && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">ITBIS</span>
              <span className="tabular-nums">{formatMoney(computed.taxTotal)}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t border-border pt-1 font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatMoney(computed.total)}</span>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}
      {lastIssued && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4" />
          <span>
            Emitido <strong className="font-mono">{lastIssued.ncf}</strong> ({lastIssued.docType})
          </span>
        </div>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={issue.isPending}>
            Cancelar
          </Button>
        )}
        <Button type="button" variant="outline" onClick={reset} disabled={issue.isPending}>
          Limpiar
        </Button>
        <Button type="submit" disabled={issue.isPending}>
          {issue.isPending ? 'Emitiendo…' : 'Emitir comprobante'}
        </Button>
      </div>
    </form>
  );
}
