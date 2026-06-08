'use client';

import { useState } from 'react';
import { getErrorMessage } from '@/shared/lib/error-message';
import { Button } from '@/shared/ui/controls/Button';
import { FormFooter } from '@/shared/ui/controls/FormFooter';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import { useUpdatePurchaseFiscal } from '../../application/hooks/use-purchases';
import type { PurchaseOrder } from '../../domain/types';
import {
  PurchaseFiscalFields,
  validatePurchaseFiscal,
  type PurchaseFiscalValue,
} from './PurchaseFiscalFields';

/**
 * Diálogo para agregar/editar el comprobante fiscal (606) de una compra ya
 * creada, sin tener que cancelarla y recrearla. Reutiliza el bloque fiscal del
 * formulario de creación.
 */
export function PurchaseFiscalDialog({
  order,
  onClose,
}: {
  order: PurchaseOrder;
  onClose: () => void;
}) {
  const update = useUpdatePurchaseFiscal(order.id);
  const [fiscal, setFiscal] = useState<PurchaseFiscalValue>({
    supplierFiscalDocTypeCode: order.supplierFiscalDocTypeCode ?? '',
    supplierNcf: order.supplierNcf ?? '',
    supplierInvoiceDate: order.supplierInvoiceDate ?? '',
    paymentMethod: order.paymentMethod ?? 'CASH',
    itbisRetenido:
      order.itbisRetenido && order.itbisRetenido !== '0.00' ? order.itbisRetenido : '',
    isrRetenido: order.isrRetenido && order.isrRetenido !== '0.00' ? order.isrRetenido : '',
    isrRetentionType: order.isrRetentionType ?? '',
  });
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    const fiscalErr = validatePurchaseFiscal(
      fiscal,
      Math.round(parseFloat(order.taxTotal) * 100),
    );
    if (fiscalErr) {
      setError(fiscalErr);
      return;
    }
    try {
      await update.mutateAsync(
        fiscal.supplierFiscalDocTypeCode
          ? {
              supplierFiscalDocTypeCode: fiscal.supplierFiscalDocTypeCode,
              supplierNcf: fiscal.supplierNcf.trim() || undefined,
              supplierInvoiceDate: fiscal.supplierInvoiceDate || undefined,
              paymentMethod: fiscal.paymentMethod,
              itbisRetenido: fiscal.itbisRetenido.trim() || undefined,
              isrRetenido: fiscal.isrRetenido.trim() || undefined,
              isrRetentionType: fiscal.isrRetentionType || undefined,
            }
          : { paymentMethod: fiscal.paymentMethod },
      );
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  return (
    <MaintenanceShell
      open
      onClose={onClose}
      title={`Comprobante 606 · ${order.orderNumber}`}
      size="lg"
    >
      <div className="space-y-4">
        <PurchaseFiscalFields
          value={fiscal}
          onChange={(patch) => setFiscal((f) => ({ ...f, ...patch }))}
        />
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}
        <FormFooter>
          <Button variant="outline" onClick={onClose} disabled={update.isPending}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={update.isPending}>
            {update.isPending ? 'Guardando...' : 'Guardar comprobante'}
          </Button>
        </FormFooter>
      </div>
    </MaintenanceShell>
  );
}
