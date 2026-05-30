'use client';

import { ReactNode, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useBootstrapAuth } from '@/features/auth/application/hooks/use-bootstrap-auth';
import { makeQueryClient } from '@/shared/lib/query-client';

function AuthBootstrap({ children }: { children: ReactNode }) {
  useBootstrapAuth();
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => makeQueryClient());
  return (
    <QueryClientProvider client={client}>
      <AuthBootstrap>{children}</AuthBootstrap>
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
