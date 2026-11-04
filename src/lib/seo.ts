import { currentJob, person, socials, talks, type Lang, type Talk } from '../data/site.ts';

export const SITE = 'https://bitfalt.dev';
export const abs = (path: string) => new URL(path, SITE).href;
export const ogImage = (key: string) => abs(`/og/${key}.png`);
export const LOCALE = { en: 'en_US', es: 'es_CR' } satisfies Record<Lang, string>;

export type JsonLd = Record<string, unknown>;

export interface Meta {
  lang: Lang;
  title: string;
  description: string;
  canonical: string;
  image: string;
  imageAlt: string;
  type?: 'website' | 'article';
  published?: string;
  alternates?: { en: string; es: string } | undefined;
  jsonLd: JsonLd;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const tag = (el: 'meta' | 'link', attrs: Record<string, string>) =>
  `<${el} ${Object.entries(attrs).map(([k, v]) => `${k}="${esc(v)}"`).join(' ')}>`;
const prop = (property: string, content: string) => tag('meta', { property, content });
const name = (n: string, content: string) => tag('meta', { name: n, content });

export const jsonLdScript = (data: JsonLd) =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

export function headTags(m: Meta): string {
  const other: Lang = m.lang === 'en' ? 'es' : 'en';
  return [
    name('description', m.description),
    tag('link', { rel: 'canonical', href: m.canonical }),
    ...(m.alternates ? [
      tag('link', { rel: 'alternate', hreflang: 'en', href: abs(m.alternates.en) }),
      tag('link', { rel: 'alternate', hreflang: 'es', href: abs(m.alternates.es) }),
      tag('link', { rel: 'alternate', hreflang: 'x-default', href: abs(m.alternates.en) }),
    ] : []),
    prop('og:type', m.type ?? 'website'),
    prop('og:site_name', 'bitfalt.dev'),
    prop('og:title', m.title),
    prop('og:description', m.description),
    prop('og:url', m.canonical),
    prop('og:locale', LOCALE[m.lang]),
    ...(m.alternates ? [prop('og:locale:alternate', LOCALE[other])] : []),
    prop('og:image', m.image),
    prop('og:image:secure_url', m.image),
    prop('og:image:type', 'image/png'),
    prop('og:image:width', '1200'),
    prop('og:image:height', '630'),
    prop('og:image:alt', m.imageAlt),
    ...(m.published ? [prop('article:published_time', m.published), prop('article:author', abs('/'))] : []),
    name('twitter:card', 'summary_large_image'),
    name('twitter:site', `@${person.handle}`),
    name('twitter:creator', `@${person.handle}`),
    name('twitter:title', m.title),
    name('twitter:description', m.description),
    name('twitter:image', m.image),
    name('twitter:image:alt', m.imageAlt),
    jsonLdScript(m.jsonLd),
  ].join('\n');
}

const PERSON_ID = `${SITE}/#person`;
const SITE_ID = `${SITE}/#website`;
const personRef = { '@id': PERSON_ID };

export function personLd() {
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: person.name,
    alternateName: person.handle,
    url: abs('/'),
    image: ogImage('index'),
    jobTitle: currentJob.role,
    worksFor: { '@type': 'Organization', name: currentJob.org },
    address: { '@type': 'PostalAddress', addressCountry: person.country },
    alumniOf: { '@type': 'CollegeOrUniversity', name: person.study.schoolName },
    sameAs: socials.map(s => s.url),
    knowsAbout: person.skills,
  };
}

const authorLd = () => ({ '@type': 'Person', '@id': PERSON_ID, name: person.name, alternateName: person.handle, url: abs('/') });

export function homeLd(lang: Lang, title: string, path: string) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'ProfilePage', '@id': `${abs(path)}#profile`, url: abs(path), name: title, inLanguage: lang, isPartOf: { '@id': SITE_ID }, mainEntity: personRef },
      personLd(),
      { '@type': 'WebSite', '@id': SITE_ID, url: abs('/'), name: 'bitfalt.dev', inLanguage: ['en', 'es'], publisher: personRef },
    ],
  };
}

export const blogLd = (lang: Lang, title: string, description: string, path: string) => ({
  '@context': 'https://schema.org',
  '@type': 'Blog', url: abs(path), name: title, description, inLanguage: lang, author: authorLd(),
});

export const blogPostingLd = (p: { title: string; description: string; date: string; lang: Lang; url: string; image: string }) => ({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: p.title, description: p.description, datePublished: p.date, inLanguage: p.lang,
  url: p.url, mainEntityOfPage: p.url, image: p.image, author: authorLd(),
});

export const websiteLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite', '@id': SITE_ID, url: abs('/'), name: 'bitfalt.dev', inLanguage: ['en', 'es'], publisher: authorLd(),
});

const deckPath = (t: Talk) => `/talks/${t.slug}`;

export function deckDescription(t: Talk): string {
  const base = `Stellar Sessions #${t.n}: ${t.title}. ${t.what.es}`;
  const long = `${base} Slides en español de ${person.name} (${person.handle}).`;
  return long.length <= 160 ? long : base;
}

export function deckMeta(slug: string, title: string): Meta {
  const t = talks.find(k => k.slug === slug);
  if (!t) throw new Error(`No talk with slug ${slug}`);
  const description = deckDescription(t);
  const image = ogImage(`talks/${t.slug}`);
  return {
    lang: 'es', title, description, canonical: abs(deckPath(t)), image,
    imageAlt: `Portada de las slides de Stellar Sessions #${t.n}, \u201c${t.title}\u201d, dentro de una ventana de terminal de bitfalt.dev.`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'PresentationDigitalDocument',
      name: `Stellar Sessions #${t.n}: ${t.title}`, description, inLanguage: 'es', url: abs(deckPath(t)), image, author: authorLd(),
    },
  };
}
