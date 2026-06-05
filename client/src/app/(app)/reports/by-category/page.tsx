'use client';

import { useState } from 'react';
import { localDateISO, startOfMonthLocalISO } from '@/shared/lib/date';
import { ReportShell, RangeInputs } from '@/features/reports/ui/components/ReportShell';
import { SalesByCategoryTable } from '@/features/reports/ui/components/AnalysisReports';
import { useConsolidated } from '@/features/reports/ui/hooks/use-consolidated';

export default function SalesByCategoryReportPage() {
  const [from, setFrom] = useState(startOfMonthLocalISO());
  const [to, setTo] = useState(localDateISO());
  const { branchId, toggle } = useConsolidated();
  return (
    <ReportShell
      title="Ventas por categoría"
      description="Ingresos y unidades agrupados por categoría."
      toolbar={
        <>
          <RangeInputs from={from} to={to} onFrom={setFrom} onTo={setTo} />
          {toggle}
        </>
      }
    >
      <SalesByCategoryTable from={from} to={to} branchId={branchId} />
    </ReportShell>
  );
}
