import { test as base } from '@playwright/test';

/**
 * Fixture custom que:
 *   1. Loguea via API antes de cada test e inyecta la cookie de refresh
 *      fresca (el backend rota el refresh-token).
 *   2. Inyecta CSS que oculta el botón de Tanstack Query devtools — está
 *      fixed bottom-right e intercepta clicks sobre el FAB y otros botones.
 */
export const test = base.extend<{}>({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      const style = document.createElement('style');
      style.textContent = `.tsqd-parent-container { display: none !important; }`;
      if (document.head) document.head.appendChild(style);
      else document.addEventListener('DOMContentLoaded', () =>
        document.head.appendChild(style),
      );
    });
    await use(page);
  },
  storageState: async ({}, use) => {
    // Login via API
    const res = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrUsername: 'admin@t1et.local',
        password: 'Admin123!',
      }),
    });
    if (!res.ok) {
      throw new Error(`login failed: ${res.status} ${await res.text()}`);
    }
    // Buscamos la cookie t1et_rt en el Set-Cookie header. Node fetch no expone
    // los cookies individualmente; parseamos del header crudo.
    const setCookies = (res.headers as unknown as { getSetCookie?: () => string[] })
      .getSetCookie?.() ?? [];
    const refreshCookie = setCookies.find((c) => c.startsWith('t1et_rt='));
    if (!refreshCookie) {
      throw new Error('no t1et_rt cookie in login response');
    }
    const rtValue = refreshCookie.split(';')[0].split('=')[1];

    await use({
      cookies: [
        {
          name: 't1et_rt',
          value: rtValue,
          domain: 'localhost',
          path: '/api/auth',
          httpOnly: true,
          secure: false,
          sameSite: 'Lax',
          expires: Math.floor(Date.now() / 1000) + 60 * 60, // 1h, suficiente para el test
        },
      ],
      origins: [],
    });
  },
});

export { expect } from '@playwright/test';
