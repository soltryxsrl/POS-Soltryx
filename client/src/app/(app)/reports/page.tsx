'use client';

import { useState } from 'react';
import { useHasPermission } from '@/features/auth/application/hooks/use-auth';
import { DailySummaryCards } from '@/features/reports/ui/components/DailySummaryCards';
import { LowStockTable } from '@/features/reports/ui/components/LowStockTable';
import { TopProductsTable } from '@/features/reports/ui/components/TopProductsTable';
import { localDateISO, startOfMonthLocalISO } from '@/shared/lib/date';
import { Input } from '@/shared/ui/controls/Input';
import { Switch } from '@/shared/ui/controls/Switch';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';

export default function ReportsPage() {
  const [date, setDate] = useState(localDateISO());
  const [from, setFrom] = useState(startOfMonthLocalISO());
  const [to, setTo] = useState(localDateISO());
  // Solo quien puede cambiar de sucursal puede ver el consolidado de todas.
  const canConsolidate = useHasPermission('branches.switch');
  const [allBranches, setAllBranches] = useState(false);
  // `'all'` = consolidado (todas las sucursales); undefined = la sucursal activa.
  const branchId = canConsolidate && allBranches ? 'all' : undefined;

  return (
    <div className="space-y-8">
      <SectionHeader title="Reportes" />

      {canConsolidate && (
        <div className="w-fit rounded-xl border border-border bg-card px-3 py-2">
          <Switch
            checked={allBranches}
            onChange={setAllBranches}
            label="Consolidado (todas las sucursales)"
          />
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-medium">Día</h2>
          <div className="w-44">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        <DailySummaryCards date={date} branchId={branchId} />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-medium">Rango</h2>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Desde</span>
            <div className="w-44">
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <span className="text-muted-foreground">Hasta</span>
            <div className="w-44">
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <TopProductsTable from={from} to={to} limit={10} branchId={branchId} />
          <LowStockTable branchId={branchId} />
        </div>
      </section>
    </div>
  );
}
