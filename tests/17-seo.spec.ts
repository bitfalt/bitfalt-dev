import { e2e, expect } from './harness';

const SITE = 'https://bitfalt.dev';

interface Case { path: string; ld: string; alt?: { en: string; es: string }; noindex?: true; url?: string }

const CASES: Case[] = [
  { path: '/', ld: 'ProfilePage', alt: { en: '/', es: '/es/' } },
  { path: '/es/', ld: 'ProfilePage', alt: { en: '/', es: '/es/' } },
  { path: '/writing/', ld: 'Blog', alt: { en: '/writing/', es: '/es/writing/' } },
  { path: '/es/writing/', ld: 'Blog', alt: { en: '/writing/', es: '/es/writing/' } },
  { path: '/talks/stellar-sessions-1', ld: 'PresentationDigitalDocument' },
  { path: '/talks/stellar-sessions-2', ld: 'PresentationDigitalDocument' },
  { path: '/talks/stellar-sessions-3', ld: 'PresentationDigitalDocument' },
  { path: '/does-not-exist', ld: 'WebSite', noindex: true, url: '/404/' },
];

const pngSize = (b: Buffer) => ({ w: b.readUInt32BE(16), h: b.readUInt32BE(20) });

for (const c of CASES) {
  e2e(`seo ${c.path}`, { only: 'desktop' }, async ({ page, request }) => {
    await page.goto(c.path, { waitUntil: 'domcontentloaded' });
    const head = await page.evaluate(() => {
      const meta = (k: string) => [...document.querySelectorAll(`meta[property="${k}"], meta[name="${k}"]`)].map(m => m.getAttribute('content') ?? '');
      return {
        title: document.title,
        description: meta('description'),
        canonical: [...document.querySelectorAll('link[rel=canonical]')].map(l => l.getAttribute('href')),
        hreflang: [...document.querySelectorAll('link[rel=alternate][hreflang]')].map(l => `${l.getAttribute('hreflang')}=${l.getAttribute('href')}`),
        og: Object.fromEntries(['og:title', 'og:description', 'og:url', 'og:image', 'og:image:secure_url', 'og:image:type', 'og:image:width', 'og:image:height', 'og:image:alt', 'og:locale', 'og:locale:alternate', 'twitter:card', 'twitter:creator', 'twitter:image'].map(k => [k, meta(k)])),
        ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => s.textContent ?? ''),
        robots: meta('robots'),
        posts: document.querySelectorAll('main a.a-name').length,
      };
    });

    expect(head.title.trim().length).toBeGreaterThan(0);
    expect(head.description).toHaveLength(1);
    if (!c.noindex) {
      expect([...head.description[0]!].length).toBeGreaterThanOrEqual(110);
      expect([...head.description[0]!].length).toBeLessThanOrEqual(160);
    } else {
      expect(head.robots).toEqual(['noindex']);
    }
    const url = `${SITE}${c.url ?? c.path}`;
    expect(head.canonical).toEqual([url]);

    const og = head.og as Record<string, string[]>;
    for (const k of ['og:title', 'og:description', 'og:url', 'og:image', 'og:image:alt', 'twitter:card', 'twitter:creator']) {
      expect(og[k], k).toHaveLength(1);
      expect(og[k]![0]!.trim().length, k).toBeGreaterThan(0);
    }
    expect(og['og:url']![0]).toBe(url);
    expect(og['og:description']![0]).toBe(head.description[0]);
    expect(og['twitter:card']![0]).toBe('summary_large_image');
    expect(og['twitter:creator']![0]).toBe('@bitfalt');
    expect(og['og:image:type']![0]).toBe('image/png');
    if (c.ld === 'Blog') {
      const emptyPhrase = c.path.startsWith('/es/') ? 'Todavía no hay nada publicado.' : 'Nothing published yet.';
      const latestPhrase = c.path.startsWith('/es/') ? 'las últimas entradas' : 'the latest posts';
      const alt = og['og:image:alt']![0]!;
      expect(alt.includes(emptyPhrase), alt).toBe(head.posts === 0);
      expect(alt.includes(latestPhrase), alt).toBe(head.posts > 0);
    }
    expect([og['og:image:width']![0], og['og:image:height']![0]]).toEqual(['1200', '630']);

    const image = og['og:image']![0]!;
    expect(image.startsWith(`${SITE}/og/`)).toBe(true);
    expect(og['og:image:secure_url']![0]).toBe(image);
    expect(og['twitter:image']![0]).toBe(image);
    const res = await request.get(new URL(image).pathname);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toBe('image/png');
    const body = await res.body();
    expect(pngSize(body)).toEqual({ w: 1200, h: 630 });
    expect(body.length).toBeLessThan(300 * 1024);

    if (c.alt) {
      expect(head.hreflang).toEqual([`en=${SITE}${c.alt.en}`, `es=${SITE}${c.alt.es}`, `x-default=${SITE}${c.alt.en}`]);
      expect(og['og:locale:alternate']).toHaveLength(1);
    } else {
      expect(head.hreflang).toEqual([]);
      expect(og['og:locale:alternate']).toEqual([]);
    }

    expect(head.ld).toHaveLength(1);
    const ld = JSON.parse(head.ld[0]!) as { '@type'?: string; '@graph'?: { '@type': string }[] };
    const types = ld['@graph'] ? ld['@graph'].map(n => n['@type']) : [ld['@type']];
    expect(types[0]).toBe(c.ld);
    if (c.ld === 'ProfilePage') {
      expect(types).toEqual(['ProfilePage', 'Person', 'WebSite']);
      const person = ld['@graph']![1] as unknown as Record<string, unknown>;
      expect(person).toMatchObject({
        name: 'Daniel Garbanzo', alternateName: 'bitfalt', jobTitle: 'Backend Engineer',
        worksFor: { name: 'Nexus' }, address: { addressCountry: 'Costa Rica' },
        alumniOf: { name: 'Instituto Tecnológico de Costa Rica' },
        sameAs: ['https://github.com/bitfalt', 'https://www.linkedin.com/in/daniel-garbanzo/', 'https://x.com/bitfalt'],
      });
      expect(person['knowsAbout']).toContain('Rust');
    }
  });
}

e2e('every OG image the build emits is a 1200x630 PNG under 300 KB', { only: 'desktop' }, async ({ request }) => {
  const keys = ['index', 'es/index', 'writing', 'es/writing', 'talks/stellar-sessions-1', 'talks/stellar-sessions-2', 'talks/stellar-sessions-3'];
  for (const k of keys) {
    const res = await request.get(`/og/${k}.png`);
    expect(res.status(), k).toBe(200);
    const body = await res.body();
    expect(pngSize(body), k).toEqual({ w: 1200, h: 630 });
    expect(body.length, k).toBeLessThan(300 * 1024);
  }
});

e2e('the sitemap lists every page without build-time lastmod and robots.txt points to it', async ({ request }) => {
  const sm = await (await request.get('/sitemap-0.xml')).text();
  const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  for (const p of ['/', '/es/', '/writing/', '/es/writing/', '/talks/stellar-sessions-1', '/talks/stellar-sessions-2', '/talks/stellar-sessions-3']) {
    expect(urls).toContain(`${SITE}${p}`);
  }
  expect(sm).not.toContain('<lastmod>');
  expect(urls.some(u => u!.includes('/og/') || u!.includes('404'))).toBe(false);
  expect(await (await request.get('/robots.txt')).text()).toContain(`Sitemap: ${SITE}/sitemap-index.xml`);
});
