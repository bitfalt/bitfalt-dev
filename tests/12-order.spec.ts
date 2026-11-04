import { test, expect, open, run, mod, LANGS } from './fixtures';

const ORDER = ['parquiz', 'veilescrow', 'buildmyevent', 'paralock', 'sigilo', 'gacha-desk', 'echoes-of-the-void'];
const WINNERS = ORDER.slice(0, 3);

for (const { lang, path } of LANGS) {
  test(`every surface lists hackathons in one order (${lang})`, async ({ page, errors }) => {
    void errors;
    await open(page, path);

    const cards = await page.$$eval('#hackathons > .a-list > .a-it', els => els.map(li => li.id.slice(2)));
    expect(cards, 'cards').toEqual(ORDER);

    const cmdl = await page.$eval('#hackathons .a-cmdl-o', el => el.textContent!);
    const fromCmdl = cmdl.split('\n').flatMap(l => l.replace(/#.*$/, '').replace(/★/g, ' ').trim().split(/\s+/).filter(Boolean));
    expect(fromCmdl, 'section command line').toEqual(ORDER);

    const shellIds = async (cmd: string) => {
      await page.evaluate(() => document.querySelector('[data-out]')!.replaceChildren());
      await run(page, cmd);
      return page.$$eval('[data-out] [data-run^="cat "]', b => b.map(x => x.getAttribute('data-run')!.slice(4)));
    };
    expect(await shellIds('ls hackathons'), 'ls hackathons').toEqual(ORDER);
    expect(await shellIds('ls ~/hackathons')).toEqual(ORDER);
    expect(await shellIds('ls hackathons --sort=wins'), 'ls --sort=wins').toEqual(ORDER);
    expect(await shellIds('trophies'), 'trophies').toEqual(WINNERS);

    await page.keyboard.press(`${mod}+k`);
    await page.waitForSelector('.pal [role=option]');
    const ids = new Set(ORDER);
    const names = await page.$$eval('.pal [data-g=project] .pal-l', els => els.map(e => e.textContent!));
    const nameToId = await page.$$eval('#hackathons > .a-list > .a-it', els => Object.fromEntries(els.map(li => [li.querySelector('.a-name')!.textContent!, li.id.slice(2)])));
    const palette = names.map(n => nameToId[n]).filter((id): id is string => !!id && ids.has(id));
    expect(palette, 'empty-query palette').toEqual(ORDER);
    const firstProjects = names.slice(0, ORDER.length).map(n => nameToId[n]);
    expect(firstProjects, 'palette lists hackathons first in the project group').toEqual(ORDER);
  });
}
