/**
 * 「The Squeeze Theorem」的浏览器专项检查。
 * ⭐⭐ 扫描线走一遍,页面上的 g / f / h 必须始终满足 g ≤ f ≤ h,
 *     而且空隙一路收窄。期望值在本文件里另写。
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SHOT_DIR ?? join(HERE, 'screenshots');
const DIST = join(HERE, '..', '..', 'dist');
const PORT = 4203;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = await new Promise((r) => {
  const s = createServer((req, res) => {
    const rel = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = join(DIST, rel === '/' ? 'index.html' : rel);
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  s.listen(PORT, () => r(s));
});
const URL = `http://localhost:${PORT}/#/squeeze`;

/** 独立重写的三条曲线。 */
const L = 1, W = 5;
const g = (x) => L - x * x;
const h = (x) => L + x * x;
const f = (x) => L + x * x * Math.sin(W / x);

mkdirSync(OUT, { recursive: true });
const errors = [];
const note = (m) => errors.push(m);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 2 });
page.on('console', (m) => { if (m.type() === 'error') note(`console: ${m.text()}`); });
page.on('pageerror', (e) => note(`pageerror: ${e.message}`));
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-panel="scan"]');

const read = () => page.evaluate(() => {
  const p = document.querySelector('[data-panel="scan"]');
  const r = (w) => p?.querySelector(`[data-readout="${w}"]`)?.textContent?.trim();
  return {
    x: Number(r('x')), g: Number(r('g')), f: Number(r('f')), h: Number(r('h')),
    gap: Number(r('gap')), ordered: p?.getAttribute('data-ordered'),
    limit: document.querySelector('[data-panel="verdict"]')?.getAttribute('data-limit'),
    trapped: document.querySelector('[data-panel="verdict"]')?.getAttribute('data-trapped'),
    text: document.body.innerText,
  };
});

let samples = 0;
const gaps = [];
for (let i = 0; i < 9; i += 1) {
  const s = await read();
  samples += 1;
  if (Math.abs(s.g - g(s.x)) > 2e-4) note(`x=${s.x}: g reads ${s.g}, formula says ${g(s.x).toFixed(4)}`);
  if (Math.abs(s.h - h(s.x)) > 2e-4) note(`x=${s.x}: h reads ${s.h}, formula says ${h(s.x).toFixed(4)}`);
  if (Math.abs(s.f - f(s.x)) > 2e-4) note(`x=${s.x}: f reads ${s.f}, formula says ${f(s.x).toFixed(4)}`);
  if (!(s.g <= s.f + 1e-9 && s.f <= s.h + 1e-9)) note(`x=${s.x}: order broken (${s.g} ≤ ${s.f} ≤ ${s.h})`);
  if (s.ordered !== 'yes') note(`x=${s.x}: data-ordered is ${s.ordered}`);
  if (s.limit !== '1') note(`the limit reads ${s.limit}`);
  if (s.trapped !== 'yes') note('the verdict says not trapped');
  if (/NaN|Infinity/.test(s.text)) note(`NaN or Infinity leaked at x=${s.x}`);
  gaps.push(s.gap);
  await page.locator('[data-action="closer"]').click();
  await page.waitForTimeout(80);
}
for (let i = 1; i < gaps.length; i += 1) {
  if (!(gaps[i] < gaps[i - 1])) note(`the gap did not shrink on step ${i} (${gaps[i - 1]} → ${gaps[i]})`);
}
if (!(gaps[gaps.length - 1] < gaps[0] / 100)) note('the gap barely moved across the whole run');
await page.screenshot({ path: join(OUT, 'sq-2-tight.png') });

/* ⭐ 中间那条**确实在摆动** —— 否则这一节没有存在的理由 */
{
  const signs = new Set();
  for (let i = 0; i < 400; i += 1) {
    const x = 0.06 - (0.05 * i) / 400;
    signs.add(Math.sign(f(x) - L));
  }
  if (signs.size < 2) note('the middle curve does not oscillate near zero — the lesson has no reason to exist');
}

/* 文字不出框、不重叠 */
{
  const bad = await page.evaluate(() => {
    const svg = document.querySelector('main svg');
    const vb = svg.viewBox.baseVal;
    const boxes = [...svg.querySelectorAll('text')].map((t) => ({ t: t.textContent.trim(), b: t.getBBox() }));
    const out = [];
    for (const { t, b } of boxes) if (b.x < vb.x - 0.5 || b.x + b.width > vb.x + vb.width + 0.5 || b.y < vb.y - 0.5 || b.y + b.height > vb.y + vb.height + 0.5) out.push(`outside: "${t}"`);
    for (let a = 0; a < boxes.length; a += 1) for (let c = a + 1; c < boxes.length; c += 1) {
      const A = boxes[a].b, B = boxes[c].b;
      const w = Math.min(A.x + A.width, B.x + B.width) - Math.max(A.x, B.x);
      const hh = Math.min(A.y + A.height, B.y + B.height) - Math.max(A.y, B.y);
      if (w > 0 && hh > 0 && w * hh > Math.min(A.width * A.height, B.width * B.height) * 0.2) out.push(`collide: "${boxes[a].t}" × "${boxes[c].t}"`);
    }
    return out;
  });
  for (const b of [...new Set(bad)]) note(b);
}

await browser.close();
server.close();
console.log(`sampled ${samples} scanner positions`);
if (errors.length) { console.error('✗\n' + errors.slice(0, 20).map((e) => '  ' + e).join('\n')); process.exit(1); }
console.log('✓ squeeze clean');
