import { e2e, expect, open, run, mod, LANGS } from './harness';

const contrast = () => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true })!;
  const rgba = (c: string) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0]!, d[1]!, d[2]!, d[3]! / 255]; };
  const lum = ([r, g, b]: number[]) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!); };
  const blend = (fg: number[], bg: number[]) => [0, 1, 2].map(i => fg[i]! * fg[3]! + bg[i]! * (1 - fg[3]!));
  const bgOf = (el: Element) => {
    const stack: number[][] = [];
    for (let e: Element | null = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage !== 'none') return null; const c = rgba(cs.backgroundColor); if (c[3]! > 0) { stack.push(c); if (c[3]! >= 1) break; } }
    let base = rgba(getComputedStyle(document.documentElement).backgroundColor); if (base[3]! < 1) base = [255, 255, 255, 1];
    for (let i = stack.length - 1; i >= 0; i--) base = [...blend(stack[i]!, base), 1];
    return base;
  };
  const fails: string[] = []; let checked = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set<Element>();
  while (walker.nextNode()) {
    const n = walker.currentNode; if (!n.textContent!.trim()) continue;
    const el = n.parentElement!; if (seen.has(el)) continue; seen.add(el);
    if (el.closest('.sr-only,[aria-hidden=true],script,style,.skip,[hidden],[inert]')) continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const bg = bgOf(el); if (!bg) continue;
    const fg = blend(rgba(cs.color), bg);
    const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
    const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
    checked++;
    if (ratio < need) fails.push(`${ratio.toFixed(2)}<${need} "${n.textContent!.trim().slice(0, 40)}" ${el.className}`);
  }
  return { checked, fails };
};

for (const { lang, path } of LANGS) {
  e2e(`contrast ${lang}: page, palette, menu`, async ({ page, width, errors }) => {
    void errors;
    await open(page, path);
    for (const c of ['help', 'trophies', 'socials']) await run(page, c);
    await page.evaluate(() => { (document.querySelector('.a-arch') as HTMLDetailsElement).open = true; });
    await page.waitForTimeout(1200);
    const main = await page.evaluate(contrast);
    expect(main.checked).toBeGreaterThan(100);
    expect(main.fails).toEqual([]);
    await page.keyboard.press(`${mod}+k`); await page.waitForTimeout(100);
    const pal = await page.evaluate(contrast);
    expect(pal.fails).toEqual([]);
    await page.keyboard.press('Escape');
    if (width < 721) {
      await page.click('[data-menu]'); await page.waitForTimeout(250);
      expect((await page.evaluate(contrast)).fails).toEqual([]);
    }
  });
}

for (const path of ['/writing/', '/es/writing/', '/does-not-exist']) {
  e2e(`contrast ${path}`, async ({ page }) => {
    await open(page, path);
    const r = await page.evaluate(contrast);
    expect(r.checked).toBeGreaterThan(5);
    expect(r.fails).toEqual([]);
  });
}
