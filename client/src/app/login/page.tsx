'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginForm } from '@/features/auth/ui/components/LoginForm';
import { useAuth } from '@/features/auth/application/hooks/use-auth';

function Spinner() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
    </main>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      const next = sp.get('next') ?? '/dashboard';
      router.replace(next);
    }
  }, [isAuthenticated, sp, router]);

  if (isLoading) return <Spinner />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <LoginForm />
    </main>
  );
}

// `useSearchParams()` exige un límite de Suspense para el build estático (Next 14).
export default function LoginPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <LoginPageInner />
    </Suspense>
  );
}
