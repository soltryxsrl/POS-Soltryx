'use client';

import { ReturnsTable } from '@/features/returns/ui/components/ReturnsTable';

export default function ReturnsPage() {
  return (
    <div className="flex h-[calc(100vh-6.5rem)] min-h-[480px] flex-col">
      <ReturnsTable fillHeight title="Devoluciones" />
    </div>
  );
}
