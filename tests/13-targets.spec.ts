import { e2e, expect, open, LANGS } from './harness';
import type { Page } from 'playwright';

// `size` controls must reach 44px along the axial probes. Every control must own its whole visible box.
const CONTROLS: Record<string, { sel: string; size: boolean }> = {
  lang: { sel: '.hdr-lang a', size: true },
  palette: { sel: '.hdr-k', size: true },
  menu: { sel: '.hdr-menu', size: true },
  shell: { sel: '[data-out] .a-ls', size: true },
  input: { sel: '#a-cmd', size: true },
  link: { sel: 'main .a-links a', size: true },
  social: { sel: '.a-kv dd a:not(.a-mail)', size: false },
  mail: { sel: '.a-mail', size: false },
};
const R = 22;
const STEP = 2;

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

const PARQUIZ_OVERLAP = '#p-parquiz .a-links a:first-child::after{content:"";position:absolute;top:0;left:calc(100% + 17px);width:3px;height:100%;z-index:1}';

type Scan = { fails: string[]; conflicts: string[] };

async function scan(page: Page, names = Object.keys(CONTROLS), opts: { probes: boolean; scroll: boolean } = { probes: true, scroll: true }): Promise<Scan> {
  const out: Scan = { fails: [], conflicts: [] };
  for (const name of names) {
    const { sel, size } = CONTROLS[name]!;
    const count = await page.locator(sel).count();
    expect(count, name).toBeGreaterThan(0);
    for (let index = 0; index < count; index++) {
      if (opts.scroll) await page.locator(sel).nth(index).evaluate(el => el.scrollIntoView({ block: 'center' }));
      const r = await page.evaluate(({ sel, index, name, R, STEP, probes, controls }) => {
        const key = (n: string, el: Element) => `${n}:${el.getAttribute('data-lang') ?? el.getAttribute('data-run') ?? el.getAttribute('href') ?? el.id ?? ''}`;
        const all = Object.entries(controls).flatMap(([n, c]) => [...document.querySelectorAll(c.sel)].map(el => ({ n, el })));
        const el = document.querySelectorAll<HTMLElement>(sel)[index]!;
        const me = key(name, el);
        const hit = (x: number, y: number) => document.elementFromPoint(x, y);
        const owns = (o: Element, x: number, y: number) => { const h = hit(x, y); return !!h && (h === o || o.contains(h)); };
        const what = (x: number, y: number) => { const h = hit(x, y); const o = h && all.find(c => c.el === h || c.el.contains(h)); return o ? key(o.n, o.el) : h?.outerHTML.slice(0, 60); };
        const neighbor = (x: number, y: number) => all.find(o => o.el !== el && [...o.el.getClientRects()].some(b => x >= b.left && x < b.right && y >= b.top && y < b.bottom));
        const fails: string[] = [], conflicts: string[] = [];
        const b = el.getBoundingClientRect();
        if (probes) {
          const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
          for (const [dir, x, y] of [['up', cx, cy - R], ['down', cx, cy + R], ['left', cx - R, cy], ['right', cx + R, cy]] as const) {
            const nb = neighbor(x, y);
            if (nb) {
              const label = `${me} ${dir} -> ${key(nb.n, nb.el)}`;
              if (owns(nb.el, x, y)) conflicts.push(label);
              else fails.push(`${label}: the neighbor lost its own visible box`);
            } else if (!owns(el, x, y)) {
              fails.push(`${me} ${dir} (${x.toFixed(1)}, ${y.toFixed(1)}) hits ${what(x, y)}`);
            }
          }
        }
        const rad = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
        const rects = el.getClientRects().length > 1 ? [...el.getClientRects()] : [b];
        for (const box of rects) {
          const l = box.left + 1, t = box.top + 1, rr = box.right - 1, bb = box.bottom - 1;
          const xs: number[] = [], ys: number[] = [];
          for (let x = l; x < rr; x += STEP) xs.push(x);
          for (let y = t; y < bb; y += STEP) ys.push(y);
          xs.push(rr); ys.push(bb);
          const pts = [...xs.flatMap(x => [[x, t], [x, bb]]), ...ys.flatMap(y => [[l, y], [rr, y]])];
          const inShape = (x: number, y: number) => {
            const dx = Math.max(box.left + rad - x, x - (box.right - rad), 0), dy = Math.max(box.top + rad - y, y - (box.bottom - rad), 0);
            return dx === 0 || dy === 0 || Math.hypot(dx, dy) <= rad - 1;
          };
          for (const [x, y] of pts) {
            if (!inShape(x!, y!) || owns(el, x!, y!)) continue;
            fails.push(`${me} edge (${x!.toFixed(1)}, ${y!.toFixed(1)}) hits ${what(x!, y!)}`);
          }
        }
        return { fails, conflicts };
      }, { sel, index, name, R, STEP, probes: opts.probes && size, controls: CONTROLS });
      out.fails.push(...r.fails);
      out.conflicts.push(...r.conflicts);
    }
  }
  return out;
}

for (const { lang, path } of LANGS) {
  e2e(`44px hit areas at 390px own their visible boxes (${lang})`, { only: 'mobile' }, async ({ page, errors }) => {
    void errors;
    await open(page, path);
    await page.evaluate(() => document.querySelectorAll('details').forEach(d => (d.open = true)));
    const { fails, conflicts } = await scan(page);
    expect(fails).toEqual([]);
    expect(conflicts.sort()).toEqual([...GEOMETRY_CONFLICTS].sort());
  });

  e2e(`a pressed shell button keeps off its neighbors (${lang})`, async ({ page, errors }) => {
    void errors;
    await open(page, path);
    const buttons = page.locator('[data-out] .a-ls');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(1);
    const fails: string[] = [];
    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      await button.evaluate(el => el.scrollIntoView({ block: 'center' }));
      const b = (await button.boundingBox())!;
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await page.mouse.down();
      expect(await button.evaluate(el => el.matches(':active'))).toBe(true);
      const run = await button.getAttribute('data-run');
      const r = await scan(page, ['shell'], { probes: false, scroll: false });
      fails.push(...r.fails.map(f => `pressed ${run}: ${f}`));
      await page.mouse.move(1, 1);
      await page.mouse.up();
    }
    expect(fails).toEqual([]);
  });
}

e2e('the edge scan rejects a strip that steals a neighbor link', { only: 'mobile' }, async ({ page, errors }) => {
  void errors;
  await open(page, '/');
  await page.addStyleTag({ content: PARQUIZ_OVERLAP });
  const { fails } = await scan(page, ['link']);
  expect(fails.some(f => f.startsWith('link:https://github.com/Ritx10/Parquiz edge') && f.endsWith('hits link:https://parquiz.vercel.app'))).toBe(true);
});
