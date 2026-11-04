import rss from '@astrojs/rss';
import type { Lang } from '../data/site';
import { ui } from '../i18n';
import { postHref, posts } from './posts';

export async function feed(lang: Lang, site: URL) {
  const list = await posts(lang);
  return rss({
    title: ui[lang].writingTitle,
    description: ui[lang].writingDescription,
    site,
    customData: `<language>${lang}</language>`,
    items: list.map(p => ({ title: p.data.title, pubDate: p.data.date, description: p.data.summary, link: postHref(p) })),
  });
}
