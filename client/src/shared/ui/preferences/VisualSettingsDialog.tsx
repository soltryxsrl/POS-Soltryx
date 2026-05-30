'use client';

import {
  Check,
  LayoutPanelLeft,
  Moon,
  PanelRightOpen,
  Sun,
} from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { MaintenanceShell } from '@/shared/ui/maintenance-shell/MaintenanceShell';
import {
  usePreferencesStore,
  type MaintenanceMode,
} from './preferences.store';
import { THEMES, THEME_IDS, type Theme } from './themes';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function VisualSettingsDialog({ open, onClose }: Props) {
  const maintenanceMode = usePreferencesStore((s) => s.maintenanceMode);
  const setMaintenanceMode = usePreferencesStore((s) => s.setMaintenanceMode);
  const themeId = usePreferencesStore((s) => s.themeId);
  const setThemeId = usePreferencesStore((s) => s.setThemeId);
  const darkMode = usePreferencesStore((s) => s.darkMode);
  const setDarkMode = usePreferencesStore((s) => s.setDarkMode);

  return (
    <MaintenanceShell
      open={open}
      onClose={onClose}
      title="Configuración visual"
      size="lg"
      forceMode="drawer"
    >
      <div className="space-y-8">
        <Section title="Apariencia">
          <div className="flex flex-wrap gap-6">
            <AppearanceDot
              active={!darkMode}
              onSelect={() => setDarkMode(false)}
              title="Claro"
              icon={<Sun className="h-6 w-6" />}
              dotClassName="bg-white text-amber-500 border-slate-200"
            />
            <AppearanceDot
              active={darkMode}
              onSelect={() => setDarkMode(true)}
              title="Oscuro"
              icon={<Moon className="h-6 w-6" />}
              dotClassName="bg-slate-900 text-slate-100 border-slate-800"
            />
          </div>
        </Section>

        <Section title="Color de la app">
          <div className="flex flex-wrap gap-5">
            {THEME_IDS.map((id) => (
              <ThemeDot
                key={id}
                theme={THEMES[id]}
                active={themeId === id}
                onSelect={() => setThemeId(id)}
              />
            ))}
          </div>
        </Section>

        <Section title="Modo de apertura">
          <div className="grid gap-3 sm:grid-cols-2">
            <ModeOption
              value="modal"
              current={maintenanceMode}
              onSelect={setMaintenanceMode}
              title="Modal"
              icon={<LayoutPanelLeft className="h-5 w-5" />}
              preview={
                <div className="flex h-full items-center justify-center p-3">
                  <div className="h-14 w-24 rounded-md border-2 border-brand-from bg-card shadow-md" />
                </div>
              }
            />
            <ModeOption
              value="drawer"
              current={maintenanceMode}
              onSelect={setMaintenanceMode}
              title="Drawer"
              icon={<PanelRightOpen className="h-5 w-5" />}
              preview={
                <div className="flex h-full items-stretch justify-end p-3">
                  <div className="h-full w-1/2 rounded-md border-2 border-brand-from bg-card shadow-md" />
                </div>
              }
            />
          </div>
        </Section>
      </div>
    </MaintenanceShell>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

function AppearanceDot({
  active,
  onSelect,
  title,
  icon,
  dotClassName,
}: {
  active: boolean;
  onSelect: () => void;
  title: string;
  icon: React.ReactNode;
  dotClassName: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex flex-col items-center gap-2"
      aria-pressed={active}
      aria-label={title}
    >
      <span
        className={cn(
          'relative flex h-14 w-14 items-center justify-center rounded-full border shadow-sm transition group-hover:scale-105',
          dotClassName,
          active && 'ring-2 ring-brand-from ring-offset-2 ring-offset-background',
        )}
      >
        {icon}
        {active && (
          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-from text-white shadow">
            <Check className="h-3 w-3" />
          </span>
        )}
      </span>
      <span
        className={cn(
          'text-xs font-medium',
          active ? 'text-brand-from' : 'text-muted-foreground',
        )}
      >
        {title}
      </span>
    </button>
  );
}

function ThemeDot({
  theme,
  active,
  onSelect,
}: {
  theme: Theme;
  active: boolean;
  onSelect: () => void;
}) {
  const gradient = `linear-gradient(135deg, hsl(${theme.brandFrom}), hsl(${theme.brandTo}))`;
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex flex-col items-center gap-2"
      aria-pressed={active}
      aria-label={theme.name}
    >
      <span
        className={cn(
          'relative flex h-12 w-12 items-center justify-center rounded-full shadow-md transition group-hover:scale-110',
          active && 'ring-2 ring-brand-from ring-offset-2 ring-offset-background',
        )}
        style={{ background: gradient }}
      >
        {active && (
          <Check className="h-5 w-5 text-white drop-shadow" />
        )}
      </span>
      <span
        className={cn(
          'text-xs font-medium',
          active ? 'text-brand-from' : 'text-muted-foreground',
        )}
      >
        {theme.name}
      </span>
    </button>
  );
}

function ModeOption({
  value,
  current,
  onSelect,
  title,
  icon,
  preview,
}: {
  value: MaintenanceMode;
  current: MaintenanceMode;
  onSelect: (v: MaintenanceMode) => void;
  title: string;
  icon: React.ReactNode;
  preview: React.ReactNode;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        'flex flex-col overflow-hidden rounded-lg border-2 text-left transition',
        active
          ? 'border-brand-from ring-2 ring-brand-soft'
          : 'border-border hover:border-foreground/20',
      )}
    >
      <div className="h-24 bg-gradient-to-br from-muted to-muted/60">{preview}</div>
      <div className="flex items-center gap-2 p-3 text-sm font-medium">
        <span className={active ? 'text-brand-from' : 'text-muted-foreground'}>
          {icon}
        </span>
        <span>{title}</span>
        {active && (
          <span className="ml-auto rounded-full bg-brand-tint px-2 py-0.5 text-[10px] font-semibold text-brand-from">
            Activo
          </span>
        )}
      </div>
    </button>
  );
}
