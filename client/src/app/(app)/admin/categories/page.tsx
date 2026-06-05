'use client';

import { CategoriesTable } from '@/features/categories/ui/components/CategoriesTable';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Categorías"
        description="Organiza el catálogo de productos por categorías y subcategorías."
        crumbs={[{ label: 'Catálogo' }]}
      />
      <CategoriesTable />
    </div>
  );
}
