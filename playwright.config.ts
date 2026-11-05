import { defineConfig } from '@playwright/test';

const PORT = 4322;

export default defineConfig({
  testDir: 'tests',
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    launchOptions: process.env['CHROMIUM'] ? { executablePath: process.env['CHROMIUM'] } : {},
    headless: true,
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  webServer: {
    command: `node node_modules/astro/bin/astro.mjs preview --ignore-lock --host 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
    timeout: 30_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  ],
});
