'use client';

import { cn } from '@/shared/lib/cn';

interface Props {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  id,
  className,
}: Props) {
  const toggle = () => {
    if (!disabled) onChange(!checked);
  };

  const control = (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      disabled={disabled}
      onClick={toggle}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-from focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        checked ? 'bg-brand-from' : 'bg-muted',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  );

  if (!label && !description) {
    return <span className={className}>{control}</span>;
  }

  return (
    <label
      htmlFor={id}
      className={cn(
        'flex items-center gap-3 select-none',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        className,
      )}
      onClick={(e) => {
        // El click del label dispara también el del button — evita doble toggle.
        if ((e.target as HTMLElement).tagName !== 'BUTTON') {
          e.preventDefault();
          toggle();
        }
      }}
    >
      {control}
      <span className="min-w-0 flex-1">
        {label && (
          <span className="block text-sm font-medium text-foreground">{label}</span>
        )}
        {description && (
          <span className="block text-xs text-muted-foreground">{description}</span>
        )}
      </span>
    </label>
  );
}
