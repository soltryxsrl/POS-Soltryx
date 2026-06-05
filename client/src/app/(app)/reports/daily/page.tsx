'use client';

import { useState } from 'react';
import { localDateISO } from '@/shared/lib/date';
import { DailySummaryCards } from '@/features/reports/ui/components/DailySummaryCards';
import { DayInput, ReportShell } from '@/features/reports/ui/components/ReportShell';
import { useConsolidated } from '@/features/reports/ui/hooks/use-consolidated';

export default function DailyReportPage() {
  const [date, setDate] = useState(localDateISO());
  const { branchId, toggle } = useConsolidated();
  return (
    <ReportShell
      title="Resumen del día"
      description="Totales del día por método de pago y por usuario."
      toolbar={
        <>
          <DayInput date={date} onDate={setDate} />
          {toggle}
        </>
      }
    >
      <DailySummaryCards date={date} branchId={branchId} />
    </ReportShell>
  );
}
