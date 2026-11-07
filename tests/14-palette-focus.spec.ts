import { e2e, expect, open, mod, LANGS } from './harness';

for (const { lang, path } of LANGS) {
  e2e(`palette action without a destination returns focus (${lang})`, async ({ page, errors }) => {
    void errors;
    await open(page, path);
    await page.focus('#a-cmd');
    await page.keyboard.press(`${mod}+k`);
    await page.waitForSelector('.pal [role=option]');
    await page.keyboard.type('email');
    expect(await page.textContent('.pal [aria-selected=true] .pal-s')).toBe('dagarbanz@proton.me');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.toast[data-show]');
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('a-cmd');
  });
}

e2e('palette action with a destination keeps focus on that destination', async ({ page, errors }) => {
  void errors;
  await open(page, '/');
  await page.focus('#a-cmd');
  await page.keyboard.press(`${mod}+k`);
  await page.keyboard.type('parquiz');
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => document.activeElement?.closest('[id]')?.id)).toBe('p-parquiz');
});
