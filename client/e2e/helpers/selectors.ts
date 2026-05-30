import type { Locator, Page } from '@playwright/test';

/**
 * Localiza el input/textarea/select dentro del FormField cuyo `label` coincide
 * con `labelText`. El FormField no asocia `<label htmlFor>` con el control, así
 * que tomamos el label, subimos al div wrapper, y bajamos al primer control.
 *
 * El asterisco de "required" es un span DENTRO del label, así que `hasText`
 * sigue matcheando el label aunque diga "Nombre*".
 */
export function field(
  scope: Page | Locator,
  labelText: string | RegExp,
): Locator {
  return scope
    .locator('label')
    .filter({ hasText: labelText })
    .locator('..')
    .locator('input, textarea, select')
    .first();
}
