import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('..', import.meta.url));
const favicon = readFileSync(`${root}public/favicon.svg`, 'utf8');
const executablePath = process.env.CHROMIUM || '/Applications/Helium.app/Contents/MacOS/Helium';

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage();
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
console.log('wrote public/favicon-32.png, public/apple-touch-icon.png, public/favicon.ico');

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
