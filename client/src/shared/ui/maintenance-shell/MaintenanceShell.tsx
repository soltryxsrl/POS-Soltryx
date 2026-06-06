'use client';

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import {
  usePreferencesStore,
  type MaintenanceMode,
} from '@/shared/ui/preferences/preferences.store';

type Size = 'sm' | 'md' | 'lg' | 'xl';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: Size;
  /** Forzar modo independientemente de la preferencia del usuario. */
  forceMode?: MaintenanceMode;
  children: ReactNode;
}

const MODAL_SIZE: Record<Size, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

const DRAWER_SIZE: Record<Size, string> = {
  sm: 'w-full sm:w-[380px]',
  md: 'w-full sm:w-[460px]',
  lg: 'w-full sm:w-[580px]',
  xl: 'w-full sm:w-[740px]',
};

export function MaintenanceShell({
  open,
  onClose,
  title,
  size = 'md',
  forceMode,
  children,
}: Props) {
  const preferredMode = usePreferencesStore((s) => s.maintenanceMode);
  const mode = forceMode ?? preferredMode;

  // Portamos el modal a <body> para que `fixed inset-0` cubra TODO el viewport.
  // Si se renderiza dentro del árbol de la página, cualquier ancestro con
  // transform/filter/backdrop-filter/container-type crea un bloque contenedor y
  // el backdrop no llega hasta arriba. El guard `mounted` evita el mismatch SSR.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /**
   * Trackea dónde inició el mousedown para evitar que un arrastre que empieza
   * dentro del modal (ej. seleccionar texto en un input) y termina fuera dispare
   * el cierre al soltar.
   */
  const mouseDownOnBackdropRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleBackdropMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    mouseDownOnBackdropRef.current = e.target === e.currentTarget;
  };

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    // Solo cerrar si tanto mousedown como click ocurrieron directamente sobre
    // el backdrop (no sobre algún hijo). Evita cerrar al arrastrar/soltar fuera.
    if (e.target === e.currentTarget && mouseDownOnBackdropRef.current) {
      onClose();
    }
    mouseDownOnBackdropRef.current = false;
  };

  if (!open || !mounted) return null;

  const content =
    mode === 'drawer' ? (
      <div
        className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-150"
        onMouseDown={handleBackdropMouseDown}
        onClick={handleBackdropClick}
      >
        <aside
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'relative flex h-full flex-col border-l border-border bg-card shadow-2xl shadow-brand-from/10',
            'animate-in slide-in-from-right duration-300',
            DRAWER_SIZE[size],
          )}
        >
          <Header title={title} onClose={onClose} />
          {/* Sin padding inferior cuando hay FormFooter (`.form-footer`): así la
              barra de acciones queda al ras del borde. Sin footer, conserva el
              `pb-5` de respiro. */}
          <div className="flex-1 overflow-y-auto px-6 pt-5 pb-5 [&:has(.form-footer)]:pb-0">
            {children}
          </div>
        </aside>
      </div>
    ) : (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm animate-in fade-in duration-150"
        onMouseDown={handleBackdropMouseDown}
        onClick={handleBackdropClick}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'relative flex w-full max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-brand-from/10',
            'animate-in zoom-in-95 fade-in duration-200',
            MODAL_SIZE[size],
          )}
        >
          <Header title={title} onClose={onClose} />
          {/* Sin padding inferior cuando hay FormFooter (`.form-footer`): así la
              barra de acciones queda al ras del borde. Sin footer, conserva el
              `pb-5` de respiro. */}
          <div className="flex-1 overflow-y-auto px-6 pt-5 pb-5 [&:has(.form-footer)]:pb-0">
            {children}
          </div>
        </div>
      </div>
    );

  return createPortal(content, document.body);
}

function Header({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="relative flex items-center gap-3 border-b border-border px-6 py-4">
      <span
        aria-hidden
        className="absolute left-0 top-1/2 h-6 -translate-y-1/2 w-1 rounded-r-full bg-gradient-to-b from-brand-from to-brand-to"
      />
      <h2 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
