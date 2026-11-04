import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '../data/site';

export type Post = CollectionEntry<'writing'>;

export async function posts(lang?: Lang): Promise<Post[]> {
  const all = await getCollection('writing', p => !p.data.draft && (!lang || p.data.lang === lang));
  return all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export const postHref = (p: Post) => `${p.data.lang === 'es' ? '/es' : ''}/writing/${p.id}`;
