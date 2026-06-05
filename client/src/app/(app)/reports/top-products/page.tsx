'use client';

import { useState } from 'react';
import { localDateISO, startOfMonthLocalISO } from '@/shared/lib/date';
import { ReportShell, RangeInputs } from '@/features/reports/ui/components/ReportShell';
import { TopProductsTable } from '@/features/reports/ui/components/TopProductsTable';
import { useConsolidated } from '@/features/reports/ui/hooks/use-consolidated';

export default function TopProductsReportPage() {
  const [from, setFrom] = useState(startOfMonthLocalISO());
  const [to, setTo] = useState(localDateISO());
  const { branchId, toggle } = useConsolidated();
  return (
    <ReportShell
      title="Top productos"
      description="Productos más vendidos por ingresos en el rango."
      toolbar={
        <>
          <RangeInputs from={from} to={to} onFrom={setFrom} onTo={setTo} />
          {toggle}
        </>
      }
    >
      <TopProductsTable from={from} to={to} limit={10} branchId={branchId} />
    </ReportShell>
  );
}
