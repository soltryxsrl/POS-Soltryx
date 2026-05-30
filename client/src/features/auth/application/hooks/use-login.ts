'use client';

import { useMutation } from '@tanstack/react-query';
import { authApiHttp } from '../../infrastructure/api/auth.api.http';
import type { LoginInput } from '../../domain/types';
import { useAuthStore } from '../stores/auth.store';

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: (input: LoginInput) => authApiHttp.login(input),
    onSuccess: (session) => setSession(session),
  });
}
