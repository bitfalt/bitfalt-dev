import { e2e, expect, open, run, toContainText, LANGS } from './harness';

const EXPECT = {
  en: { now: 'Backend Engineer at Nexus', trophies: 'Prize winners: 3 projects. ParQuiz placed in both tracks.', whoami: 'Now: Backend Engineer at Nexus. Studying: M.S. Computer Science at TEC.' },
  es: { now: 'Backend Engineer en Nexus', trophies: 'Proyectos premiados: 3. ParQuiz ganó en ambas categorías.', whoami: 'Ahora: Backend Engineer en Nexus. Estudio: M.S. Computer Science en el TEC.' },
};

for (const { lang, path } of LANGS) {
  e2e(`locale facts render from site data (${lang})`, async ({ page, errors }) => {
    void errors;
    await open(page, path);
    const e = EXPECT[lang];
    expect(await page.$eval('.a-kv dd', el => el.textContent)).toBe(e.now);
    const winners = await page.$$eval('.a-winner', els => els.length);
    expect(e.trophies).toContain(String(winners));

    await run(page, 'trophies');
    expect(await page.innerText('[data-out]')).toContain(e.trophies);
    await run(page, 'whoami');
    expect(await page.innerText('[data-out]')).toContain(e.whoami);
    await run(page, 'sudo hire-me');
    await toContainText(page.locator('[data-out]'), 'dagarbanz@proton.me. ');
  });
}
