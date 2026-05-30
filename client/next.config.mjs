/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // outputFileTracingExcludes evita el bug de Vercel con route groups (app)
  // en Next 14 donde page_client-reference-manifest.js no se encuentra.
  outputFileTracingExcludes: {
    '*': ['**/@swc/core*', '**/@esbuild*'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
