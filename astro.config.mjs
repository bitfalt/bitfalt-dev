import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://bitfalt.dev',
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  integrations: [
    sitemap({
      customPages: [1, 2, 3].map(n => `https://bitfalt.dev/talks/stellar-sessions-${n}`),
      filter: page => !page.includes('/404'),
      lastmod: new Date(),
      i18n: { defaultLocale: 'en', locales: { en: 'en', es: 'es' } },
    }),
  ],
});
