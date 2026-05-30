'use client';

import { LayoutGrid } from 'lucide-react';
import { useCategories } from '@/features/categories/application/hooks/use-categories';
import { cn } from '@/shared/lib/cn';

interface Props {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function CategoryChips({ selectedId, onSelect }: Props) {
  const categories = useCategories({ isActive: true });
  const items = categories.data ?? [];

  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 pt-1">
      <Chip
        active={selectedId === null}
        onClick={() => onSelect(null)}
        icon={<LayoutGrid className="h-3.5 w-3.5" />}
      >
        Todas
      </Chip>
      {items.map((cat) => (
        <Chip
          key={cat.id}
          active={selectedId === cat.id}
          onClick={() => onSelect(cat.id)}
        >
          {cat.name}
        </Chip>
      ))}
    </div>
  );
}

function Chip({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap',
        active
          ? 'border-brand-from/40 bg-gradient-to-r from-brand-from to-brand-to text-white shadow-sm shadow-brand-from/30'
          : 'border-border bg-card text-foreground hover:border-brand-from/30 hover:bg-brand-tint/40 hover:text-brand-from',
      )}
    >
      {icon}
      {children}
    </button>
  );
}
