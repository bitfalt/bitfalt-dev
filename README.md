# bitfalt.dev

The personal site of Daniel Garbanzo (bitfalt): experience, open-source work, hackathons, talks and writing. It is a static Astro site in English (`/`) and Spanish (`/es/`). The terminal UI (shell, Cmd+K palette, heatmap, boot sequence) is progressive enhancement. All content is HTML at build time and reads without JavaScript.

## Run

Requires Node 24 and pnpm.

```sh
pnpm install
pnpm dev                 # http://localhost:4321
pnpm build               # astro check + static build into dist/
pnpm preview             # serve dist/ in the foreground
```

## Layout

- `src/data/site.ts`: every fact on the site, typed. Bilingual strings are `{ en, es }`. `hackathonsByWins()` is the one source of hackathon order.
- `src/i18n/en.ts`, `src/i18n/es.ts`: UI strings. `es` is typed as `typeof en`, so a missing key fails the build.
- `src/data/contributions.json`: the GitHub contribution calendar for the heatmap.
- `src/content/writing/`: blog posts (Astro content collection `writing`).
- `src/scripts/app.ts`: the only client script (header, palette, shell, heatmap, winner celebration, boot).
- `public/talks/<slug>/index.html`: slide-only decks, served at `/talks/<slug>`.
- `src/lib/seo.ts`: head tags (description, canonical, hreflang, OG, Twitter) and JSON-LD for every page and deck.
- `src/lib/og.ts`, `src/pages/og/[...key].png.ts`: OG images, rendered at build time with satori and resvg.
- `src/assets/fonts/`: Geist Mono TTF files for the OG renderer (satori cannot read woff2), with `OFL.txt`.

## Add a post

Create `src/content/writing/<slug>.md`:

```md
---
title: "Post title"
date: 2026-11-03
lang: en          # en or es
summary: "One sentence for the index and the RSS feed."
draft: false
---

Body in Markdown.
```

`summary` is the meta description. Keep it between 110 and 160 characters. The build renders the post's OG image at `/og/writing/<slug>.png` (or `/og/es/writing/<slug>.png`) from the title, date and language.

English posts appear at `/writing/<slug>`, in `/rss.xml` and on the home page. Spanish posts appear at `/es/writing/<slug>`, in `/es/rss.xml` and on `/es/`. Set `draft: true` to keep a post out of the build.

## Refresh contributions

```sh
gh auth status                 # must be logged in
pnpm contributions             # gh api graphql for login bitfalt -> src/data/contributions.json
```

The build never calls GitHub. Commit the new JSON file.

## Rebuild the decks

The deck sources are in `/Users/bitfalt/Developer/talks` and are not in this repo.

```sh
cd scripts/decks
python3 build-public-decks.py /Users/bitfalt/Developer/talks/stellar-workshop-talk out/stellar-sessions-1.html
python3 build-public-decks.py /Users/bitfalt/Developer/talks/stellar-x402-talk out/stellar-sessions-2.html
python3 build-public-decks.py /Users/bitfalt/Developer/talks/stellar-web3-onboarding-talk out/stellar-sessions-3.html
node verify.mjs                # slide count, no notes, arrow navigation
for n in 1 2 3; do cp out/stellar-sessions-$n.html ../../public/talks/stellar-sessions-$n/index.html; done
```

`build-public-decks.py` runs `node deck-head.ts` to inject the description, canonical, OG, Twitter, JSON-LD, theme-color and favicon tags into `<head>`. The tags come from `src/data/site.ts` through `src/lib/seo.ts`. Do not edit the deck HTML by hand.

`verify.mjs` loads `playwright-core` from `~/.pi/agent/npm/node_modules` and reads `CHROMIUM` for the browser path. `scripts/decks/out/` is git-ignored.

## OG images and favicons

`astro build` renders one 1200x630 PNG per page under `/og/`: the EN and ES home pages, the two writing indexes, each post and each deck. No browser is needed, so this runs on Vercel. The 404 page uses the home image. Change the design in `src/lib/og.ts`.

```sh
pnpm favicons                  # renders favicon-32.png, favicon.ico, apple-touch-icon.png with Helium
```

## Tests

Playwright runs against `astro preview` of `dist/`. It uses Helium by default. Set `CHROMIUM` to use another Chromium binary.

```sh
pnpm build
pnpm test                      # each tests/*.spec.ts file, one at a time
pnpm test:file tests/05-shell.spec.ts
```

Every file runs at 1440px (`desktop`) and 390px (`mobile`). Screenshots go to `tests/shots/` (git-ignored).

## Deploy

`vercel.json` sets `cleanUrls` and cache headers for fonts and hashed assets. No Vercel project is linked.
