import { e2e, expect, open, run, LANGS } from './harness';

for (const { lang, path } of LANGS) {
  e2e(`shell writing counts match the server-rendered count (${lang})`, async ({ page, errors }) => {
    void errors;
    await open(page, path);
    const ssr = await page.$eval('#writing .a-cmdl-o', el => el.textContent!.trim());
    expect(ssr).toMatch(/^total \d+$/);
    expect(await page.$eval('#writing', el => `total ${(el as HTMLElement).dataset['posts']}`)).toBe(ssr);

    await page.evaluate(() => {
      const ul = document.querySelector('#writing .a-list')!;
      for (let i = 0; i < 6; i++) ul.insertAdjacentHTML('beforeend', '<li class="a-it"><a class="a-name" href="#">probe</a></li>');
    });

    for (const cmd of ['ls ~/writing', 'ls writing']) {
      await page.evaluate(() => document.querySelector('[data-out]')!.replaceChildren());
      await run(page, cmd);
      const out = await page.$$eval('[data-out] .a-l:not(.a-echo)', els => els.map(e => e.textContent!.trim()));
      expect(out, cmd).toEqual([ssr]);
    }
  });
}
