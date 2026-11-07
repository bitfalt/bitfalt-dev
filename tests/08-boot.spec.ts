import { e2e, expect, SHOTS } from './harness';

e2e('boot runs once per session and Escape skips it', { only: 'desktop', booted: false }, async ({ page, width, errors }) => {
  void errors;
  await page.goto('/', { waitUntil: 'commit' });
  await page.waitForSelector('[data-skip]:not([hidden])', { timeout: 5000 });
  await page.waitForFunction(() => document.querySelectorAll('[data-out] .a-l').length >= 4);
  await page.locator('[data-term]').screenshot({ path: `${SHOTS}${width}-boot.png` });
  expect(await page.innerText('[data-out]')).toContain('bitfalt-os 3.0');
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  expect(await page.evaluate(() => (document.querySelector('[data-skip]') as HTMLElement).hidden)).toBe(true);
  expect(await page.innerText('[data-out]')).toContain('Hi, I’m Daniel.');
  await page.reload({ waitUntil: 'networkidle' });
  expect(await page.evaluate(() => (document.querySelector('[data-skip]') as HTMLElement).hidden)).toBe(true);
});
