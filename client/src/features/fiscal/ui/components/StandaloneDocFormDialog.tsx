'use client';

import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import { StandaloneDocForm } from './StandaloneDocForm';

interface Props {
  title: string;
  allowedTypes: Array<'E41' | 'E43' | 'B11' | 'B13'>;
  counterpartyLabel: string;
  showCounterpartyRnc: boolean;
  showTax: boolean;
  defaultTaxRate?: string;
  onClose: () => void;
}

/**
 * Dialog que envuelve el StandaloneDocForm — sigue el patrón del resto del
 * sistema (DataTable + Fab → FormDialog). Se cierra automáticamente al
 * emitir un comprobante OK.
 */
export function StandaloneDocFormDialog({
  title,
  allowedTypes,
  counterpartyLabel,
  showCounterpartyRnc,
  showTax,
  defaultTaxRate,
  onClose,
}: Props) {
  return (
    <MaintenanceShell open onClose={onClose} title={title} size="lg">
      <StandaloneDocForm
        allowedTypes={allowedTypes}
        counterpartyLabel={counterpartyLabel}
        showCounterpartyRnc={showCounterpartyRnc}
        showTax={showTax}
        defaultTaxRate={defaultTaxRate}
        onIssued={onClose}
        onCancel={onClose}
      />
    </MaintenanceShell>
  );
}
