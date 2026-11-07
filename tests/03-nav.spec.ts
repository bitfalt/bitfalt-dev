import { e2e, expect, open, scrollSettled, SHOTS, HIDE, LANGS } from './harness';

const SECS = ['experience', 'oss', 'hackathons', 'talks', 'writing'];

for (const { lang, path } of LANGS) {
  e2e(`nav ${lang}: header links land each section and set the indicator`, async ({ page, width, errors }) => {
    void errors;
    await open(page, path);
    await page.addStyleTag({ content: HIDE });
    const mobile = width < 721;
    for (const id of SECS) {
      if (mobile) {
        await page.click('[data-menu]'); await page.waitForTimeout(250);
        if (id === 'hackathons') await page.screenshot({ path: `${SHOTS}${width}-${lang}-menu-open.png` });
      }
      const labelVisible = await page.evaluate(id => {
        const a = document.querySelector(`.hdr-nav a[data-sec="${id}"]`)!; const r = a.getBoundingClientRect(); const l = a.querySelector('.l')!;
        return r.width > 0 && l.scrollWidth <= l.clientWidth + 1 && r.right <= innerWidth && r.left >= 0;
      }, id);
      expect(labelVisible, `${id} label visible`).toBe(true);
      await page.click(`.hdr-nav a[data-sec="${id}"]`); await scrollSettled(page);
      const r = await page.evaluate(id => {
        const top = document.getElementById(id)!.getBoundingClientRect().top;
        const hh = (document.querySelector('[data-hdr]') as HTMLElement).offsetHeight;
        return { cur: (document.querySelector('.hdr-nav a[aria-current]') as HTMLElement | null)?.dataset['sec'], top, hh, ind: getComputedStyle(document.querySelector('.hdr-ind')!).opacity, label: document.querySelector('[data-menu-label]')!.textContent };
      }, id);
      expect(r.top, `${id} under header`).toBeGreaterThanOrEqual(r.hh - 1);
      expect(r.top, `${id} under header`).toBeLessThanOrEqual(r.hh + 24);
      expect(r.cur).toBe(id);
      if (!mobile) expect(r.ind).toBe('1');
      else expect(r.label).toContain(await page.evaluate(id => document.querySelector(`.hdr-nav a[data-sec="${id}"] .l`)!.textContent, id));
    }
    await page.screenshot({ path: `${SHOTS}${width}-${lang}-writing-landed.png` });
  });
}

e2e('EN/ES toggle goes to the other route and keeps the hash', async ({ page, errors }) => {
  void errors;
  await open(page, '/#talks');
  await page.click('[data-lang="es"]');
  await page.waitForURL('**/es/#talks');
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('es');
  await page.click('[data-lang="en"]');
  await page.waitForURL(/\/#talks$/);
  expect(new URL(page.url()).pathname).toBe('/');
  const en = await page.getAttribute('[data-lang="en"]', 'aria-current');
  expect(en).toBe('true');
});
