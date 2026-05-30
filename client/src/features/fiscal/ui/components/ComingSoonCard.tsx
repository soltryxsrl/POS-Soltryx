'use client';

import { Clock } from 'lucide-react';

interface Props {
  sprint: number;
  shortDescription: string;
  details: string;
}

/**
 * Placeholder usado en páginas del módulo Impuestos cuya implementación
 * vendrá en sprints siguientes. Da contexto al usuario sin parecer "roto".
 */
export function ComingSoonCard({ sprint, shortDescription, details }: Props) {
  return (
    <div className="rounded-2xl border bg-gradient-to-br from-brand-tint via-card to-brand-soft p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-brand-from">
          <Clock className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <div className="text-sm font-semibold text-foreground">
            Disponible en Sprint {sprint}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{shortDescription}</p>
          <p className="mt-3 text-xs text-muted-foreground">{details}</p>
        </div>
      </div>
    </div>
  );
}
