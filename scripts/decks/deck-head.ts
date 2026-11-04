import { deckMeta, headTags } from '../../src/lib/seo.ts';

const [slug, title, themeColor] = process.argv.slice(2);
if (!slug || !title || !themeColor) throw new Error('Usage: node deck-head.ts SLUG TITLE THEME_COLOR');

process.stdout.write([
  headTags(deckMeta(slug, title)),
  `<meta name="theme-color" content="${themeColor}">`,
  '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
  '<link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32">',
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
].join('\n'));
