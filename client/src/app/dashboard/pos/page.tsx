'use client';

import { POSScreen } from '@/features/sales/ui/components/POSScreen';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';

export default function PosPage() {
  return (
    <div className="space-y-4">
      <SectionHeader title="Punto de venta" />
      <POSScreen />
    </div>
  );
}
