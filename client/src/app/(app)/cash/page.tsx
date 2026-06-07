'use client';

import { useState } from 'react';
import { ActiveSessionCard } from '@/features/cash/ui/components/ActiveSessionCard';
import { CashStatusPill } from '@/features/cash/ui/components/CashStatusPill';
import { SessionsTable } from '@/features/cash/ui/components/SessionsTable';
import { Tabs } from '@/shared/ui/controls/Tabs';

type Tab = 'turno' | 'historial';

// Caja separa sus dos concerns en pestañas: "Turno actual" (la sesión abierta +
// sus movimientos + acciones, con scroll propio) e "Historial" (la tabla de
// sesiones, que aquí sí va a alto completo con scroll interno). Así ninguna de
// las dos listas pelea por el espacio con la otra.
export default function CashPage() {
  const [tab, setTab] = useState<Tab>('turno');

  return (
    <div className="flex h-[calc(100vh-6.5rem)] min-h-[480px] flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Caja</h1>
        <CashStatusPill />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'turno', label: 'Turno actual' },
          { value: 'historial', label: 'Historial' },
        ]}
      />

      {tab === 'turno' ? (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <ActiveSessionCard />
        </div>
      ) : (
        <SessionsTable fillHeight />
      )}
    </div>
  );
}
