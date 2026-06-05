'use client';

import { useState } from 'react';
import { localDateISO, startOfMonthLocalISO } from '@/shared/lib/date';
import { ReportShell, RangeInputs } from '@/features/reports/ui/components/ReportShell';
import { PriceHistoryTable } from '@/features/reports/ui/components/PriceHistoryTable';
import { useConsolidated } from '@/features/reports/ui/hooks/use-consolidated';

export default function PriceHistoryReportPage() {
  const [from, setFrom] = useState(startOfMonthLocalISO());
  const [to, setTo] = useState(localDateISO());
  const { branchId, toggle } = useConsolidated();
  return (
    <ReportShell
      title="Historial de cambios de precio"
      description="Quién cambió un precio, cuándo y de cuánto a cuánto (individual o masivo)."
      toolbar={
        <>
          <RangeInputs from={from} to={to} onFrom={setFrom} onTo={setTo} />
          {toggle}
        </>
      }
    >
      <PriceHistoryTable from={from} to={to} branchId={branchId} />
    </ReportShell>
  );
}
