'use client';

import { ProductsTable } from '@/features/products/ui/components/ProductsTable';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Productos" />
      <ProductsTable />
    </div>
  );
}
