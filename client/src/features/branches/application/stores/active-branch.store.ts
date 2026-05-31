'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Sucursal ACTIVA seleccionada por el usuario (solo aplica a quien puede
 * cambiar: ADMIN/gerentes con `branches.switch`). Persistida en localStorage.
 *
 * `null` = sin selección explícita → el servidor usa la sucursal HOME del JWT.
 * Se limpia en login/logout para no filtrar la selección entre usuarios.
 */
interface ActiveBranchState {
  activeBranchId: string | null;
  setActiveBranch: (id: string | null) => void;
  clearActiveBranch: () => void;
}

export const useActiveBranchStore = create<ActiveBranchState>()(
  persist(
    (set) => ({
      activeBranchId: null,
      setActiveBranch: (id) => set({ activeBranchId: id }),
      clearActiveBranch: () => set({ activeBranchId: null }),
    }),
    {
      name: 'pos:active-branch',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);

/** Getter para uso fuera de React (http-client bridge). */
export function getActiveBranchIdFromStore(): string | null {
  return useActiveBranchStore.getState().activeBranchId;
}
