import type { Lang, Text } from '../data/site';
import { en, type UI } from './en';
import { es } from './es';

export type { UI };
export const ui: Record<Lang, UI> = { en, es };

export const fmt = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));

export const L = (v: Text, lang: Lang) => v[lang];

export const homePath = (lang: Lang) => (lang === 'en' ? '/' : '/es/');
export const otherLang = (lang: Lang): Lang => (lang === 'en' ? 'es' : 'en');

const MONTHS: Record<Lang, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
};
export const monthName = (lang: Lang, m: number) => MONTHS[lang][m]!;

export const mon = (lang: Lang, ym: string | null) => {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return `${monthName(lang, Number(m) - 1)} ${y}`;
};
export const range = (lang: Lang, a: string, b: string | null) => `${mon(lang, a)} – ${b ? mon(lang, b) : ui[lang].present}`;
export const dayLabel = (lang: Lang, iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${monthName(lang, d.getUTCMonth())} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
};
export const pad2 = (n: number) => String(n).padStart(2, '0');
