import { test, expect, LANGS } from './fixtures';
import { archive, experience, hackathons, oss, talks } from '../src/data/site';

test.use({ javaScriptEnabled: false });

for (const { lang, path } of LANGS) {
  test(`no JavaScript ${lang}: every section and fact is in the HTML`, async ({ page }) => {
    await page.goto(path);
    for (const id of ['experience', 'oss', 'hackathons', 'talks', 'writing']) await expect(page.locator(`#${id}`)).toBeVisible();
    const text = await page.evaluate(() => { document.querySelectorAll('details').forEach(d => { d.open = true; }); return document.body.innerText; });
    const facts = [
      ...experience.flatMap(e => [e.org, e.role, ...e.bullets.map(b => b[lang])]),
      ...oss.flatMap(o => [o.name, o.repo, o.what[lang]]),
      ...hackathons.flatMap(h => [h.name, h.event, ...h.bullets.map(b => b[lang])]),
      ...archive.flatMap(a => [a.name, ...(a.what ? [a.what[lang]] : [])]),
      ...talks.flatMap(k => [k.title, k.what[lang]]),
      'dagarbanz@proton.me',
    ];
    const missing = facts.filter(f => !text.includes(f));
    expect(missing).toEqual([]);
    expect(await page.locator('.hdr-nav a[data-sec]').count()).toBe(5);
    expect(await page.locator('.hc').count()).toBe(371);
  });
}
