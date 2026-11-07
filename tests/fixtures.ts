import { test as base, expect, type Page } from '@playwright/test';

export const SHOTS = 'tests/shots/';
export const HIDE = '.toast{display:none!important}';
export const LANGS = [{ lang: 'en', path: '/' }, { lang: 'es', path: '/es/' }] as const;

interface Fixtures { errors: string[]; notFound: string[]; width: number; booted: boolean }

export const test = base.extend<Fixtures>({
  booted: [true, { option: true }],
  width: async ({ viewport }, use) => use(viewport!.width),
  errors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', m => {
      if (m.type() !== 'error') return;
      if (m.location().url.includes('/does-not-exist') && m.text().includes('status of 404')) return;
      errors.push(`${m.text()} @ ${m.location().url}`);
    });
    page.on('pageerror', e => errors.push('PAGE ' + e.message));
    await use(errors);
    expect(errors, 'console errors').toEqual([]);
  },
  notFound: async ({ page }, use) => {
    const missing: string[] = [];
    page.on('response', r => { if (r.status() === 404 && !r.url().includes('/does-not-exist')) missing.push(r.url()); });
    await use(missing);
    expect(missing, '404 responses').toEqual([]);
  },
  page: async ({ page, booted }, use) => {
    if (booted) await page.addInitScript(() => { sessionStorage.setItem('bf-booted', '1'); });
    await page.route('**/_vercel/insights/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
    await use(page);
  },
});

export async function open(page: Page, path = '/') {
  await page.goto(path, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-ready'));
}

export async function run(page: Page, cmd: string) {
  await page.fill('#a-cmd', cmd);
  await page.press('#a-cmd', 'Enter');
}

export const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
export { expect };
