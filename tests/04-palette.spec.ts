import { test, expect, open, mod, SHOTS } from './fixtures';

test('Cmd+K: project, email, talk, social, language', async ({ page, context, width, errors, notFound }) => {
  void errors; void notFound;
  await context.route(/^https:\/\/x\.com\//, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>x stub</title>' }));
  await open(page, '/');
  await page.keyboard.press(`${mod}+k`); await page.waitForTimeout(100);
  expect(await page.evaluate(() => !(document.querySelector('.pal') as HTMLElement).hidden && !!document.activeElement?.closest('.pal'))).toBe(true);
  await page.keyboard.type('parquiz'); await page.waitForTimeout(80);
  await page.screenshot({ path: `${SHOTS}${width}-palette.png` });
  await page.keyboard.press('Enter'); await page.waitForTimeout(1100);
  const top = await page.evaluate(() => document.getElementById('p-parquiz')!.getBoundingClientRect().top);
  expect(top).toBeGreaterThan(0);
  expect(top).toBeLessThan(page.viewportSize()!.height);

  await page.keyboard.press(`${mod}+k`); await page.keyboard.type('email'); await page.keyboard.press('Enter'); await page.waitForTimeout(250);
  expect(await page.textContent('.toast')).toBe('Copied dagarbanz@proton.me');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('dagarbanz@proton.me');

  await page.keyboard.press(`${mod}+k`); await page.keyboard.type('x402');
  expect(await page.evaluate(() => (document.querySelector('.pal [aria-selected=true]') as HTMLElement).dataset['g'])).toBe('talk');
  const [deck] = await Promise.all([context.waitForEvent('page'), page.keyboard.press('Enter')]);
  await deck.waitForLoadState('domcontentloaded');
  expect(new URL(deck.url()).pathname).toBe('/talks/stellar-sessions-2');
  expect(await deck.locator('.deck .slide').count()).toBe(39);
  await deck.close();

  await page.keyboard.press(`${mod}+k`); await page.keyboard.type('twitter');
  expect(await page.textContent('.pal [aria-selected=true] .pal-s')).toBe('x.com/bitfalt');
  const [xp] = await Promise.all([context.waitForEvent('page'), page.keyboard.press('Enter')]);
  expect(xp.url()).toBe('https://x.com/bitfalt');
  await xp.close();

  await page.keyboard.press(`${mod}+k`); await page.keyboard.type('espa');
  await Promise.all([page.waitForURL(/\/es\//), page.keyboard.press('Enter')]);
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-ready'));
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('es');
  expect(await page.textContent('.hdr-nav .l')).toBe('Experiencia');
  await page.keyboard.press(`${mod}+k`); await page.waitForTimeout(80); await page.keyboard.press('Escape');
  expect(await page.evaluate(() => (document.querySelector('.pal') as HTMLElement).hidden)).toBe(true);
});

test('palette works on the writing page and jumps back home', async ({ page, errors }) => {
  void errors;
  await open(page, '/writing/');
  await page.keyboard.press(`${mod}+k`); await page.keyboard.type('sigilo');
  await Promise.all([page.waitForURL(/\/#p-sigilo$/), page.keyboard.press('Enter')]);
});
