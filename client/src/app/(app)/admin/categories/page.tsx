'use client';

import { CategoriesTable } from '@/features/categories/ui/components/CategoriesTable';

export default function CategoriesPage() {
  return (
    <div className="flex h-[calc(100vh-6.5rem)] min-h-[480px] flex-col">
      <CategoriesTable fillHeight title="Categorías" />
    </div>
  );
}
