import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface Props {
  title: string;
  description?: string;
  /**
   * Breadcrumbs adicionales antes del título (sin incluir "Dashboard", que se
   * antepone automáticamente, ni el título actual). Si se omite, solo se muestra
   * "Dashboard › <title>".
   *
   * @example crumbs={[{ label: 'Administración' }]} en /admin/users
   */
  crumbs?: BreadcrumbItem[];
  /** Botones / controles a la derecha (opcional). */
  actions?: ReactNode;
  className?: string;
}

const ROOT_CRUMB: BreadcrumbItem = { label: 'Dashboard', href: '/' };

export function SectionHeader({
  title,
  description,
  crumbs,
  actions,
  className,
}: Props) {
  const trail: BreadcrumbItem[] = [ROOT_CRUMB, ...(crumbs ?? [])];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-brand-tint via-card to-card px-6 py-5 shadow-sm shadow-brand-soft/20',
        className,
      )}
    >
      {/* Soft glow blob top-right corner */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-from/10 blur-3xl"
      />

      <nav
        aria-label="Breadcrumb"
        className="relative mb-2 flex items-center gap-1 text-xs"
      >
        {trail.map((c, i) => (
          <span key={`${c.label}-${i}`} className="flex items-center gap-1">
            {c.href ? (
              <Link
                href={c.href}
                className="text-muted-foreground transition hover:text-foreground"
              >
                {c.label}
              </Link>
            ) : (
              <span className="text-muted-foreground">{c.label}</span>
            )}
            <ChevronRight aria-hidden className="h-3 w-3 text-muted-foreground/50" />
          </span>
        ))}
        <span className="font-medium text-foreground">{title}</span>
      </nav>

      <div className="relative flex items-end gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
