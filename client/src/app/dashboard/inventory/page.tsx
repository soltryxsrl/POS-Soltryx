'use client';

import { StockMovementsTable } from '@/features/inventory/ui/components/StockMovementsTable';

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inventario</h1>
        <p className="text-sm text-muted-foreground">
          Historial de todos los movimientos de stock. Los ajustes manuales se hacen desde un
          producto en la tabla de productos.
        </p>
      </div>
      <StockMovementsTable />
    </div>
  );
}
