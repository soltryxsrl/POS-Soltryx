'use client';

import { ReturnsTable } from '@/features/returns/ui/components/ReturnsTable';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';

export default function ReturnsPage() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Devoluciones" />
      <ReturnsTable />
    </div>
  );
}
