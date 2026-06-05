'use client';

import { useState } from 'react';
import { localDateISO, startOfMonthLocalISO } from '@/shared/lib/date';
import { ReportShell, RangeInputs } from '@/features/reports/ui/components/ReportShell';
import { ReturnsAnalysisCard } from '@/features/reports/ui/components/AnalysisReports';
import { useConsolidated } from '@/features/reports/ui/hooks/use-consolidated';

export default function ReturnsReportPage() {
  const [from, setFrom] = useState(startOfMonthLocalISO());
  const [to, setTo] = useState(localDateISO());
  const { branchId, toggle } = useConsolidated();
  return (
    <ReportShell
      title="Devoluciones"
      description="Análisis de devoluciones por método de reembolso y por razón."
      toolbar={
        <>
          <RangeInputs from={from} to={to} onFrom={setFrom} onTo={setTo} />
          {toggle}
        </>
      }
    >
      <ReturnsAnalysisCard from={from} to={to} branchId={branchId} />
    </ReportShell>
  );
}
