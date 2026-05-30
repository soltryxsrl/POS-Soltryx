'use client';

import { useMutation } from '@tanstack/react-query';
import { authApiHttp } from '../../infrastructure/api/auth.api.http';

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      authApiHttp.changePassword(input.currentPassword, input.newPassword),
  });
}
