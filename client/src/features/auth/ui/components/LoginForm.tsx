'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { HttpClientError } from '@/shared/lib/http-client';
import { Button } from '@/shared/ui/controls/Button';
import { FormField } from '@/shared/ui/controls/FormField';
import { Input } from '@/shared/ui/controls/Input';
import { useLogin } from '../../application/hooks/use-login';

export function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') ?? '/';
  const login = useLogin();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login.mutateAsync({ emailOrUsername, password });
      router.replace(next);
    } catch (err) {
      if (err instanceof HttpClientError) {
        setError(err.apiError?.message ?? `Error ${err.status}`);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error de red');
      }
    }
  };

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-6 shadow-xl shadow-brand-from/10">
      <h1 className="text-center text-2xl font-semibold tracking-tight">Soltryx</h1>

      <FormField label="Usuario o email" required htmlFor="emailOrUsername">
        <Input
          id="emailOrUsername"
          name="emailOrUsername"
          type="text"
          autoComplete="username"
          autoFocus
          required
          value={emailOrUsername}
          onChange={(e) => setEmailOrUsername(e.target.value)}
        />
      </FormField>

      <FormField label="Contraseña" required htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </FormField>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}

      <Button type="submit" disabled={login.isPending} className="w-full">
        {login.isPending ? 'Entrando...' : 'Entrar'}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        admin@t1et.local / Admin123!
      </p>
    </form>
  );
}
