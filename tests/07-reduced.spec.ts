import { e2e, expect, open, run, SHOTS, HIDE } from './harness';

e2e('reduced motion: no boot, no running animations, instant jumps', { reducedMotion: 'reduce', booted: false }, async ({ page, width, errors }) => {
  void errors;
  await open(page, '/');
  await page.addStyleTag({ content: HIDE });
  const boot = await page.evaluate(() => ({ skipHidden: (document.querySelector('[data-skip]') as HTMLElement).hidden, booting: document.querySelector('[data-term]')!.hasAttribute('data-booting'), first: (document.querySelector('[data-out]') as HTMLElement).innerText.split('\n')[0] }));
  expect(boot).toEqual({ skipHidden: true, booting: false, first: expect.stringMatching(/^Hi/) });
  await page.screenshot({ path: `${SHOTS}${width}-reduced-motion.png` });
  for (const id of ['parquiz', 'veilescrow', 'buildmyevent']) { await page.evaluate(id => document.getElementById('p-' + id)!.scrollIntoView({ block: 'center' }), id); await page.waitForTimeout(150); }
  await page.evaluate(() => scrollTo(0, 0));
  await run(page, 'trophies');
  await run(page, 'sudo hire-me');
  if (width < 721) { await page.click('[data-menu]'); await page.waitForTimeout(50); }
  await page.click('.hdr-nav a[data-sec="talks"]'); await page.waitForTimeout(60);
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const top = await page.evaluate(() => document.getElementById('talks')!.getBoundingClientRect().top);
  const anims = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').map(a => String((a as CSSAnimation).animationName || (a as CSSTransition).transitionProperty)));
  expect(anims).toEqual([]);
  expect(await page.evaluate(() => document.querySelectorAll('.a-burst').length)).toBe(0);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.caret')!).animationName)).toBe('none');
  expect(top).toBeLessThan(140);
});
