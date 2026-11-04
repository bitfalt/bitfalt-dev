import { test, expect, open, SHOTS, HIDE } from './fixtures';

test('Spanish route renders Spanish labels and commands', async ({ page, width, errors }) => {
  void errors;
  await open(page, '/es/');
  await page.addStyleTag({ content: HIDE });
  await page.screenshot({ path: `${SHOTS}${width}-es-hero-top.png` });
  const labels = await page.evaluate(() => [...document.querySelectorAll('.a-win')].map(x => x.textContent));
  expect(labels).toContain('[premio en ambas categorías]');
  const cmds = await page.evaluate(() => [...document.querySelectorAll('.a-cmdl')].map(x => (x as HTMLElement).innerText));
  expect(cmds.join('\n')).toContain('# las tres en español');
  expect(await page.textContent('#writing .a-name')).toBe('Todavía no hay nada publicado.');
  await page.locator('#hackathons .a-cmdl').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}${width}-es-hackathons.png` });
});
