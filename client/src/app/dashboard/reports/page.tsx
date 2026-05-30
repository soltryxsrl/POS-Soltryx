'use client';

import { useState } from 'react';
import { DailySummaryCards } from '@/features/reports/ui/components/DailySummaryCards';
import { LowStockTable } from '@/features/reports/ui/components/LowStockTable';
import { TopProductsTable } from '@/features/reports/ui/components/TopProductsTable';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function startOfMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const [date, setDate] = useState(todayIso());
  const [from, setFrom] = useState(startOfMonthIso());
  const [to, setTo] = useState(todayIso());

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reportes</h1>
        <p className="text-sm text-muted-foreground">
          Visión rápida de ventas, productos e inventario.
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-medium">Día</h2>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          />
        </div>
        <DailySummaryCards date={date} />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-medium">Rango</h2>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Desde</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5"
            />
            <span className="text-muted-foreground">Hasta</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5"
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <TopProductsTable from={from} to={to} limit={10} />
          <LowStockTable />
        </div>
      </section>
    </div>
  );
}
