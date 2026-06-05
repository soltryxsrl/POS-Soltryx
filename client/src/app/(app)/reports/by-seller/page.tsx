'use client';

import { useState } from 'react';
import { localDateISO, startOfMonthLocalISO } from '@/shared/lib/date';
import { ReportShell, RangeInputs } from '@/features/reports/ui/components/ReportShell';
import { SalesBySellerTable } from '@/features/reports/ui/components/SalesBySellerTable';
import { useConsolidated } from '@/features/reports/ui/hooks/use-consolidated';

export default function SalesBySellerReportPage() {
  const [from, setFrom] = useState(startOfMonthLocalISO());
  const [to, setTo] = useState(localDateISO());
  const { branchId, toggle } = useConsolidated();
  return (
    <ReportShell
      title="Ventas por vendedor"
      description="Total vendido y ticket promedio por vendedor (el usuario que registró la venta). Base para comisiones."
      toolbar={
        <>
          <RangeInputs from={from} to={to} onFrom={setFrom} onTo={setTo} />
          {toggle}
        </>
      }
    >
      <SalesBySellerTable from={from} to={to} branchId={branchId} />
    </ReportShell>
  );
}
