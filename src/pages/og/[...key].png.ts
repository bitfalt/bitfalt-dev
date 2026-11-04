import type { APIRoute, GetStaticPaths } from 'astro';
import { talks, type Lang } from '../../data/site';
import { homeCard, png, postCard, talkCard, writingCard } from '../../lib/og';
import { postHref, posts } from '../../lib/posts';

type Card = Parameters<typeof png>[0];

export const getStaticPaths = (async () => {
  const cards: { key: string; card: () => Promise<Card> | Card }[] = [];
  for (const lang of ['en', 'es'] as Lang[]) {
    const prefix = lang === 'en' ? '' : 'es/';
    const list = await posts(lang);
    cards.push({ key: `${prefix}index`, card: () => homeCard(lang) });
    cards.push({ key: `${prefix}writing`, card: () => writingCard(lang, list.map(p => p.data.title)) });
    for (const p of list) {
      cards.push({ key: postHref(p).slice(1), card: () => postCard(lang, p.id, p.data.title, p.data.date.toISOString().slice(0, 10)) });
    }
  }
  for (const t of talks) cards.push({ key: `talks/${t.slug}`, card: () => talkCard(t) });
  return cards.map(({ key, card }) => ({ params: { key }, props: { card } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) =>
  new Response(new Uint8Array(await png(await (props as { card: () => Promise<Card> | Card }).card())), { headers: { 'Content-Type': 'image/png' } });
