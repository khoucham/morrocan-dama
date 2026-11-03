/* Renders tools/icon.svg to the PNG sizes the installable app needs. Needs playwright (dev only). */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const svg = fs.readFileSync(path.join(__dirname, 'icon.svg'), 'utf8');
const out = path.join(__dirname, '..', 'public', 'icons');
const jobs = [['icon-192.png', 192, 1], ['icon-512.png', 512, 1], ['apple-touch-icon.png', 180, 1], ['icon-maskable-512.png', 512, 0.74]];
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage();
  for (const [name, size, scale] of jobs) {
    await pg.setViewportSize({ width: size, height: size });
    // maskable icons keep the artwork inside the central safe zone and bleed the background to the edge
    const inner = scale === 1 ? `<img style="width:100%;height:100%" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}">`
      : `<div style="position:absolute;inset:0;background:#12184A"></div><img style="position:absolute;left:${(1 - scale) / 2 * 100}%;top:${(1 - scale) / 2 * 100}%;width:${scale * 100}%;height:${scale * 100}%" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}">`;
    await pg.setContent(`<body style="margin:0;position:relative;width:${size}px;height:${size}px;overflow:hidden">${inner}</body>`);
    await pg.screenshot({ path: path.join(out, name) });
  }
  await b.close();
})();
