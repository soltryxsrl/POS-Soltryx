import { defineConfig, devices } from '@playwright/test';

/**
 * Tests E2E del POS T1ET.
 *
 * Asume:
 *   - Backend corriendo en http://localhost:3001
 *   - Frontend corriendo en http://localhost:3000
 *   - Postgres con seed aplicado (admin@t1et.local / Admin123!)
 *
 * Cada test usa el fixture custom en e2e/fixtures.ts, que loguea via API
 * antes de cada test e inyecta la cookie fresca (porque el backend rota
 * el refresh token y una cookie reusada falla).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false, // serializamos: crean/borran productos compartidos en la misma DB
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
