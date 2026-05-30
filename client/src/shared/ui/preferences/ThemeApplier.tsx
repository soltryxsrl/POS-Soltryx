'use client';

import { useEffect } from 'react';
import { usePreferencesStore } from './preferences.store';
import { THEMES } from './themes';

/**
 * Aplica el tema (CSS vars + clase `dark`) al <html> en respuesta a la preferencia del usuario.
 * Debe montarse una sola vez cerca de la raíz (providers.tsx).
 */
export function ThemeApplier() {
  const themeId = usePreferencesStore((s) => s.themeId);
  const darkMode = usePreferencesStore((s) => s.darkMode);

  useEffect(() => {
    const theme = THEMES[themeId] ?? THEMES.indigo;
    const root = document.documentElement;

    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--primary-foreground', theme.primaryForeground);
    root.style.setProperty('--ring', theme.ring);
    root.style.setProperty('--brand-from', theme.brandFrom);
    root.style.setProperty('--brand-to', theme.brandTo);

    if (darkMode) {
      const [h, s] = theme.brandFrom.split(' ');
      root.style.setProperty('--brand-tint', `${h} ${s} 18%`);
      root.style.setProperty('--brand-soft', `${h} ${s} 26%`);
    } else {
      root.style.setProperty('--brand-tint', theme.brandTint);
      root.style.setProperty('--brand-soft', theme.brandSoft);
    }
  }, [themeId, darkMode]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [darkMode]);

  return null;
}
