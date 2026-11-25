import { Locator, Page, TestInfo } from '@playwright/test';

/**
 * Dibuja un recuadro rojo alrededor del elemento que el test usa o valida.
 * El recuadro queda visible en el video y en las capturas de evidencia.
 */
export async function highlight(locator: Locator): Promise<void> {
  await locator.evaluate((element: HTMLElement) => {
    element.style.outline = '3px solid red';
    element.style.outlineOffset = '2px';
  });
}

/** Número de captura por test, para que las imágenes queden en orden. */
let screenshotCounter = 0;

export function resetEvidenceCounter(): void {
  screenshotCounter = 0;
}

/**
 * Toma una captura de la pantalla actual, la guarda en
 * evidencias/<escenario>/NN_<nombre>.png y la adjunta al reporte HTML.
 * Con fullPage = true captura la página completa.
 */
export async function takeEvidence(page: Page, testInfo: TestInfo, name: string, fullPage = false): Promise<void> {
  screenshotCounter += 1;
  const scenario = getScenarioId(testInfo);
  const fileName = `${String(screenshotCounter).padStart(2, '0')}_${name}.png`;
  const path = `evidencias/${scenario}/${fileName}`;

  await page.screenshot({ path, fullPage });
  await testInfo.attach(fileName, { path, contentType: 'image/png' });
}

/** Toma el ID del escenario desde el título del describe, por ejemplo "ESC-01". */
export function getScenarioId(testInfo: TestInfo): string {
  const match = testInfo.titlePath.join(' ').match(/ESC-\d+/);
  return match ? match[0] : 'sin-escenario';
}
