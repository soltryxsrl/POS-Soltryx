import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DEFAULT_THEME_ID, type ThemeId } from './themes';

export type MaintenanceMode = 'modal' | 'drawer';

interface PreferencesState {
  maintenanceMode: MaintenanceMode;
  themeId: ThemeId;
  darkMode: boolean;
  setMaintenanceMode: (mode: MaintenanceMode) => void;
  setThemeId: (id: ThemeId) => void;
  setDarkMode: (on: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      maintenanceMode: 'modal',
      themeId: DEFAULT_THEME_ID,
      darkMode: false,
      setMaintenanceMode: (mode) => set({ maintenanceMode: mode }),
      setThemeId: (id) => set({ themeId: id }),
      setDarkMode: (on) => set({ darkMode: on }),
    }),
    {
      name: 'pos:visual-preferences',
      storage: createJSONStorage(() => localStorage),
      version: 2,
    },
  ),
);
