import type { Metadata, Viewport } from 'next';
import { ReactNode } from 'react';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'POS - Soltryx',
  description: 'Soltryx — Punto de venta',
  manifest: '/manifest.webmanifest',
  // El favicon sale de src/app/icon.svg (la "S" de la marca Soltryx).
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
