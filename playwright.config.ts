import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright para el demo de Freddy's.
 * - 1 worker: el demo es un entorno compartido; los tests corren uno a la vez.
 * - Dos navegadores: Chromium y WebKit (motor de Safari).
 * - Video, screenshot y trace siempre activos: son la evidencia de la ejecución,
 *   también cuando el test pasa.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'https://demo.freddys.sundevs.cloud',
    locale: 'en-US',
    video: 'on',
    screenshot: 'on',
    trace: 'on',
    navigationTimeout: 60_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
