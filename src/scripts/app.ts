import { deckHref, hackathonGroups, hackathonsByWins, oss, person, SECTIONS, socials, talks, coverSrc, experience, type Hackathon, type Lang, type OpenSource, type Section, type Talk } from '../data/site';
import { dayLabel, fmt, homePath, mon, otherLang, pad2, ui } from '../i18n';
import { sectionCommand } from '../lib/commands';

const lang: Lang = document.documentElement.lang === 'es' ? 'es' : 'en';
const t = ui[lang];
const stage = document.getElementById('stage')!;
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const setHTML = (el: Element, html: string) => el.replaceChildren(document.createRange().createContextualFragment(html));
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
const ext = (label: string, url: string) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}<span class="sr-only">${t.newTab}</span></a>`;
const winLabel = (h: Hackathon) => (h.win === 'both' ? t.winnerBoth : t.winner);
const store = {
  get: (s: Storage, k: string) => { try { return s.getItem(k); } catch { return null; } },
  set: (s: Storage, k: string, v: string) => { try { s.setItem(k, v); } catch { /* storage disabled */ } },
  del: (s: Storage, k: string) => { try { s.removeItem(k); } catch { /* storage disabled */ } },
};

function openTab(url: string) {
  const w = window.open(url, '_blank');
  if (w) w.opener = null;
  return w;
}

const kbd = document.querySelector('[data-kbd]');
if (kbd) kbd.textContent = isMac ? '⌘K' : 'Ctrl K';

let toastEl: HTMLDivElement | undefined;
let toastTimer: number | undefined;
function toast(msg: string) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    document.body.append(toastEl);
  }
  const el = toastEl;
  el.textContent = msg;
  el.dataset['show'] = '';
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => delete el.dataset['show'], Math.max(2200, msg.split(' ').length * 300));
}
async function copyEmail() {
  try { await navigator.clipboard.writeText(person.email); toast(t.copied); return true; }
  catch { toast(t.copyFail); return false; }
}

const headerEl = document.querySelector<HTMLElement>('[data-hdr]')!;
const headerH = () => headerEl.offsetHeight;
const onHome = !!document.getElementById('experience');

function jumpTo(id: string) {
  closeMenu();
  const el = document.getElementById(id);
  if (!el) { location.href = `${homePath(lang)}${id === 'top' ? '' : '#' + id}`; return; }
  const body = el.closest('details:not([open])') as HTMLDetailsElement | null;
  if (body) body.open = true;
  const y = id === 'top' ? 0 : el.getBoundingClientRect().top + scrollY - headerH() - 12;
  scrollTo({ top: y, behavior: reduced() ? 'auto' : 'smooth' });
  const target = el.matches('section') ? el.querySelector('h2') || el : el;
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  (target as HTMLElement).focus({ preventScroll: true });
  if (id.startsWith('p-')) { el.removeAttribute('data-flash'); void (el as HTMLElement).offsetWidth; el.setAttribute('data-flash', ''); }
}

function langHref(to: Lang) {
  const base = document.querySelector<HTMLAnchorElement>(`[data-lang="${to}"]`)?.getAttribute('href') ?? homePath(to);
  if (!onHome) return base;
  return base + (location.hash || (scrollY >= 40 && active ? `#${active}` : ''));
}
function setLang(to: Lang) {
  if (to === lang) return;
  store.set(sessionStorage, 'bf-booted', '1');
  location.href = langHref(to);
}

const nav = headerEl.querySelector<HTMLElement>('[data-nav]')!;
const menuBtn = nav.querySelector<HTMLButtonElement>('[data-menu]')!;
function closeMenu(restore = false) {
  if (!nav.hasAttribute('data-open')) return;
  nav.removeAttribute('data-open');
  menuBtn.setAttribute('aria-expanded', 'false');
  if (restore) menuBtn.focus();
}
function toggleMenu() {
  const open = !nav.hasAttribute('data-open');
  nav.toggleAttribute('data-open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  if (open) (nav.querySelector<HTMLElement>('a[aria-current]') || nav.querySelector<HTMLElement>('a'))?.focus();
}

const ind = headerEl.querySelector<HTMLElement>('.hdr-ind')!;
const menuLabel = headerEl.querySelector<HTMLElement>('[data-menu-label]')!;
const links = [...nav.querySelectorAll<HTMLAnchorElement>('a[data-sec]')];
const setH = () => document.documentElement.style.setProperty('--hdr-h', headerEl.offsetHeight + 'px');
let active: Section | null | undefined;
function setActive(id: Section | null, force = false) {
  if (id === active && !force) return;
  active = id;
  links.forEach(a => (a.dataset['sec'] === id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
  const a = links.find(x => x.dataset['sec'] === id);
  setHTML(menuLabel, a && id ? `<span class="n">${pad2(SECTIONS.indexOf(id) + 1)}</span> ${esc(t[id])}` : esc(t.sections));
  if (!a || !a.offsetWidth) { ind.style.opacity = '0'; return; }
  ind.style.opacity = '1';
  ind.style.width = a.offsetWidth + 'px';
  ind.style.transform = `translateX(${a.offsetLeft}px)`;
}
function compute() {
  const line = headerEl.offsetHeight + innerHeight * 0.3;
  let cur: Section | null = null;
  for (const id of SECTIONS) { const s = document.getElementById(id); if (s && s.getBoundingClientRect().top <= line) cur = id; }
  setActive(cur);
}
setH();
let ticking = false;
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; compute(); }); } }, { passive: true });
addEventListener('resize', () => { setH(); setActive(active ?? null, true); });
ind.style.transition = 'none';
compute();
requestAnimationFrame(() => requestAnimationFrame(() => { ind.style.transition = ''; }));

stage.addEventListener('click', e => {
  const target = e.target as Element;
  const a = target.closest<HTMLAnchorElement>('a[data-sec], a[data-jump]');
  if (a && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
    const id = a.dataset['sec'] || a.dataset['jump']!;
    if (onHome) { e.preventDefault(); jumpTo(id); }
    return;
  }
  const l = target.closest<HTMLAnchorElement>('a[data-lang]');
  if (l && !e.metaKey && !e.ctrlKey && !e.shiftKey) { e.preventDefault(); setLang(l.dataset['lang'] as Lang); return; }
  const m = target.closest<HTMLElement>('[data-copy-email]');
  if (m) { e.preventDefault(); void copyEmail(); return; }
  const b = target.closest('button');
  if (!b) return;
  if ('menu' in b.dataset) toggleMenu();
  else if ('palette' in b.dataset) openPalette();
});
document.addEventListener('pointerdown', e => { if (!(e.target as Element).closest('[data-nav]')) closeMenu(); });
nav.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.hasAttribute('data-open')) { e.stopPropagation(); closeMenu(true); } });
nav.addEventListener('focusout', e => { if (!nav.contains(e.relatedTarget as Node | null)) closeMenu(); });

/* ---------- command palette ---------- */
type Group = 'go' | 'project' | 'talk' | 'action';
interface Item { g: Group; label: string; sub?: string; kw?: string; lang?: Lang; run: () => unknown }

function paletteItems(): Item[] {
  const items: Item[] = [];
  SECTIONS.forEach((id, i) => items.push({ g: 'go', label: `${pad2(i + 1)}  ${t[id]}`, kw: id, run: () => jumpTo(id) }));
  hackathonsByWins().forEach(h => items.push({ g: 'project', label: h.name, sub: h.result === 'winner' ? `★ ${h.event}` : h.event, kw: h.id, run: () => jumpTo('p-' + h.id) }));
  oss.forEach(o => items.push({ g: 'project', label: o.name, sub: o.repo, kw: o.id, run: () => jumpTo('p-' + o.id) }));
  talks.forEach(k => items.push({ g: 'talk', label: k.title, sub: `Stellar Sessions #${k.n}`, kw: `deck slides charla stellar-sessions-${k.n} ${k.slug}`, lang: 'es', run: () => openTab(deckHref(k)) }));
  items.push({ g: 'action', label: t.copyEmail, sub: person.email, kw: 'email correo mail contact', run: copyEmail });
  items.push({ g: 'action', label: t.switchLang, sub: lang === 'en' ? 'ES' : 'EN', kw: 'language idioma lang es en spanish english español', run: () => setLang(otherLang(lang)) });
  const [gh, li, x] = socials;
  items.push({ g: 'action', label: t.openGithub, sub: gh!.short, kw: 'github', run: () => openTab(gh!.url) });
  items.push({ g: 'action', label: t.openLinkedin, sub: li!.short, kw: 'linkedin', run: () => openTab(li!.url) });
  items.push({ g: 'action', label: t.openX, sub: x!.short, kw: 'x twitter', run: () => openTab(x!.url) });
  return items;
}
function fuzzy(q: string, s: string) {
  q = q.toLowerCase(); s = s.toLowerCase();
  if (!q) return 1;
  const idx = s.indexOf(q);
  if (idx >= 0) return 100 - idx;
  let j = 0, score = 0;
  for (let i = 0; i < s.length && j < q.length; i++) if (s[i] === q[j]) { j++; score++; }
  return j === q.length ? score : 0;
}

const paletteEl = document.createElement('div');
paletteEl.className = 'pal';
paletteEl.hidden = true;
document.body.append(paletteEl);
const P: { open: boolean; sel: number; list: Item[]; ret: HTMLElement | null } = { open: false, sel: 0, list: [], ret: null };

function openPalette(prefill = '') {
  closeMenu();
  P.ret = document.activeElement as HTMLElement | null;
  P.open = true;
  setHTML(paletteEl, `<div class="pal-scrim" data-pal-close></div>
    <div class="pal-box" role="dialog" aria-modal="true" aria-label="${t.paletteLabel}">
      <div class="pal-in"><span aria-hidden="true">›</span><input type="text" role="combobox" aria-expanded="true" aria-controls="pal-list" aria-autocomplete="list" autocomplete="off" spellcheck="false" placeholder="${esc(t.palettePh)}" aria-label="${t.paletteLabel}"><kbd>esc</kbd></div>
      <ul id="pal-list" role="listbox" aria-label="${t.paletteLabel}"></ul>
    </div>`);
  paletteEl.hidden = false;
  stage.setAttribute('inert', '');
  const input = paletteEl.querySelector('input')!;
  input.value = prefill;
  input.addEventListener('input', () => { P.sel = 0; drawPalette(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); P.sel = Math.min(P.sel + 1, P.list.length - 1); drawPalette(false); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); P.sel = Math.max(P.sel - 1, 0); drawPalette(false); }
    else if (e.key === 'Enter') { e.preventDefault(); runPalette(P.sel); }
    else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
    else if (e.key === 'Tab') { e.preventDefault(); }
  });
  P.sel = 0;
  drawPalette();
  input.focus();
}
paletteEl.addEventListener('click', e => {
  const target = e.target as Element;
  if (target.closest('[data-pal-close]')) return closePalette();
  const li = target.closest<HTMLElement>('[data-i]');
  if (li) runPalette(Number(li.dataset['i']));
});
paletteEl.addEventListener('mousemove', e => {
  const li = (e.target as Element).closest<HTMLElement>('[data-i]');
  if (li && Number(li.dataset['i']) !== P.sel) { P.sel = Number(li.dataset['i']); drawPalette(false); }
});
function drawPalette(rebuild = true) {
  const input = paletteEl.querySelector('input')!;
  const ul = paletteEl.querySelector('ul')!;
  if (rebuild) {
    const q = input.value.trim();
    let scored = paletteItems().map(it => ({ it, s: Math.max(fuzzy(q, it.label), fuzzy(q, it.kw || '') * 0.9, fuzzy(q, it.sub || '') * 0.8, fuzzy(q, t.groups[it.g]) * 0.7) })).filter(x => x.s > 0);
    if (q) scored = scored.sort((a, b) => b.s - a.s);
    P.list = scored.map(x => x.it);
    let lastG: Group | null = null;
    setHTML(ul, P.list.length ? P.list.map((it, i) => {
      const head = !q && it.g !== lastG ? `<li class="pal-g" role="presentation">${esc(t.groups[it.g])}</li>` : '';
      lastG = it.g;
      return `${head}<li role="option" id="pal-${i}" data-i="${i}" data-g="${it.g}" aria-selected="false"><span class="pal-l"${it.lang ? ` lang="${it.lang}"` : ''}>${esc(it.label)}</span>${it.sub ? `<span class="pal-s">${esc(it.sub)}</span>` : ''}<span class="pal-h">${esc(t.hints[it.g])} ↵</span></li>`;
    }).join('') : `<li class="pal-empty" role="presentation">${esc(fmt(t.paletteEmpty, { q }))}</li>`);
  }
  ul.querySelectorAll<HTMLElement>('[data-i]').forEach(li => li.setAttribute('aria-selected', String(Number(li.dataset['i']) === P.sel)));
  const cur = ul.querySelector<HTMLElement>(`[data-i="${P.sel}"]`);
  if (cur) { input.setAttribute('aria-activedescendant', cur.id); cur.scrollIntoView({ block: 'nearest' }); }
  else input.removeAttribute('aria-activedescendant');
}
function runPalette(i: number) {
  const it = P.list[i];
  if (!it) return;
  closePalette(true);
  it.run();
}
function closePalette(skipRestore = false) {
  if (!P.open) return;
  P.open = false;
  paletteEl.hidden = true;
  paletteEl.replaceChildren();
  stage.removeAttribute('inert');
  if (!skipRestore) P.ret?.focus?.();
}
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault();
    if (P.open) closePalette(); else openPalette();
  }
});

/* ---------- home only: heatmap, winners, shell ---------- */
if (onHome) {
  heat();
  winners();
  shell();
}

function heat() {
  const el = document.querySelector<HTMLElement>('.heat')!;
  const status = document.querySelector<HTMLElement>('.heat-st')!;
  const cells = [...el.querySelectorAll<HTMLElement>('[data-i]')];
  let cur = -1;
  const idle = status.textContent;
  const show = (i: number) => {
    cells[cur]?.classList.remove('cur');
    cur = i;
    if (i < 0) { status.textContent = idle; return; }
    const c = cells[i]!;
    c.classList.add('cur');
    const n = Number(c.dataset['n']);
    status.textContent = fmt(n === 1 ? t.dayCountOne : t.dayCountMany, { n, d: dayLabel(lang, c.dataset['d']!) });
  };
  el.addEventListener('pointerover', e => { const c = (e.target as Element).closest<HTMLElement>('[data-i]'); if (c) show(Number(c.dataset['i'])); });
  el.addEventListener('pointerleave', () => { if (document.activeElement !== el) show(-1); });
  el.addEventListener('focus', () => { if (cur < 0) show(cells.length - 1); });
  el.addEventListener('blur', () => show(-1));
  el.addEventListener('keydown', e => {
    const moves: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 };
    if (!(e.key in moves) && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault(); e.stopPropagation();
    let n = cur < 0 ? cells.length - 1 : cur + (moves[e.key] || 0);
    if (e.key === 'Home') n = 0;
    if (e.key === 'End') n = cells.length - 1;
    if (n >= 0 && n < cells.length) show(n);
  });
  const sc = document.querySelector<HTMLElement>('[data-heat-scroll]')!;
  sc.scrollLeft = sc.scrollWidth;
}

const GLYPHS = ['*', '+', '✦', '★', '$', '{', '}', '·'];
function burst(host: HTMLElement, origin: { x: number; y: number }, count = 18) {
  const box = document.createElement('div');
  box.className = 'a-burst';
  box.setAttribute('aria-hidden', 'true');
  box.style.left = origin.x + 'px';
  box.style.top = origin.y + 'px';
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.textContent = GLYPHS[i % GLYPHS.length]!;
    const ang = ((-170 + (160 * i) / (count - 1) + (Math.random() * 10 - 5)) * Math.PI) / 180;
    const dist = 34 + Math.random() * 40;
    s.style.setProperty('--dx', (Math.cos(ang) * dist).toFixed(1) + 'px');
    s.style.setProperty('--dy', (Math.sin(ang) * dist).toFixed(1) + 'px');
    s.style.setProperty('--r', (Math.random() * 180 - 90).toFixed(0) + 'deg');
    s.style.animationDelay = Math.round(Math.random() * 90) + 'ms';
    box.append(s);
  }
  host.append(box);
  setTimeout(() => box.remove(), 1100);
}
function celebrate(item: HTMLElement) {
  item.dataset['celebrated'] = String(Number(item.dataset['celebrated'] || 0) + 1);
  if (reduced()) return;
  const b = item.querySelector<HTMLElement>('[data-win]')!;
  const ir = item.getBoundingClientRect(), br = b.getBoundingClientRect();
  b.classList.remove('a-stamp'); void b.offsetWidth; b.classList.add('a-stamp');
  burst(item, { x: br.left - ir.left + br.width / 2, y: br.top - ir.top + br.height / 2 });
}
function winners() {
  const items = [...document.querySelectorAll<HTMLElement>('.a-winner')];
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    celebrate(e.target as HTMLElement);
  }), { threshold: 0.6 });
  items.forEach(i => io.observe(i));
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    items.forEach(i => i.querySelector('[data-win]')!.addEventListener('pointerenter', () => { if (!i.querySelector('.a-burst')) celebrate(i); }));
  }
}

const BANNER = [' _     _  _     __        _  _   ', '| |__ (_)| |_  / _| __ _ | || |_ ', "| '_ \\| ||  _||  _|/ _` || ||  _|", '|_.__/|_| \\__||_|  \\__,_||_| \\__|'].join('\n');
const TROPHY = ['  ___________', " '._==_==_=_.'", ' .-\\:      /-.', '| (|:.     |) |', " '-|:.     |-'", '   \\::.    /', "    '::. .'", '      ) (', "    _.' '._", '   `"""""""`'].join('\n');
const COFFEE = ['    ( (', '     ) )', '  ........', '  |      |]', '  \\      /', '   `----´'].join('\n');

const SEC_ALIAS: Record<string, Section | 'top'> = { experience: 'experience', exp: 'experience', experiencia: 'experience', work: 'experience', oss: 'oss', 'open-source': 'oss', opensource: 'oss', hackathons: 'hackathons', hacks: 'hackathons', hackatones: 'hackathons', talks: 'talks', charlas: 'talks', writing: 'writing', blog: 'writing', escritos: 'writing', '~': 'top', '/': 'top', '..': 'top' };
const SOCIAL_ALIAS: Record<string, string> = { x: 'X', twitter: 'X', github: 'GitHub', gh: 'GitHub', linkedin: 'LinkedIn' };

type Project = { id: string; h: Hackathon; o?: undefined } | { id: string; o: OpenSource; h?: undefined };
const projects = (): Project[] => [...hackathonsByWins().map(h => ({ id: h.id, h })), ...oss.map(o => ({ id: o.id, o }))];
function findProject(q: string) {
  q = q.toLowerCase().replace(/\s+/g, '-');
  return projects().find(p => p.id === q || p.id.startsWith(q) || (p.h ?? p.o).name.toLowerCase().replace(/\s+/g, '-') === q);
}
function findTalk(q: string): Talk | undefined {
  q = q.toLowerCase();
  return talks.find(k => String(k.n) === q || k.slug === q || k.slug.endsWith('-' + q) || k.title.toLowerCase().includes(q) || (q === 'x402' && k.n === 2));
}

function shell() {
  const out = document.querySelector<HTMLElement>('[data-out]')!;
  const form = document.querySelector<HTMLFormElement>('[data-form]')!;
  const input = form.querySelector('input')!;
  const skipBtn = document.querySelector<HTMLButtonElement>('[data-skip]')!;
  const term = document.querySelector<HTMLElement>('[data-term]')!;
  const hist: string[] = JSON.parse(store.get(sessionStorage, 'bf-hist') || '[]');
  let hi = hist.length;
  const line = (html: string, cls = '') => { const d = document.createElement('div'); d.className = 'a-l ' + cls; setHTML(d, html); out.append(d); out.scrollTop = out.scrollHeight; return d; };
  const lines = (arr: string[], cls?: string) => arr.forEach(s => line(esc(s), cls));
  const pre = (txt: string, cls = '') => line(`<pre class="a-art ${cls}">${esc(txt)}</pre>`);
  const termBurst = () => { if (reduced()) return; const r = term.getBoundingClientRect(); burst(term, { x: r.width / 2, y: Math.min(r.height - 60, 200) }, 26); };

  const clock = document.querySelector<HTMLElement>('[data-clock]')!;
  const tick = () => { clock.textContent = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Costa_Rica', hour: '2-digit', minute: '2-digit' }).format(new Date()) + ' CR'; clock.title = t.local; };
  tick(); setInterval(tick, 30000);

  const lsSections = () => line(SECTIONS.map((id, i) => `<button type="button" class="a-ls" data-run="cd ${id}">${pad2(i + 1)} ${id}/</button>`).join(''));
  const greeting = [...out.children];

  const root = document.documentElement;
  if (root.hasAttribute('data-booting')) {
    let i = 0, done = false, timer: number | undefined;
    out.replaceChildren();
    root.removeAttribute('data-booting');
    skipBtn.hidden = false;
    term.dataset['booting'] = '';
    const finish = () => {
      if (done) return; done = true;
      clearTimeout(timer);
      out.replaceChildren();
      skipBtn.hidden = true;
      delete term.dataset['booting'];
      store.set(sessionStorage, 'bf-booted', '1');
      line(esc(t.boot.at(-1)), 'a-dim');
      out.append(...greeting);
    };
    const step = () => { if (done) return; if (i < t.boot.length) { line(esc(t.boot[i++]), 'a-dim a-in'); timer = window.setTimeout(step, i === 1 ? 260 : 170); } else timer = window.setTimeout(finish, 350); };
    step();
    skipBtn.addEventListener('click', () => { finish(); input.focus(); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && !done) finish(); });
    term.addEventListener('pointerdown', finish);
  } else {
    store.set(sessionStorage, 'bf-booted', '1');
  }

  const openLink = (url: string, label: string) => {
    line(esc(fmt(t.openingSocial, { u: label })), 'a-ok');
    if (!openTab(url)) line(`${esc(t.popup)} ${ext(label + ' ↗', url)}`, 'a-dim');
  };
  const norm = (s: string) => s.replace(/^~\//, '').replace(/\/$/, '');
  const known = (['experience', 'oss', 'talks', 'writing', 'heat'] as const).map(k => ({ k, c: sectionCommand(k, lang) }));

  const exec = (raw: string) => {
    const cmd = raw.trim();
    line(`<span class="a-ps">~/bitfalt $</span> ${esc(cmd)}`, 'a-echo');
    if (!cmd) return;
    hist.push(cmd); if (hist.length > 50) hist.shift(); hi = hist.length;
    store.set(sessionStorage, 'bf-hist', JSON.stringify(hist));
    const [c0 = '', ...rest] = cmd.split(/\s+/);
    const c = c0.toLowerCase(), arg = rest.join(' ').toLowerCase();
    const flat = cmd.replace(/\s+/g, ' ').toLowerCase();
    const kc = known.find(x => x.c.cmd === flat);
    if (kc) {
      if (kc.k === 'heat') return void line(esc(document.querySelector('.heat-fig strong')!.textContent), 'a-ok');
      return lines(kc.c.out);
    }
    if (c === 'help' || c === '?') {
      line(`<dl class="a-help">${t.help.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`);
      return void line(esc(t.helpFoot), 'a-dim');
    }
    if (c === 'clear' || c === 'cls') { out.replaceChildren(); return; }
    if (c === 'whoami') return lines(t.whoami.map(s => fmt(s, { summary: person.summary[lang] })));
    if (c === 'ls') {
      const parts = arg.split(/\s+/).filter(Boolean);
      const target = norm(parts.find(p => !p.startsWith('-')) || '');
      const s = SEC_ALIAS[target];
      if (!target) { lsSections(); return void line(esc(t.lsHint), 'a-dim'); }
      if (s === 'hackathons') {
        return void line(hackathonsByWins().map(h => `<button type="button" class="a-ls" data-run="cat ${h.id}">${h.id}${h.result === 'winner' ? ' <span class="a-star">★</span>' : ''}</button>`).join(''));
      }
      if (s === 'oss') return void line(oss.map(o => `<button type="button" class="a-ls" data-run="cat ${o.id}">${o.id}</button>`).join(''));
      if (s === 'talks') return void line(talks.map(k => `<button type="button" class="a-ls" data-run="open ${k.n}">${k.slug}.deck</button>`).join(''));
      if (s === 'experience') return lines(experience.map(e => `${e.org.padEnd(12)} ${e.role}`));
      if (s === 'writing') return void line(esc(sectionCommand('writing', lang, document.querySelectorAll('#writing a.a-name').length).out[0]), 'a-dim');
      return void line(esc(fmt(t.noSection, { s: target })), 'a-err');
    }
    if (c === 'cd') {
      const s = arg ? SEC_ALIAS[norm(arg)] : 'top';
      if (!s) return void line(esc(fmt(t.noSection, { s: arg })), 'a-err');
      line(esc(`→ ~/${s === 'top' ? '' : s}`), 'a-ok');
      setTimeout(() => jumpTo(s), reduced() ? 0 : 220);
      return;
    }
    if (c === 'cat' || c === 'less' || c === 'more') {
      const p = arg ? findProject(arg) : undefined;
      if (!p) return void line(esc(fmt(t.noProject, { p: arg })), 'a-err');
      if (p.h) {
        const h = p.h;
        line(`<span class="a-cat-h">${esc(`${h.name} · ${h.event} · ${mon(lang, h.date)}${h.result === 'winner' ? ' · ★ ' + winLabel(h) : h.result === 'pending' ? ' · ' + t.pending : ''}`)}</span>`);
        h.bullets.forEach(b => line('  ' + esc(b[lang])));
        if (h.links.length) line(h.links.map(l => ext(l.label + ' ↗', l.url)).join('  '));
      } else {
        const o = p.o;
        line(`<span class="a-cat-h">${esc(`${o.name} · ${o.repo}${o.stars ? ' · ★ ' + o.stars : ''}`)}</span>`);
        line('  ' + esc(o.what[lang]));
        line(ext((o.pr ? 'PR ' + o.pr : 'repo') + ' ↗', o.url));
      }
      line(`<button type="button" class="a-ls" data-jump-p="${p.id}">↓ ${esc(t.showOnPage)}</button>`);
      if (p.h?.result === 'winner') termBurst();
      return;
    }
    if (c === 'open' || c === 'xdg-open') {
      const q = norm(arg.replace(/^#/, ''));
      const soc = socials.find(s => s.label === SOCIAL_ALIAS[q]);
      if (soc) return openLink(soc.url, soc.short);
      const k = q ? findTalk(q) : undefined;
      if (!k) return void line(esc(fmt(t.noTalk, { s: arg })), 'a-err');
      line(esc(fmt(t.opening, { n: k.n, title: k.title })), 'a-ok');
      if (!openTab(deckHref(k))) line(`${esc(t.popup)} ${ext(fmt(t.slidesLink, { n: k.n }) + ' ↗', deckHref(k))}`, 'a-dim');
      line(`<img class="a-peek" src="${coverSrc(k)}" alt="${esc(fmt(t.coverAlt, { n: k.n }))}" width="320" height="180">`);
      return;
    }
    if (c === 'socials' || c === 'links' || c === 'contact') {
      socials.forEach(s => line(`<span class="a-dim">${esc(s.label.toLowerCase().padEnd(9))}</span>${ext(s.short + ' ↗', s.url)}`));
      return void line(`<span class="a-dim">${'email'.padEnd(9)}</span><button type="button" class="a-ls" data-run="email">${esc(person.email)}</button>`);
    }
    if (c === 'trophies' || c === 'trophy') {
      pre(TROPHY, 'a-gold');
      line(esc(t.trophies), 'a-ok');
      line(hackathonGroups().winners.map(h => `<button type="button" class="a-ls" data-run="cat ${h.id}">★ ${h.id}</button>`).join(''));
      termBurst();
      return;
    }
    if (c === 'banner' || c === 'figlet' || c === 'logo') return void pre(BANNER, 'a-banner');
    if (c === 'lang') {
      const l: Lang = arg === 'es' || arg === 'en' ? arg : otherLang(lang);
      if (l === lang) return void line(esc(t.langOk), 'a-ok');
      store.set(sessionStorage, 'bf-pending', JSON.stringify(['lang ' + l]));
      setLang(l);
      return;
    }
    if (c === 'email' || c === 'mail') { void copyEmail(); return void line(esc(person.email), 'a-ok'); }
    if (c === 'sudo' && /hire/.test(arg)) {
      const [l1 = '', l2 = '', l3 = ''] = t.hire;
      line(esc(l1), 'a-dim');
      setTimeout(() => { line(esc(l2), 'a-ok'); void copyEmail(); line(esc(l3)); termBurst(); }, reduced() ? 0 : 450);
      return;
    }
    if (c === 'sudo') return void line(esc(t.sudo), 'a-err');
    if (['coffee', 'cafe', 'café', 'pura-vida'].includes(c) || (c === 'pura' && arg === 'vida') || (c === 'make' && arg === 'coffee')) { pre(COFFEE, 'a-gold'); return void line(esc(t.coffee), 'a-ok'); }
    if (c === 'rm') return void line(esc(t.rm), 'a-err');
    if (['vim', 'vi', 'nano', 'emacs'].includes(c)) return void line(esc(t.vim), 'a-dim');
    if (c === 'exit' || c === 'logout') return void line(esc(t.exit), 'a-dim');
    if (c === 'history') return lines(hist.map((h, i) => `${String(i + 1).padStart(3)}  ${h}`));
    line(esc(fmt(t.notFound, { c: c0 })), 'a-err');
  };

  const pending: string[] | null = JSON.parse(store.get(sessionStorage, 'bf-pending') || 'null');
  if (pending) {
    store.del(sessionStorage, 'bf-pending');
    pending.forEach(p => { line(`<span class="a-ps">~/bitfalt $</span> ${esc(p)}`, 'a-echo'); line(esc(t.langOk), 'a-ok'); });
  }

  form.addEventListener('submit', e => { e.preventDefault(); const v = input.value; input.value = ''; exec(v); });
  const COMMANDS = ['help', 'ls', 'whoami', 'cd', 'cat', 'open', 'socials', 'trophies', 'banner', 'lang', 'email', 'clear', 'history'];
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp') { e.preventDefault(); if (hi > 0) { hi--; input.value = hist[hi]!; } }
    else if (e.key === 'ArrowDown') { e.preventDefault(); if (hi < hist.length) { hi++; input.value = hist[hi] || ''; } }
    else if (e.key === 'Tab' && input.value.trim()) {
      const [c = '', ...r] = input.value.trimStart().split(/\s+/);
      const p = r.join(' ').toLowerCase();
      const pool: readonly string[] = c === 'cat' ? projects().map(x => x.id) : c === 'cd' || c === 'ls' ? SECTIONS : c === 'open' ? [...talks.map(k => String(k.n)), 'x', 'github', 'linkedin'] : r.length ? [] : COMMANDS;
      const m = pool.filter(x => x.startsWith(r.length ? p : c.toLowerCase()));
      if (m.length === 1) { e.preventDefault(); input.value = r.length ? `${c} ${m[0]}` : m[0] + ' '; }
      else if (m.length > 1) { e.preventDefault(); line(esc(m.join('  ')), 'a-dim'); }
    }
    else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); out.replaceChildren(); }
  });
  stage.addEventListener('click', e => {
    const target = e.target as Element;
    const r = target.closest<HTMLElement>('[data-run]');
    if (r) { exec(r.dataset['run']!); if (!r.closest('[data-out]')) input.focus({ preventScroll: true }); return; }
    const jp = target.closest<HTMLElement>('[data-jump-p]');
    if (jp) jumpTo('p-' + jp.dataset['jumpP']);
  });
}

document.documentElement.setAttribute('data-ready', '');
