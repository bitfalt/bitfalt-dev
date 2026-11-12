import { e2e, expect, open, run, SHOTS, HIDE } from './harness';

const CMDS = ['help', 'whoami', 'ls', 'cat parquiz', 'open x', 'sudo hire-me', 'socials', 'trophies', 'banner', 'ls ~/hackathons --sort=wins', 'git log --author=bitfalt --oneline', 'open github', 'open 2', 'coffee', 'vim'];

e2e('shell commands', async ({ page, context, width, errors }) => {
  void errors;
  await context.route(/^https:\/\/(x|github)\.com\//, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>stub</title>' }));
  await open(page, '/');
  await page.addStyleTag({ content: HIDE });
  const term = page.locator('[data-term]');
  const outs: Record<string, string> = {};
  for (const [i, c] of CMDS.entries()) {
    await page.evaluate(() => { scrollTo(0, 0); document.querySelector('[data-out]')!.replaceChildren(); });
    const popP = c.startsWith('open') ? context.waitForEvent('page', { timeout: 4000 }) : null;
    await run(page, c);
    const pop = popP ? await popP : null;
    await page.waitForTimeout(c.startsWith('sudo') ? 650 : 250);
    await term.screenshot({ path: `${SHOTS}${width}-cmd-${String(i + 1).padStart(2, '0')}-${c.replace(/[^a-z0-9]+/gi, '-').replace(/-+$/, '')}.png` });
    const out = await page.innerText('[data-out]');
    expect(out, c).not.toMatch(/command not found|no such|nothing to open/);
    outs[c] = out;
    if (c === 'ls ~/hackathons --sort=wins') outs['order'] = (await page.$$eval('[data-out] [data-run]', b => b.map(x => x.getAttribute('data-run')!.slice(4)))).join(' ');
    if (pop) { outs[c + ' url'] = pop.url(); await pop.close(); }
    if (c.startsWith('sudo')) expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('dagarbanz@proton.me');
  }
  expect(outs['help']).toContain('open x|github|linkedin');
  expect(outs['whoami']).toContain('Daniel Garbanzo (bitfalt). Costa Rica.');
  expect(outs['ls']).toContain('05 writing/');
  expect(outs['cat parquiz']).toContain('ParQuiz · Dojo Game Jam VIII · Mar 2026 · ★ Prize winner, both tracks');
  expect(outs['open x url']).toBe('https://x.com/bitfalt');
  expect(outs['open github url']).toBe('https://github.com/bitfalt');
  expect(new URL(outs['open 2 url']!).pathname).toBe('/talks/stellar-sessions-2');
  expect(outs['sudo hire-me']).toContain('Permission granted. Good call.');
  expect(outs['trophies']).toContain('Prize winners: 4 projects.');
  expect(outs['order']).toBe('sigilo parquiz veilescrow buildmyevent paralock gacha-desk echoes-of-the-void');
  expect(outs['socials']).toContain('dagarbanz@proton.me');
  expect(outs['vim']).toContain(':q!');
});

e2e('shell lang command switches route and echoes in the new language', async ({ page, errors }) => {
  void errors;
  await open(page, '/');
  await Promise.all([page.waitForURL(/\/es\//), run(page, 'lang es')]);
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-ready'));
  expect(await page.innerText('[data-out]')).toContain('Idioma: español.');
});
