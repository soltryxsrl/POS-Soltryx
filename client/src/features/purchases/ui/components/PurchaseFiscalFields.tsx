'use client';

import { AlertTriangle } from 'lucide-react';
import { FormField } from '@/shared/ui/controls/FormField';
import { Input } from '@/shared/ui/controls/Input';
import { Select } from '@/shared/ui/controls/Select';
import { ncfErrorFor, ncfStatus } from '@/shared/lib/rd-identifiers';
import { useFiscalDocTypes } from '@/features/fiscal/application/hooks/use-fiscal';

/** Bloque de datos fiscales (comprobante 606) de una compra. */
export interface PurchaseFiscalValue {
  supplierFiscalDocTypeCode: string;
  supplierNcf: string;
  supplierInvoiceDate: string;
  paymentMethod: string;
  itbisRetenido: string;
  isrRetenido: string;
  isrRetentionType: string;
}

export const EMPTY_FISCAL: PurchaseFiscalValue = {
  supplierFiscalDocTypeCode: '',
  supplierNcf: '',
  supplierInvoiceDate: '',
  paymentMethod: 'CASH',
  itbisRetenido: '',
  isrRetenido: '',
  isrRetentionType: '',
};

/**
 * Valida el bloque fiscal completo para el ENVÍO (mensajes en español, sin
 * nombres técnicos). Si no hay tipo de comprobante no hay nada que validar.
 * Devuelve el primer error, o `null` si está OK.
 */
export function validatePurchaseFiscal(
  v: PurchaseFiscalValue,
  taxTotalCents?: number,
): string | null {
  if (!v.supplierFiscalDocTypeCode) return null;
  if (!v.supplierNcf.trim()) return 'El NCF del proveedor es obligatorio.';
  const ncfErr = ncfErrorFor(v.supplierFiscalDocTypeCode, v.supplierNcf);
  if (ncfErr) return ncfErr;
  if (!v.supplierInvoiceDate) return 'La fecha del comprobante es obligatoria.';
  if (Number(v.isrRetenido || '0') > 0 && !v.isrRetentionType) {
    return 'Indica el tipo de retención de ISR cuando registras un ISR retenido.';
  }
  // El ITBIS retenido no puede exceder el ITBIS facturado de la compra (igual
  // que valida el servidor). Solo se comprueba si se conoce el ITBIS facturado.
  if (
    taxTotalCents != null &&
    Math.round(Number(v.itbisRetenido || '0') * 100) > taxTotalCents
  ) {
    return 'El ITBIS retenido no puede exceder el ITBIS facturado de la compra.';
  }
  return null;
}

/**
 * Sección de datos fiscales DGII de una compra (tipo de comprobante, NCF, fecha,
 * forma de pago y retenciones). Controlada: recibe `value` y emite parches con
 * `onChange`. Cuando no hay tipo de comprobante, avisa que la compra no entrará
 * al 606. Reutilizada por el formulario de creación y el diálogo de edición.
 */
export function PurchaseFiscalFields({
  value,
  onChange,
}: {
  value: PurchaseFiscalValue;
  onChange: (patch: Partial<PurchaseFiscalValue>) => void;
}) {
  const hasType = !!value.supplierFiscalDocTypeCode;
  const ncf = hasType
    ? ncfStatus(value.supplierFiscalDocTypeCode, value.supplierNcf)
    : ({ state: 'empty' } as const);

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-border bg-muted/20 p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Datos fiscales DGII (para 606)
      </div>

      {!hasType && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Sin comprobante fiscal esta compra <strong>no aparecerá en el 606</strong>. Elige el
            tipo de comprobante y captura el NCF del proveedor para reportarla.
          </span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <FormField label="Tipo comprobante">
          <FiscalDocTypeSelect
            value={value.supplierFiscalDocTypeCode}
            onChange={(v) => onChange({ supplierFiscalDocTypeCode: v })}
          />
        </FormField>
        <FormField label="NCF del proveedor" required={hasType}>
          <Input
            value={value.supplierNcf}
            onChange={(e) => onChange({ supplierNcf: e.target.value })}
            maxLength={32}
            placeholder={
              value.supplierFiscalDocTypeCode === 'E41'
                ? 'E410000000001'
                : value.supplierFiscalDocTypeCode?.startsWith('E')
                  ? 'E310000000001'
                  : 'B0100000001'
            }
            disabled={!hasType}
            aria-invalid={ncf.state === 'invalid'}
          />
          {ncf.state === 'invalid' && (
            <p className="mt-1 text-xs text-destructive">{ncf.message}</p>
          )}
          {ncf.state === 'incomplete' && (
            <p className="mt-1 text-xs text-muted-foreground">
              {ncf.typed}/{ncf.total} caracteres · faltan {ncf.remaining}
            </p>
          )}
          {ncf.state === 'ok' && (
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">NCF completo ✓</p>
          )}
          {hasType && ncf.state === 'empty' && (
            <p className="mt-1 text-xs text-muted-foreground">Requerido para el 606.</p>
          )}
        </FormField>
        <FormField label="Fecha comprobante" required={hasType}>
          <Input
            type="date"
            value={value.supplierInvoiceDate}
            onChange={(e) => onChange({ supplierInvoiceDate: e.target.value })}
            disabled={!hasType}
          />
          {hasType && !value.supplierInvoiceDate && (
            <p className="mt-1 text-xs text-muted-foreground">Requerida para el 606.</p>
          )}
        </FormField>
      </div>

      <FormField label="Forma de pago" className="sm:max-w-xs">
        <Select
          value={value.paymentMethod}
          onChange={(e) => onChange({ paymentMethod: e.target.value })}
        >
          <option value="CASH">Efectivo</option>
          <option value="TRANSFER">Cheque / Transferencia / Depósito</option>
          <option value="CARD">Tarjeta</option>
          <option value="CREDIT">Compra a crédito</option>
          <option value="OTHER">Otra</option>
        </Select>
      </FormField>

      {hasType && (
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="ITBIS retenido" hint="Solo si eres agente de retención.">
            <Input
              inputMode="decimal"
              value={value.itbisRetenido}
              onChange={(e) => onChange({ itbisRetenido: e.target.value })}
              placeholder="0.00"
            />
          </FormField>
          <FormField label="ISR retenido">
            <Input
              inputMode="decimal"
              value={value.isrRetenido}
              onChange={(e) => onChange({ isrRetenido: e.target.value })}
              placeholder="0.00"
            />
          </FormField>
          <FormField label="Tipo retención ISR">
            <Select
              value={value.isrRetentionType}
              onChange={(e) => onChange({ isrRetentionType: e.target.value })}
            >
              <option value="">No aplica</option>
              <option value="01">01 Alquileres</option>
              <option value="02">02 Honorarios por servicios</option>
              <option value="03">03 Otras rentas</option>
              <option value="04">04 Rentas presuntas</option>
              <option value="05">05 Intereses pagados a PJ</option>
              <option value="06">06 Intereses pagados a PF</option>
              <option value="07">07 Proveedores del Estado</option>
              <option value="08">08 Juegos telefónicos</option>
            </Select>
          </FormField>
        </div>
      )}
    </div>
  );
}

/**
 * Select filtrado a tipos activos que aplican a compras (B01/B14/B11/B13 +
 * E31/E41/E43). Carga del endpoint /fiscal/doc-types y filtra client-side.
 */
function FiscalDocTypeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const types = useFiscalDocTypes({ activeOnly: true });
  const purchaseTypes = (types.data ?? []).filter(
    (t) =>
      t.appliesTo === 'PURCHASE' ||
      t.appliesTo === 'BOTH' ||
      t.code === 'B01' ||
      t.code === 'B14' ||
      t.code === 'E31',
  );
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Sin comprobante fiscal</option>
      {purchaseTypes.map((t) => (
        <option key={t.code} value={t.code}>
          {t.code} — {t.name}
        </option>
      ))}
    </Select>
  );
}
