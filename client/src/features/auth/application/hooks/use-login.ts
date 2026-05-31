'use client';

import { useMutation } from '@tanstack/react-query';
import { useActiveBranchStore } from '@/features/branches/application/stores/active-branch.store';
import { authApiHttp } from '../../infrastructure/api/auth.api.http';
import type { LoginInput } from '../../domain/types';
import { useAuthStore } from '../stores/auth.store';

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: (input: LoginInput) => authApiHttp.login(input),
    onSuccess: (session) => {
      // Login fresco: descarta cualquier selección de sucursal previa (de otro
      // usuario en este navegador). El servidor usará la sucursal HOME.
      useActiveBranchStore.getState().clearActiveBranch();
      setSession(session);
    },
  });
}
