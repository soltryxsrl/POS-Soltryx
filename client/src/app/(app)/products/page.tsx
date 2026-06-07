'use client';

import { ProductsTable } from '@/features/products/ui/components/ProductsTable';

export default function ProductsPage() {
  // Página a alto fijo: no scrollea en Y; el scroll vive dentro de la tabla
  // (thead sticky) y la paginación queda anclada abajo. El título "Productos"
  // va slim dentro de la barra de la tabla (junto a "Filtros"), reemplazando el
  // SectionHeader grande para ganar alto.
  return (
    <div className="flex h-[calc(100vh-6.5rem)] min-h-[480px] flex-col">
      <ProductsTable fillHeight title="Productos" />
    </div>
  );
}
