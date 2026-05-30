'use client';

import { ActiveSessionCard } from '@/features/cash/ui/components/ActiveSessionCard';
import { CashStatusPill } from '@/features/cash/ui/components/CashStatusPill';
import { SessionsTable } from '@/features/cash/ui/components/SessionsTable';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';

export default function CashPage() {
  return (
    <div className="space-y-8">
      <SectionHeader title="Caja" actions={<CashStatusPill />} />

      <ActiveSessionCard />

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Historial de sesiones</h2>
        <SessionsTable />
      </section>
    </div>
  );
}
