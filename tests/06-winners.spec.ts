import { e2e, expect, open, poll, SHOTS, HIDE } from './harness';

const WINNERS = ['sigilo', 'parquiz', 'veilescrow', 'buildmyevent'];

e2e('winner celebration fires on the winners only', async ({ page, width, errors }) => {
  void errors;
  await open(page, '/');
  await page.addStyleTag({ content: HIDE });
  const order = await page.evaluate(() => [...document.querySelectorAll('#hackathons > .a-list > .a-it')].map(li => li.id.slice(2)));
  expect(order).toEqual(['sigilo', 'parquiz', 'veilescrow', 'buildmyevent', 'paralock', 'gacha-desk', 'echoes-of-the-void']);
  expect(await page.locator('main .a-it[data-celebrated]').count()).toBe(0);
  await page.evaluate(() => {
    const log: { added: string[]; removed: string[]; particles: number[] } = { added: [], removed: [], particles: [] };
    (window as unknown as { bursts: typeof log }).bursts = log;
    const isBurst = (n: Node): n is HTMLElement => n instanceof HTMLElement && n.classList.contains('a-burst');
    new MutationObserver(ms => ms.forEach(m => {
      const owner = (m.target as HTMLElement).closest('.a-it')?.id.slice(2) ?? '?';
      m.addedNodes.forEach(n => { if (isBurst(n)) { log.added.push(owner); log.particles.push(n.querySelectorAll('span').length); } });
      m.removedNodes.forEach(n => { if (isBurst(n)) log.removed.push(owner); });
    })).observe(document.querySelector('main')!, { childList: true, subtree: true });
  });
  const bursts = () => page.evaluate(() => (window as unknown as { bursts: { added: string[]; removed: string[]; particles: number[] } }).bursts);
  for (const id of WINNERS) {
    await page.evaluate(id => { const el = document.getElementById('p-' + id)!; scrollTo(0, el.getBoundingClientRect().top + scrollY - 200); }, id);
    await poll(async () => (await bursts()).added.includes(id), true, { message: id });
    expect(await page.evaluate(id => document.getElementById('p-' + id)!.querySelector('[data-win]')!.classList.contains('a-stamp'), id), id).toBe(true);
    const b = (await page.locator(`#p-${id} [data-win]`).boundingBox())!;
    await page.screenshot({ path: `${SHOTS}${width}-winner-${id}-burst.png`, clip: { x: Math.max(0, b.x - 120), y: Math.max(0, b.y - 90), width: Math.min(width - Math.max(0, b.x - 120), 480), height: 220 } });
  }
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await poll(async () => (await bursts()).removed.length, WINNERS.length, { timeout: 5000 });
  const log = await bursts();
  expect([...log.added].sort()).toEqual([...WINNERS].sort());
  expect([...log.removed].sort()).toEqual([...WINNERS].sort());
  for (const n of log.particles) expect(n).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.querySelectorAll('.a-burst').length)).toBe(0);
  const celebrated = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>('main .a-it')].filter(x => x.dataset['celebrated']).map(x => [x.id.slice(2), x.dataset['celebrated']])));
  expect(celebrated).toEqual(Object.fromEntries(WINNERS.map(id => [id, '1'])));
  expect(await page.evaluate(() => document.querySelectorAll(".a-winner").length)).toBe(WINNERS.length);
  await page.addStyleTag({ content: '.hdr{position:static!important}' });
  await page.locator('#hackathons').screenshot({ path: `${SHOTS}${width}-hackathons.png` });
});
