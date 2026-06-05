'use client';

import { ReportShell } from '@/features/reports/ui/components/ReportShell';
import { LowStockTable } from '@/features/reports/ui/components/LowStockTable';
import { useConsolidated } from '@/features/reports/ui/hooks/use-consolidated';

export default function LowStockReportPage() {
  const { branchId, toggle } = useConsolidated();
  return (
    <ReportShell
      title="Stock bajo"
      description="Productos en o bajo su umbral (punto de reorden, o el mínimo si no está definido)."
      toolbar={toggle ?? undefined}
    >
      <LowStockTable branchId={branchId} />
    </ReportShell>
  );
}
