'use client';

import { PromotionsTable } from '@/features/promotions/ui/components/PromotionsTable';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';

export default function PromotionsPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Promociones"
        description="Las promociones activas se aplican automáticamente al cobrar la venta."
      />
      <PromotionsTable />
    </div>
  );
}
