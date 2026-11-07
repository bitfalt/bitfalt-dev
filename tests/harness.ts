import { afterAll, expect, test } from 'bun:test';
import { existsSync, mkdirSync } from 'node:fs';
import { chromium, request as http, type APIRequestContext, type Browser, type BrowserContext, type BrowserContextOptions, type Locator, type Page } from 'playwright';

export const SHOTS = 'tests/shots/';
export const HIDE = '.toast{display:none!important}';
export const LANGS = [{ lang: 'en', path: '/' }, { lang: 'es', path: '/es/' }] as const;
export const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
export { expect };

const PORT = 4322;
export const BASE_URL = `http://127.0.0.1:${PORT}`;
const RESULTS = 'test-results/';
const TIMEOUT = 90_000;

export const PROJECTS = {
  desktop: { viewport: { width: 1440, height: 900 } },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
} as const satisfies Record<string, BrowserContextOptions>;
export type Project = keyof typeof PROJECTS;

export interface Options {
  only?: Project;
  booted?: boolean;
  reducedMotion?: 'reduce' | 'no-preference';
  javaScriptEnabled?: boolean;
}

export interface Fixtures {
  page: Page;
  context: BrowserContext;
  request: APIRequestContext;
  width: number;
  errors: string[];
  notFound: string[];
}

interface Run { server: ReturnType<typeof Bun.spawn>; browser: Browser }

const shared = await start();

async function start(): Promise<Run> {
  if (!existsSync('dist/index.html')) throw new Error('dist/ is missing. Run `bun run build` before `bun test`.');
  if (await up()) throw new Error(`Port ${PORT} is already in use. Stop the other server before \`bun test\`.`);
  const server = Bun.spawn(['node', 'node_modules/astro/bin/astro.mjs', 'preview', '--ignore-lock', '--host', '127.0.0.1', '--port', String(PORT)], { stdout: 'pipe', stderr: 'pipe' });
  const stop = () => { server.kill(); };
  process.on('exit', stop);
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { stop(); process.exit(130); });
  const deadline = Date.now() + 30_000;
  while (!(await up())) {
    if (server.exitCode !== null) throw new Error(`astro preview exited with code ${server.exitCode}: ${await new Response(server.stderr as ReadableStream).text()}`);
    if (Date.now() > deadline) { stop(); throw new Error(`astro preview did not answer on ${BASE_URL} in 30 s`); }
    await Bun.sleep(100);
  }
  const executablePath = process.env['CHROMIUM'];
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  return { server, browser };
}

async function up() {
  try { return (await fetch(`${BASE_URL}/`)).ok; } catch { return false; }
}

afterAll(async () => {
  await shared.browser.close();
  shared.server.kill();
  await shared.server.exited;
});

export function e2e(name: string, options: Options, fn: (f: Fixtures) => Promise<void>): void;
export function e2e(name: string, fn: (f: Fixtures) => Promise<void>): void;
export function e2e(name: string, a: Options | ((f: Fixtures) => Promise<void>), b?: (f: Fixtures) => Promise<void>) {
  const [options, fn] = typeof a === 'function' ? [{}, a] : [a, b!];
  for (const project of Object.keys(PROJECTS) as Project[]) {
    const title = `[${project}] ${name}`;
    if (options.only && options.only !== project) test.skip(title, () => {});
    else test(title, () => body(project, title, options, fn), TIMEOUT);
  }
}

async function body(project: Project, title: string, options: Options, fn: (f: Fixtures) => Promise<void>) {
  const use = PROJECTS[project];
  const context = await shared.browser.newContext({
    ...use,
    baseURL: BASE_URL,
    permissions: ['clipboard-read', 'clipboard-write'],
    colorScheme: 'light',
    locale: 'en-US',
    reducedMotion: options.reducedMotion ?? 'no-preference',
    javaScriptEnabled: options.javaScriptEnabled ?? true,
  });
  const page = await context.newPage();
  if (options.booted ?? true) await page.addInitScript(() => { sessionStorage.setItem('bf-booted', '1'); });
  await page.route('**/_vercel/insights/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));

  const errors: string[] = [];
  page.on('console', m => {
    if (m.type() !== 'error') return;
    if (m.location().url.includes('/does-not-exist') && m.text().includes('status of 404')) return;
    errors.push(`${m.text()} @ ${m.location().url}`);
  });
  page.on('pageerror', e => errors.push('PAGE ' + e.message));
  const notFound: string[] = [];
  page.on('response', r => { if (r.status() === 404 && !r.url().includes('/does-not-exist')) notFound.push(r.url()); });

  const request = await http.newContext({ baseURL: BASE_URL });
  const used = { errors: false, notFound: false };
  const fixtures: Fixtures = {
    page, context, request, width: use.viewport.width,
    get errors() { used.errors = true; return errors; },
    get notFound() { used.notFound = true; return notFound; },
  };

  try {
    await fn(fixtures);
    if (used.errors) expect(errors, 'console errors').toEqual([]);
    if (used.notFound) expect(notFound, '404 responses').toEqual([]);
  } catch (e) {
    mkdirSync(RESULTS, { recursive: true });
    await page.screenshot({ path: `${RESULTS}${project}-${slug(title.slice(project.length + 3))}.png` }).catch(() => {});
    throw e;
  } finally {
    await context.close().catch(() => {});
    await request.dispose();
  }
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function open(page: Page, path = '/') {
  await page.goto(path, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-ready'));
}

export async function run(page: Page, cmd: string) {
  await page.fill('#a-cmd', cmd);
  await page.press('#a-cmd', 'Enter');
}

const INTERVALS = [100, 250, 500, 1000];

export async function poll<T>(fn: () => Promise<T>, expected: T, { timeout = 5000, message }: { timeout?: number; message?: string } = {}) {
  const deadline = Date.now() + timeout;
  for (let i = 0; ; i++) {
    const value = await fn();
    if (Bun.deepEquals(value, expected, true) || Date.now() >= deadline) return expect(value as unknown, message).toEqual(expected);
    await Bun.sleep(Math.min(INTERVALS[Math.min(i, INTERVALS.length - 1)]!, Math.max(0, deadline - Date.now())));
  }
}

export const toBeVisible = (locator: Locator, timeout = 5000) =>
  poll(() => locator.isVisible(), true, { timeout, message: `${locator} to be visible` });

const normalize = (s: string) => s.replace(/[\u200b\u00ad]/g, '').trim().replace(/\s+/g, ' ');

export const toContainText = (locator: Locator, text: string, timeout = 5000) =>
  poll(async () => normalize((await locator.textContent()) ?? '').includes(normalize(text)), true, { timeout, message: `${locator} to contain text "${text}"` });
