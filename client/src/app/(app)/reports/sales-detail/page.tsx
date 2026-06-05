'use client';

import { useState } from 'react';
import { localDateISO, startOfMonthLocalISO } from '@/shared/lib/date';
import { ReportShell, RangeInputs } from '@/features/reports/ui/components/ReportShell';
import { SalesDetailTable } from '@/features/reports/ui/components/SalesDetailTable';
import { useConsolidated } from '@/features/reports/ui/hooks/use-consolidated';

export default function SalesDetailReportPage() {
  const [from, setFrom] = useState(startOfMonthLocalISO());
  const [to, setTo] = useState(localDateISO());
  const { branchId, toggle } = useConsolidated();
  return (
    <ReportShell
      title="Detalle de ventas"
      description="Renglón por renglón con costo y margen. Exportable a CSV/PDF."
      toolbar={
        <>
          <RangeInputs from={from} to={to} onFrom={setFrom} onTo={setTo} />
          {toggle}
        </>
      }
    >
      <SalesDetailTable from={from} to={to} branchId={branchId} />
    </ReportShell>
  );
}
