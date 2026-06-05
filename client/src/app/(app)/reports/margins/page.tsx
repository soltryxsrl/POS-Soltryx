'use client';

import { useState } from 'react';
import { localDateISO, startOfMonthLocalISO } from '@/shared/lib/date';
import { ReportShell, RangeInputs } from '@/features/reports/ui/components/ReportShell';
import { ProductMarginsTable } from '@/features/reports/ui/components/AnalysisReports';
import { useConsolidated } from '@/features/reports/ui/hooks/use-consolidated';

export default function MarginsReportPage() {
  const [from, setFrom] = useState(startOfMonthLocalISO());
  const [to, setTo] = useState(localDateISO());
  const { branchId, toggle } = useConsolidated();
  return (
    <ReportShell
      title="Márgenes por producto"
      description="Ingreso, costo, margen y % por producto en el rango."
      toolbar={
        <>
          <RangeInputs from={from} to={to} onFrom={setFrom} onTo={setTo} />
          {toggle}
        </>
      }
    >
      <ProductMarginsTable from={from} to={to} branchId={branchId} />
    </ReportShell>
  );
}
