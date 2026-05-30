/**
 * Acceso centralizado a env públicas del frontend.
 * Next.js solo expone variables prefijadas con `NEXT_PUBLIC_` al cliente.
 */
export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
} as const;
