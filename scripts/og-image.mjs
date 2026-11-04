import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('..', import.meta.url));
const font = readFileSync(`${root}public/fonts/geist-mono-latin-wght-normal.woff2`).toString('base64');
const favicon = readFileSync(`${root}public/favicon.svg`, 'utf8');
const executablePath = process.env.CHROMIUM || '/Applications/Helium.app/Contents/MacOS/Helium';

const og = `<!doctype html><html><head><style>
@font-face{font-family:G;src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:100 900}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:oklch(0.165 0.004 260);font-family:G,monospace;color:oklch(0.83 0.004 260);padding:56px 72px;display:flex;flex-direction:column}
.bar{display:flex;gap:10px;align-items:center;color:oklch(0.68 0.006 260);font-size:22px;margin-bottom:72px}
.bar i{width:16px;height:16px;border-radius:50%;display:block}
.p{color:oklch(0.8 0.17 150);font-size:30px;margin-bottom:22px}
h1{font-size:66px;line-height:1.05;font-weight:700;color:oklch(0.97 0 0);letter-spacing:-0.02em}
h1 span{color:oklch(0.68 0.006 260);font-weight:400}
p.t{margin-top:30px;font-size:30px;line-height:1.45;max-width:30em}
.f{margin-top:auto;display:flex;justify-content:space-between;font-size:24px;color:oklch(0.68 0.006 260)}
.f b{color:oklch(0.8 0.17 150);font-weight:500}
.c{display:inline-block;width:0.55em;height:1em;background:oklch(0.8 0.17 150);vertical-align:-0.12em;margin-left:6px}
</style></head><body>
<div class="bar"><i style="background:oklch(0.74 0.15 25)"></i><i style="background:oklch(0.82 0.13 75)"></i><i style="background:oklch(0.8 0.17 150)"></i><span style="margin-left:10px">bitfalt@cr: ~</span></div>
<div class="p">~/bitfalt $ whoami</div>
<h1>Daniel Garbanzo <span>/ bitfalt</span></h1>
<p class="t">I build infrastructure in Rust: exchanges, AI platforms, blockchains. Hackathons on the side. Pura vida in between.</p>
<div class="f"><span><b>~/</b>bitfalt.dev<i class="c"></i></span><span>Costa Rica</span></div>
</body></html>`;

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(og);
await page.evaluate(() => document.fonts.ready);
writeFileSync(`${root}public/og.png`, await page.screenshot({ type: 'png' }));
const icons = {};
for (const size of [16, 32, 180]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${favicon.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  icons[size] = await page.screenshot({ type: 'png', omitBackground: true });
}
await browser.close();
writeFileSync(`${root}public/favicon-32.png`, icons[32]);
writeFileSync(`${root}public/apple-touch-icon.png`, icons[180]);
writeFileSync(`${root}public/favicon.ico`, ico([icons[16], icons[32]], [16, 32]));
console.log('wrote public/og.png, public/favicon-32.png, public/apple-touch-icon.png, public/favicon.ico');

function ico(pngs, sizes) {
  const head = Buffer.alloc(6 + 16 * pngs.length);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(pngs.length, 4);
  let offset = head.length;
  pngs.forEach((png, i) => {
    const e = 6 + 16 * i;
    head[e] = sizes[i];
    head[e + 1] = sizes[i];
    head.writeUInt16LE(1, e + 4);
    head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(png.length, e + 8);
    head.writeUInt32LE(offset, e + 12);
    offset += png.length;
  });
  return Buffer.concat([head, ...pngs]);
}
