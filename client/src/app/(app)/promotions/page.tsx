'use client';

import { PromotionsTable } from '@/features/promotions/ui/components/PromotionsTable';

export default function PromotionsPage() {
  return (
    <div className="flex h-[calc(100vh-6.5rem)] min-h-[480px] flex-col">
      <PromotionsTable fillHeight title="Promociones" />
    </div>
  );
}
