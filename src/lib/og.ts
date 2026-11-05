import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { coverSrc, hackathonGroups, person, type Lang, type Talk } from '../data/site';
import { fmt, ui } from '../i18n';
import { contribGrid } from './contrib';

export const OG = { width: 1200, height: 630 } as const;
const PAD = 64;

const C = {
  bg: '#0d0e10', fg: '#f5f5f5', fg2: '#c6c7ca', fg3: '#96989c', rule: '#2c2e31',
  gold: '#f8ca65', accent: '#5edb81',
  heat: ['#202225', '#244d2e', '#317a45', '#3eab5e', '#5ce483'],
} as const;

type Style = Record<string, string | number>;
type Child = El | string | false | null | undefined;
export interface El { type: string; props: Record<string, unknown> }

const h = (type: string, style: Style = {}, ...children: Child[]): El => ({
  type,
  props: { style: type === 'div' ? { display: 'flex', ...style } : style, children },
});

const star = (size: number): El => ({
  type: 'svg',
  props: {
    width: size, height: size, viewBox: '0 0 24 24',
    children: [{ type: 'path', props: { fill: C.gold, d: 'M12 1.8l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.9l-6.4 3.5 1.4-7.1-5.3-5 7.2-.9z' } }],
  },
});

const prompt = (cmd: string, size = 28) =>
  h('div', { fontSize: size, color: C.fg, gap: size * 0.6 }, h('span', { color: C.accent }, '~/bitfalt $'), cmd);

function heatBand(weeks: number): El {
  const cols = contribGrid().weeks.slice(-weeks);
  return h('div', { gap: 4 }, ...cols.map(w => h('div', { flexDirection: 'column', gap: 4 },
    ...w.map(d => h('div', { width: 12, height: 12, borderRadius: 2, background: C.heat[d.level] })))));
}

function footer(lang: Lang, heat: boolean): El {
  const total = contribGrid().total.toLocaleString('en-US');
  return h('div', { position: 'absolute', left: PAD, top: OG.height - 36 - 108, width: OG.width - 2 * PAD, height: 108, alignItems: 'flex-end', justifyContent: 'space-between' },
    h('div', { flexDirection: 'column', gap: 8 },
      h('div', { fontSize: 26, color: C.fg, alignItems: 'center', gap: 10 }, h('span', { color: C.accent }, '~/'), 'bitfalt.dev', h('div', { width: 14, height: 28, background: C.accent })),
      h('div', { fontSize: 20, color: C.fg3 }, `${fmt(ui[lang].ogContrib, { n: total })} · ${person.country}`)),
    heat && heatBand(28));
}

const frame = (...kids: Child[]) =>
  h('div', { width: OG.width, height: OG.height, background: C.bg, color: C.fg2, fontFamily: 'Geist Mono', flexDirection: 'column', padding: `52px ${PAD}px 0`, position: 'relative' }, ...kids);

const display = (text: string, size: number) =>
  h('div', { fontSize: size, fontWeight: 700, color: C.fg, letterSpacing: -size / 30, lineHeight: 1.04, marginTop: 18, maxWidth: OG.width - 2 * PAD }, text);

const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`);

function titleSize(text: string): number {
  if (text.length <= 18) return 92;
  if (text.length <= 40) return 72;
  return 56;
}

export function homeCard(lang: Lang): El {
  const t = ui[lang];
  return frame(
    prompt('whoami'),
    display(person.name, 92),
    h('div', { fontSize: 30, marginTop: 20, maxWidth: 1000, lineHeight: 1.35 }, t.heroLead),
    h('div', { marginTop: 40 }, prompt('ls ~/hackathons --sort=wins', 26)),
    h('div', { gap: 36, marginTop: 14, fontSize: 32, fontWeight: 500, color: C.gold },
      ...hackathonGroups().winners.map(w => h('div', { alignItems: 'center', gap: 12 }, star(28), w.id))),
    footer(lang, true));
}

export function writingCard(lang: Lang, titles: string[]): El {
  const t = ui[lang];
  const rows = titles.length
    ? titles.slice(0, 3).map(s => h('div', { gap: 18, fontSize: 30, color: C.fg }, h('span', { color: C.accent }, '[*]'), clip(s, 52)))
    : [h('div', { gap: 18, fontSize: 30, color: C.fg2 }, h('span', { color: C.fg3 }, '[ ]'), t.emptyWriting)];
  return frame(
    prompt('ls ~/writing'),
    display(t.writing, 92),
    h('div', { fontSize: 30, marginTop: 16 }, `${person.name} / ${person.handle}`),
    h('div', { flexDirection: 'column', gap: 14, marginTop: 44 }, ...rows),
    footer(lang, true));
}

export function postCard(lang: Lang, slug: string, title: string, date: string): El {
  return frame(
    prompt(`cat writing/${slug}.md`, 26),
    display(clip(title, 96), titleSize(title)),
    h('div', { fontSize: 28, marginTop: 28, gap: 20 },
      h('span', { color: C.accent }, date), h('span', { color: C.fg3 }, '·'), lang.toUpperCase(), h('span', { color: C.fg3 }, '·'), `${person.name} / ${person.handle}`),
    footer(lang, true));
}

export function talkCard(talk: Talk): El {
  const t = ui.es;
  const cover = `data:image/jpeg;base64,${readFileSync(join(process.cwd(), 'public', coverSrc(talk))).toString('base64')}`;
  return frame(
    prompt(`open ${talk.n}`, 26),
    h('div', { marginTop: 34, gap: 44 },
      h('div', { flexDirection: 'column', width: 500 },
        h('div', { fontSize: 30, color: C.accent, fontWeight: 500 }, `Stellar Sessions #${talk.n}`),
        h('div', { fontSize: titleSize(talk.title) > 72 ? 64 : 54, fontWeight: 700, color: C.fg, letterSpacing: -2, lineHeight: 1.08, marginTop: 18 }, talk.title),
        h('div', { fontSize: 24, marginTop: 24, color: C.fg2 }, fmt(t.slides, { n: talk.slides }))),
      h('div', { flexDirection: 'column', border: `2px solid ${C.rule}`, borderRadius: 10, overflow: 'hidden', background: C.bg },
        h('div', { height: 36, alignItems: 'center', gap: 8, padding: '0 14px', borderBottom: `2px solid ${C.rule}`, fontSize: 16, color: C.fg3 },
          h('div', { width: 11, height: 11, borderRadius: 6, background: '#fb817a' }), h('div', { width: 11, height: 11, borderRadius: 6, background: '#f5b75b' }), h('div', { width: 11, height: 11, borderRadius: 6, background: C.accent }),
          h('span', { marginLeft: 8 }, `talks/${talk.slug}`)),
        { type: 'img', props: { src: cover, width: 524, height: 295, style: { display: 'flex' } } })),
    footer('es', false));
}

const fonts = (['Regular', 'Medium', 'Bold'] as const).map((w, i) => ({
  name: 'Geist Mono',
  data: readFileSync(join(process.cwd(), 'src/assets/fonts', `GeistMono-${w}.ttf`)),
  weight: ([400, 500, 700] as const)[i]!,
  style: 'normal' as const,
}));

export async function png(el: El): Promise<Buffer> {
  const svg = await satori(el as Parameters<typeof satori>[0], { ...OG, fonts });
  return new Resvg(svg).render().asPng();
}
