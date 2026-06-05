'use client';

import { ReportShell } from '@/features/reports/ui/components/ReportShell';
import { SlowMoversTable } from '@/features/reports/ui/components/AnalysisReports';
import { useConsolidated } from '@/features/reports/ui/hooks/use-consolidated';

export default function SlowMoversReportPage() {
  const { branchId, toggle } = useConsolidated();
  return (
    <ReportShell
      title="Lento movimiento"
      description="Productos con stock sin venta en los últimos 30 días (capital inmovilizado)."
      toolbar={toggle ?? undefined}
    >
      <SlowMoversTable days={30} branchId={branchId} />
    </ReportShell>
  );
}
