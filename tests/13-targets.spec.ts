import { test, expect, open, LANGS } from './fixtures';

const CONTROLS = {
  lang: '.hdr-lang a',
  palette: '.hdr-k',
  menu: '.hdr-menu',
  shell: '[data-out] .a-ls',
  input: '#a-cmd',
  link: 'main .a-links a',
};
const R = 22;

// At 390px these neighbors sit closer than 22px to the control's center. Their visible boxes cannot change,
// so the probe lands inside the neighbor. The test requires the neighbor to keep that point.
const GEOMETRY_CONFLICTS = [
  'lang:en right -> lang:es',
  'lang:es left -> lang:en',
  'shell:cd experience down -> shell:cd hackathons',
  'shell:cd oss down -> shell:cd talks',
  'shell:cd hackathons up -> shell:cd experience',
  'shell:cd hackathons down -> shell:cd writing',
  'shell:cd talks up -> shell:cd oss',
  'shell:cd writing up -> shell:cd hackathons',
  'link:https://parquiz.vercel.app down -> link:https://github.com/dojoengine/game-jams/pull/311',
  'link:https://github.com/dojoengine/game-jams/pull/311 up -> link:https://parquiz.vercel.app',
];

for (const { lang, path } of LANGS) {
  test(`44px hit areas at 390px (${lang})`, async ({ page, width, errors }) => {
    void errors;
    test.skip(width !== 390, 'touch targets are checked at 390px');
    await open(page, path);
    await page.evaluate(() => document.querySelectorAll('details').forEach(d => (d.open = true)));

    const fails: string[] = [];
    const conflicts: string[] = [];
    for (const [name, sel] of Object.entries(CONTROLS)) {
      const count = await page.locator(sel).count();
      expect(count, name).toBeGreaterThan(0);
      for (let index = 0; index < count; index++) {
        await page.locator(sel).nth(index).evaluate(el => el.scrollIntoView({ block: 'center' }));
        const r = await page.evaluate(({ sel, index, name, R, controls }) => {
          const key = (n: string, el: Element) => `${n}:${el.getAttribute('data-lang') ?? el.getAttribute('data-run') ?? el.getAttribute('href') ?? el.id ?? ''}`;
          const all = Object.entries(controls).flatMap(([n, s]) => [...document.querySelectorAll(s)].map(el => ({ n, el })));
          const el = document.querySelectorAll<HTMLElement>(sel)[index]!;
          const me = key(name, el);
          const owns = (o: Element, x: number, y: number) => { const h = document.elementFromPoint(x, y); return !!h && (h === o || o.contains(h)); };
          const neighbor = (x: number, y: number) => all.find(o => o.el !== el && [...o.el.getClientRects()].some(b => x >= b.left && x < b.right && y >= b.top && y < b.bottom));
          const b = el.getBoundingClientRect();
          const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
          const fails: string[] = [], conflicts: string[] = [];
          for (const [dir, x, y] of [['up', cx, cy - R], ['down', cx, cy + R], ['left', cx - R, cy], ['right', cx + R, cy]] as const) {
            const nb = neighbor(x, y);
            if (nb) {
              const label = `${me} ${dir} -> ${key(nb.n, nb.el)}`;
              if (owns(nb.el, x, y)) conflicts.push(label);
              else fails.push(`${label}: the neighbor lost its own visible box`);
            } else if (!owns(el, x, y)) {
              fails.push(`${me} ${dir} (${x.toFixed(1)}, ${y.toFixed(1)}) hits ${document.elementFromPoint(x, y)?.outerHTML.slice(0, 60)}`);
            }
          }
          for (const fx of [0.05, 0.5, 0.95]) for (const fy of [0.05, 0.5, 0.95]) {
            if (!owns(el, b.left + b.width * fx, b.top + b.height * fy)) fails.push(`${me} lost its own visible box at ${fx},${fy}`);
          }
          return { fails, conflicts };
        }, { sel, index, name, R, controls: CONTROLS });
        fails.push(...r.fails);
        conflicts.push(...r.conflicts);
      }
    }
    expect(fails).toEqual([]);
    expect(conflicts.sort()).toEqual([...GEOMETRY_CONFLICTS].sort());
  });
}
