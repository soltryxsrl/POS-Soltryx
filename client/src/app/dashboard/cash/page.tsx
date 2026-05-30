'use client';

import { ActiveSessionCard } from '@/features/cash/ui/components/ActiveSessionCard';
import { SessionsTable } from '@/features/cash/ui/components/SessionsTable';

export default function CashPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Caja</h1>
        <p className="text-sm text-muted-foreground">
          Abre y cierra tu caja. Solo se puede tener una sesión abierta por caja registradora.
        </p>
      </div>

      <ActiveSessionCard />

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Historial de sesiones</h2>
        <SessionsTable />
      </section>
    </div>
  );
}
