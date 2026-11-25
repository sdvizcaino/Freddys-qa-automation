import { test as base, expect } from '@playwright/test';
import { getScenarioId, resetEvidenceCounter } from '../utils/evidence';

/**
 * Extiende el `test` de Playwright para que, al terminar cada test,
 * el video se guarde con un nombre claro en evidencias/<escenario>/video_OK|FAIL.webm.
 * Los specs importan `test` y `expect` desde aquí en vez de '@playwright/test'.
 */
export const test = base.extend<{ saveVideo: void }>({
  saveVideo: [
    async ({ page }, use, testInfo) => {
      resetEvidenceCounter();
      await use();

      const video = page.video();
      if (video) {
        await page.close(); // el video solo se puede guardar con la página cerrada
        const result = testInfo.status === 'passed' ? 'OK' : 'FAIL';
        await video.saveAs(`evidencias/${getScenarioId(testInfo)}/video_${result}.webm`);
      }
    },
    { auto: true },
  ],
});

export { expect };
