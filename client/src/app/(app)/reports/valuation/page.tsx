'use client';

import { ReportShell } from '@/features/reports/ui/components/ReportShell';
import { InventoryValuationCard } from '@/features/reports/ui/components/AnalysisReports';
import { useConsolidated } from '@/features/reports/ui/hooks/use-consolidated';

export default function ValuationReportPage() {
  const { branchId, toggle } = useConsolidated();
  return (
    <ReportShell
      title="Valuación de inventario"
      description="Cuánto vale el inventario actual, con desglose por categoría."
      toolbar={toggle ?? undefined}
    >
      <InventoryValuationCard branchId={branchId} />
    </ReportShell>
  );
}
