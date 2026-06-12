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
  /**
   * Bloquea TODAS las vías de cierre (Escape, click en backdrop y botón X)
   * mientras hay un envío en curso. Imprescindible en flujos de dinero: cerrar
   * el cobro a mitad del request invita a reintentar y duplicar la venta.
   */
  disableClose?: boolean;
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

/**
 * Stack global de diálogos abiertos: Escape solo cierra el de más arriba.
 * Sin esto, con dos shells anidados (p.ej. ConfirmDialog sobre un form) un
 * Escape cerraría ambos a la vez.
 */
const dialogStack: symbol[] = [];

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function MaintenanceShell({
  open,
  onClose,
  title,
  size = 'md',
  forceMode,
  disableClose = false,
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

  const panelRef = useRef<HTMLDivElement | null>(null);
  const dialogIdRef = useRef<symbol>();
  if (!dialogIdRef.current) dialogIdRef.current = Symbol('maintenance-shell');

  // `disableClose` cambia entre renders (isPending) sin re-suscribir el listener.
  const disableCloseRef = useRef(disableClose);
  disableCloseRef.current = disableClose;

  /**
   * Trackea dónde inició el mousedown para evitar que un arrastre que empieza
   * dentro del modal (ej. seleccionar texto en un input) y termina fuera dispare
   * el cierre al soltar.
   */
  const mouseDownOnBackdropRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    const id = dialogIdRef.current!;
    dialogStack.push(id);

    // Foco inicial dentro del diálogo: primer elemento enfocable, o el panel.
    // Sin esto, el tecleo sigue cayendo en lo que estaba detrás (p.ej. el
    // buscador del POS bajo el modal de cobro). Se restaura al cerrar.
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      if (panel.contains(document.activeElement)) return; // algo (autoFocus) ya tomó el foco
      const first = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (first ?? panel).focus();
    }, 0);

    const onKey = (e: KeyboardEvent) => {
      // Solo el diálogo superior reacciona al teclado global.
      if (dialogStack[dialogStack.length - 1] !== id) return;
      if (e.key === 'Escape') {
        if (!disableCloseRef.current) onClose();
        return;
      }
      // Focus trap: Tab cicla dentro del panel.
      if (e.key === 'Tab') {
        const panel = panelRef.current;
        if (!panel) return;
        const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
        if (focusables.length === 0) {
          e.preventDefault();
          panel.focus();
          return;
        }
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        const active = document.activeElement;
        if (e.shiftKey && (active === first || !panel.contains(active))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(focusTimer);
      const idx = dialogStack.lastIndexOf(id);
      if (idx >= 0) dialogStack.splice(idx, 1);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  const handleBackdropMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    mouseDownOnBackdropRef.current = e.target === e.currentTarget;
  };

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    // Solo cerrar si tanto mousedown como click ocurrieron directamente sobre
    // el backdrop (no sobre algún hijo). Evita cerrar al arrastrar/soltar fuera.
    if (e.target === e.currentTarget && mouseDownOnBackdropRef.current && !disableClose) {
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
          ref={panelRef as React.RefObject<HTMLElement & HTMLDivElement>}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          tabIndex={-1}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'relative flex h-full flex-col border-l border-border bg-card shadow-2xl shadow-brand-from/10 outline-none',
            'animate-in slide-in-from-right duration-300',
            DRAWER_SIZE[size],
          )}
        >
          <Header title={title} onClose={onClose} disableClose={disableClose} />
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
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          tabIndex={-1}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'relative flex w-full max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-brand-from/10 outline-none',
            'animate-in zoom-in-95 fade-in duration-200',
            MODAL_SIZE[size],
          )}
        >
          <Header title={title} onClose={onClose} disableClose={disableClose} />
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

function Header({
  title,
  onClose,
  disableClose,
}: {
  title: string;
  onClose: () => void;
  disableClose: boolean;
}) {
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
        disabled={disableClose}
        aria-label="Cerrar"
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
