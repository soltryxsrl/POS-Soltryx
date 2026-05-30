export interface Theme {
  id: ThemeId;
  name: string;
  primary: string;
  primaryForeground: string;
  ring: string;
  brandFrom: string;
  brandTo: string;
  brandTint: string;
  brandSoft: string;
}

export const THEME_IDS = ['indigo', 'emerald', 'rose', 'amber', 'sky', 'slate'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const THEMES: Record<ThemeId, Theme> = {
  indigo: {
    id: 'indigo',
    name: 'Indigo',
    primary: '239 84% 60%',
    primaryForeground: '210 40% 98%',
    ring: '239 84% 60%',
    brandFrom: '239 84% 60%',
    brandTo: '262 83% 58%',
    brandTint: '226 100% 97%',
    brandSoft: '226 92% 93%',
  },
  emerald: {
    id: 'emerald',
    name: 'Esmeralda',
    primary: '160 84% 35%',
    primaryForeground: '210 40% 98%',
    ring: '160 84% 35%',
    brandFrom: '152 76% 40%',
    brandTo: '173 80% 36%',
    brandTint: '152 81% 96%',
    brandSoft: '149 80% 90%',
  },
  rose: {
    id: 'rose',
    name: 'Rosa',
    primary: '346 77% 50%',
    primaryForeground: '210 40% 98%',
    ring: '346 77% 50%',
    brandFrom: '346 77% 50%',
    brandTo: '330 81% 60%',
    brandTint: '356 100% 97%',
    brandSoft: '354 100% 90%',
  },
  amber: {
    id: 'amber',
    name: 'Ámbar',
    primary: '25 95% 45%',
    primaryForeground: '210 40% 98%',
    ring: '25 95% 45%',
    brandFrom: '38 92% 50%',
    brandTo: '25 95% 53%',
    brandTint: '48 100% 96%',
    brandSoft: '48 96% 89%',
  },
  sky: {
    id: 'sky',
    name: 'Sky',
    primary: '199 89% 42%',
    primaryForeground: '210 40% 98%',
    ring: '199 89% 42%',
    brandFrom: '199 89% 48%',
    brandTo: '187 92% 41%',
    brandTint: '204 100% 97%',
    brandSoft: '204 94% 86%',
  },
  slate: {
    id: 'slate',
    name: 'Slate',
    primary: '215 28% 17%',
    primaryForeground: '210 40% 98%',
    ring: '215 28% 17%',
    brandFrom: '215 25% 27%',
    brandTo: '215 16% 47%',
    brandTint: '210 40% 96%',
    brandSoft: '214 32% 91%',
  },
};

export const DEFAULT_THEME_ID: ThemeId = 'indigo';

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value);
}
