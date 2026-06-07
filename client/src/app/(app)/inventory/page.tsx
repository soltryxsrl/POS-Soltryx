'use client';

import { StockMovementsTable } from '@/features/inventory/ui/components/StockMovementsTable';

export default function InventoryPage() {
  // Página a alto fijo: no scrollea en Y; el scroll vive dentro de la tabla
  // (thead sticky) y la paginación queda anclada abajo. `calc(100vh-6.5rem)`
  // descuenta el chrome del shell (p-5 externo + py-8 del main). `min-h` evita
  // que en pantallas muy bajas la tabla quede aplastada (cae a scroll normal).
  // El título "Inventario" va slim dentro de la barra de la tabla (junto a
  // "Filtros"), reemplazando el SectionHeader grande para ganar alto.
  return (
    <div className="flex h-[calc(100vh-6.5rem)] min-h-[480px] flex-col">
      <StockMovementsTable fillHeight title="Inventario" />
    </div>
  );
}
