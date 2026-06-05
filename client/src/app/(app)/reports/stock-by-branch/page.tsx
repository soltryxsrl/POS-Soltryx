'use client';

import { ReportShell } from '@/features/reports/ui/components/ReportShell';
import { StockByBranchTable } from '@/features/reports/ui/components/StockByBranchTable';
import { useConsolidated } from '@/features/reports/ui/hooks/use-consolidated';

export default function StockByBranchReportPage() {
  const { canConsolidate } = useConsolidated();
  return (
    <ReportShell
      title="Existencia por sucursal"
      description="Matriz comparativa de stock por producto y sucursal (consolidado)."
    >
      {canConsolidate ? (
        <StockByBranchTable />
      ) : (
        <div className="rounded-lg border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          Este reporte consolidado requiere permiso para cambiar de sucursal
          (gerencia/administración).
        </div>
      )}
    </ReportShell>
  );
}
