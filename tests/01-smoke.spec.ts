import { test, expect, open, SHOTS, HIDE, LANGS } from './fixtures';

for (const { lang, path } of LANGS) {
  test(`smoke ${lang}: screenshots, overflow, heatmap position, hreflang`, async ({ page, width, errors, notFound }) => {
    void errors; void notFound;
    await open(page, path);
    await page.addStyleTag({ content: HIDE });
    await page.screenshot({ path: `${SHOTS}${width}-${lang}-hero.png` });
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); }
      await new Promise(r => setTimeout(r, 1000)); scrollTo(0, 0); await new Promise(r => setTimeout(r, 200));
    });
    await page.screenshot({ path: `${SHOTS}${width}-${lang}-full.png`, fullPage: true });
    const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    expect(o.sw).toBeLessThanOrEqual(o.cw);
    const pos = await page.evaluate(() => {
      const h = document.querySelector('.a-heat')!, hero = document.querySelector('.a-hero')!, e = document.getElementById('experience')!;
      return { afterHero: !!(hero.compareDocumentPosition(h) & 4), beforeExp: !!(h.compareDocumentPosition(e) & 4) };
    });
    expect(pos).toEqual({ afterHero: true, beforeExp: true });
    await page.locator('.a-heat').screenshot({ path: `${SHOTS}${width}-${lang}-heatmap.png` });
    const head = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      alt: [...document.querySelectorAll('link[rel=alternate][hreflang]')].map(l => `${l.getAttribute('hreflang')}=${l.getAttribute('href')}`),
      canonical: document.querySelector('link[rel=canonical]')?.getAttribute('href'),
      og: document.querySelector('meta[property="og:image"]')?.getAttribute('content'),
      tagline: document.querySelector('.a-tag')!.textContent,
    }));
    expect(head.lang).toBe(lang);
    expect(head.alt).toEqual(['en=https://bitfalt.dev/', 'es=https://bitfalt.dev/es/', 'x-default=https://bitfalt.dev/']);
    expect(head.canonical).toBe(`https://bitfalt.dev${path}`);
    expect(head.og).toBe('https://bitfalt.dev/og.png');
    expect(head.tagline).toBe(lang === 'en'
      ? 'I build infrastructure in Rust: exchanges, AI platforms, blockchains. Hackathons on the side. Pura vida in between.'
      : 'Construyo infraestructura en Rust: exchanges, plataformas de IA, blockchains. Hackatones en paralelo. Pura vida en el medio.');
  });
}
