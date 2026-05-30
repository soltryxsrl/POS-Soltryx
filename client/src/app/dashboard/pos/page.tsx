'use client';

import { POSScreen } from '@/features/sales/ui/components/POSScreen';

export default function PosPage() {
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">POS</h1>
        <p className="text-sm text-muted-foreground">
          Punto de venta. Busca productos, arma el carrito y cobra.
        </p>
      </div>
      <POSScreen />
    </div>
  );
}
