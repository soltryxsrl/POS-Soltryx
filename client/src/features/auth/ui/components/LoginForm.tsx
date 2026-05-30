'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { HttpClientError } from '@/shared/lib/http-client';
import { useLogin } from '../../application/hooks/use-login';

export function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') ?? '/dashboard';
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
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6 shadow-sm">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">T1ET POS</h1>
        <p className="text-sm text-muted-foreground">Iniciar sesión</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="emailOrUsername" className="text-sm font-medium">
          Usuario o email
        </label>
        <input
          id="emailOrUsername"
          name="emailOrUsername"
          type="text"
          autoComplete="username"
          autoFocus
          required
          value={emailOrUsername}
          onChange={(e) => setEmailOrUsername(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <button
        type="submit"
        disabled={login.isPending}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
      >
        {login.isPending ? 'Entrando...' : 'Entrar'}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        admin@t1et.local / Admin123!
      </p>
    </form>
  );
}
