import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures';

const DECKS = [['stellar-sessions-1', 61], ['stellar-sessions-2', 39], ['stellar-sessions-3', 22]] as const;

for (const [slug, slides] of DECKS) {
  test(`/talks/${slug}: ${slides} slides, no notes, byte-identical`, async ({ page, request, errors }) => {
    void errors;
    test.skip(page.viewportSize()!.width < 721, 'desktop only');
    const res = await page.goto(`/talks/${slug}`, { waitUntil: 'domcontentloaded' });
    expect(res!.status()).toBe(200);
    expect(await page.locator('.deck .slide').count()).toBe(slides);
    expect(await page.locator('aside.notes, #notes-panel, #index-panel, #btn-notes, #btn-index').count()).toBe(0);
    const body = await (await request.get(`/talks/${slug}`)).body();
    expect(body.equals(readFileSync(`public/talks/${slug}/index.html`))).toBe(true);
  });
}

const ROUTES: [string, number, RegExp?][] = [
  ['/', 200], ['/es/', 200], ['/writing/', 200], ['/es/writing/', 200],
  ['/rss.xml', 200, /<rss/], ['/es/rss.xml', 200, /<language>es<\/language>/],
  ['/sitemap-index.xml', 200, /sitemap-0\.xml/], ['/sitemap-0.xml', 200, /talks\/stellar-sessions-2/],
  ['/robots.txt', 200, /Sitemap: https:\/\/bitfalt\.dev\/sitemap-index\.xml/],
  ['/og.png', 200], ['/favicon.svg', 200], ['/favicon-32.png', 200], ['/favicon.ico', 200],
  ['/does-not-exist', 404, /no such file or directory/],
];

for (const [path, status, body] of ROUTES) {
  test(`route ${path} -> ${status}`, async ({ request }) => {
    const r = await request.get(path);
    expect(r.status()).toBe(status);
    if (body) expect(await r.text()).toMatch(body);
  });
}

for (const path of ['/writing/', '/es/writing/', '/does-not-exist']) {
  test(`page ${path}: no console errors, no missing assets`, async ({ page, errors, notFound }) => {
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
