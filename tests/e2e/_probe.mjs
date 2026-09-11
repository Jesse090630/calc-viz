import { chromium } from 'playwright-core';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, extname } from 'node:path';
const DIST = '/sessions/loving-charming-fermat/mnt/dev/calc-viz/dist';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };
const s = createServer((req, res) => { const rel = decodeURIComponent((req.url ?? '/').split('?')[0]); let f = join(DIST, rel === '/' ? 'index.html' : rel); if (!existsSync(f) || statSync(f).isDirectory()) f = join(DIST, 'index.html'); res.writeHead(200, { 'Content-Type': MIME[extname(f)] ?? 'application/octet-stream' }); res.end(readFileSync(f)); });
const PORT = Number(process.env.PORT ?? 4201);
await new Promise((r) => s.listen(PORT, r));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto(`http://localhost:${PORT}/#/geometric-series`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1000);
console.log(JSON.stringify(await p.evaluate(() => {
  const grid = document.querySelector('section .grid');
  const scroller = document.querySelector('[data-panel="shift"] .overflow-x-auto');
  const q = (k) => { const e = document.querySelector(`[data-readout="${k}"]`); const r = e.getBoundingClientRect(); return { text: e.textContent, right: Math.round(r.right) }; };
  return {
    vw: innerWidth,
    grid: Math.round(grid.getBoundingClientRect().width),
    cols: [...grid.children].map((c) => Math.round(c.getBoundingClientRect().right)),
    scroller: { client: scroller.clientWidth, scroll: scroller.scrollWidth, scrollable: scroller.scrollWidth > scroller.clientWidth },
    byAdding: q('by-adding'), byFormula: q('by-formula'),
  };
}), null, 1));
await b.close(); s.close();
