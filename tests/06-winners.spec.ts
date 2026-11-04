import { test, expect, open, SHOTS, HIDE } from './fixtures';

test('winner celebration fires on the three winners only', async ({ page, width, errors }) => {
  void errors;
  await open(page, '/');
  await page.addStyleTag({ content: HIDE });
  const order = await page.evaluate(() => [...document.querySelectorAll('#hackathons > .a-list > .a-it')].map(li => li.id.slice(2)));
  expect(order).toEqual(['parquiz', 'veilescrow', 'buildmyevent', 'paralock', 'sigilo', 'gacha-desk', 'echoes-of-the-void']);
  for (const id of ['parquiz', 'veilescrow', 'buildmyevent']) {
    await page.evaluate(id => { const el = document.getElementById('p-' + id)!; scrollTo(0, el.getBoundingClientRect().top + scrollY - 200); }, id);
    await page.waitForTimeout(260);
    const f = await page.evaluate(id => { const el = document.getElementById('p-' + id)!; return { c: el.dataset['celebrated'], burst: el.querySelectorAll('.a-burst span').length, stamp: el.querySelector('[data-win]')!.classList.contains('a-stamp') }; }, id);
    expect(f.c, id).toBe('1');
    expect(f.burst, id).toBeGreaterThan(0);
    expect(f.stamp, id).toBe(true);
    const b = (await page.locator(`#p-${id} [data-win]`).boundingBox())!;
    await page.screenshot({ path: `${SHOTS}${width}-winner-${id}-burst.png`, clip: { x: Math.max(0, b.x - 120), y: Math.max(0, b.y - 90), width: Math.min(width - Math.max(0, b.x - 120), 480), height: 220 } });
  }
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => document.querySelectorAll('.a-burst').length)).toBe(0);
  expect(await page.evaluate(() => [...document.querySelectorAll('#hackathons .a-it:not(.a-winner), #oss .a-it')].filter(x => (x as HTMLElement).dataset['celebrated']).length)).toBe(0);
  expect(await page.evaluate(() => document.querySelectorAll('.a-winner').length)).toBe(3);
  await page.addStyleTag({ content: '.hdr{position:static!important}' });
  await page.locator('#hackathons').screenshot({ path: `${SHOTS}${width}-hackathons.png` });
});
