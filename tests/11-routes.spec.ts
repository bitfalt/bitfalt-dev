import { readFileSync } from 'node:fs';
import { e2e, expect } from './harness';

const DECKS = [['stellar-sessions-1', 61], ['stellar-sessions-2', 39], ['stellar-sessions-3', 22]] as const;

for (const [slug, slides] of DECKS) {
  e2e(`/talks/${slug}: ${slides} slides, no notes, byte-identical`, { only: 'desktop' }, async ({ page, request, errors }) => {
    void errors;
    const res = await page.goto(`/talks/${slug}`, { waitUntil: 'domcontentloaded' });
    expect(res!.status()).toBe(200);
    expect(await page.locator('.deck .slide').count()).toBe(slides);
    expect(await page.locator('aside.notes, #notes-panel, #index-panel, #btn-notes, #btn-index').count()).toBe(0);
    const body = await (await request.get(`/talks/${slug}`)).body();
    expect(body.equals(readFileSync(`public/talks/${slug}/index.html`))).toBe(true);
  });

  e2e(`/talks/${slug}: assets are files, all load, no errors`, async ({ page, request, errors, notFound }) => {
    void errors; void notFound;
    const html = readFileSync(`public/talks/${slug}/index.html`, 'utf8');
    expect(html.match(/data:(image|font)\/[\w.+-]+;base64,/g) ?? []).toEqual([]);
    const assets = [...new Set(html.match(/\/talks\/assets\/[\w.-]+/g) ?? [])];
    expect(assets.length).toBeGreaterThan(0);
    for (const a of assets) {
      const r = await request.get(a);
      expect(r.status(), a).toBe(200);
      expect((await r.body()).equals(readFileSync(`public${a}`)), a).toBe(true);
    }
    await page.goto(`/talks/${slug}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => [...document.fonts].some(f => f.status === 'loaded'))).toBe(true);
    const withImages = await page.evaluate(() => [...document.querySelectorAll('.deck .slide')].flatMap((s, i) => s.querySelector('img') ? [i + 1] : []));
    expect(withImages.length).toBeGreaterThan(0);
    for (const i of withImages) {
      await page.evaluate(i => { location.hash = `#/${i}`; }, i);
      await page.waitForFunction(i => {
        const s = document.querySelectorAll('.deck .slide')[i - 1]!;
        return s.classList.contains('is-current') && [...s.querySelectorAll('img')].every(im => im.complete);
      }, i, { timeout: 10_000 });
    }
    const broken = await page.evaluate(() => [...document.images].filter(im => im.naturalWidth === 0).map(im => im.src));
    expect(broken).toEqual([]);
  });
}

const ROUTES: [string, number, RegExp?][] = [
  ['/', 200], ['/es/', 200], ['/writing/', 200], ['/es/writing/', 200],
  ['/rss.xml', 200, /<rss/], ['/es/rss.xml', 200, /<language>es<\/language>/],
  ['/sitemap-index.xml', 200, /sitemap-0\.xml/], ['/sitemap-0.xml', 200, /talks\/stellar-sessions-2/],
  ['/robots.txt', 200, /Sitemap: https:\/\/bitfalt\.dev\/sitemap-index\.xml/],
  ['/og/index.png', 200], ['/og/es/index.png', 200], ['/favicon.svg', 200], ['/favicon-32.png', 200], ['/favicon.ico', 200],
  ['/does-not-exist', 404, /no such file or directory/],
];

for (const [path, status, body] of ROUTES) {
  e2e(`route ${path} -> ${status}`, async ({ request }) => {
    const r = await request.get(path);
    expect(r.status()).toBe(status);
    if (body) expect(await r.text()).toMatch(body);
  });
}

for (const path of ['/writing/', '/es/writing/', '/does-not-exist']) {
  e2e(`page ${path}: no console errors, no missing assets`, async ({ page, errors, notFound }) => {
    void errors; void notFound;
    await page.goto(path, { waitUntil: 'networkidle' });
    expect(await page.locator('.hdr').count()).toBe(1);
    if (path.includes('writing')) {
      expect(await page.innerText('#writing .a-cmdl')).toContain('total 0');
      const o = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
      expect(o).toBe(true);
    }
  });
}
