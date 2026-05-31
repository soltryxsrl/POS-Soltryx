'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useActiveBranchStore } from '@/features/branches/application/stores/active-branch.store';
import { authApiHttp } from '../../infrastructure/api/auth.api.http';
import { useAuthStore } from '../stores/auth.store';

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => authApiHttp.logout(),
    onSettled: () => {
      useActiveBranchStore.getState().clearActiveBranch();
      clear();
      qc.clear();
    },
  });
}
