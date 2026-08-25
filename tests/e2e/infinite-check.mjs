/**
 * 「Infinite Limits / Approach the Wall」的浏览器专项检查。
 * ⭐⭐ 最要紧的一条:页面上**任何地方都不许把 ∞ 当成一个值**。
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SHOT_DIR ?? join(HERE, 'screenshots');
const DIST = join(HERE, '..', '..', 'dist');
const PORT = 4201;
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
const URL = `http://localhost:${PORT}/#/infinite-limits`;

mkdirSync(OUT, { recursive: true });
const errors = [];
const note = (m) => errors.push(m);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 2 });
page.on('console', (m) => { if (m.type() === 'error') note(`console: ${m.text()}`); });
page.on('pageerror', (e) => note(`pageerror: ${e.message}`));
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-panel="side"]');

const read = () => page.evaluate(() => {
  const side = (s) => document.querySelector(`[data-panel="side"][data-side="${s}"]`);
  const r = (s, w) => side(s)?.querySelector(`[data-readout="${w}"]`)?.textContent?.trim();
  return {
    lx: r('left', 'x'), ly: r('left', 'y'), rx: r('right', 'x'), ry: r('right', 'y'),
    lg: side('left')?.getAttribute('data-growth'), rg: side('right')?.getAttribute('data-growth'),
    text: document.body.innerText,
  };
});

/* ① 十档扫下去:每近十倍,输出的量级涨十倍 */
let samples = 0;
const magnitudes = [];
for (let k = 0; k <= 5; k += 1) {
  const s = await read();
  samples += 1;
  const parse = (t) => {
    const m = /^(−?)(\d+(?:\.\d+)?)(?:×10(⁻?)(\d+))?$/.exec(t.replace(/−/g, '−'));
    if (!m) return Number(t);
    const base = Number(m[2]) * (m[1] ? -1 : 1);
    return m[4] ? base * 10 ** (Number(m[4]) * (m[3] ? -1 : 1)) : base;
  };
  const ry = parse(s.ry);
  const ly = parse(s.ly);
  magnitudes.push(Math.abs(ry));
  if (!(ry > 0)) note(`k=${k}: right output is not positive (${s.ry})`);
  if (!(ly < 0)) note(`k=${k}: left output is not negative (${s.ly})`);
  if (Math.abs(Math.abs(ry) - 10 ** k) > 10 ** k * 0.02) note(`k=${k}: right output ${s.ry} is not about 1e${k}`);
  if (s.rg !== 'up' || s.lg !== 'down') note(`k=${k}: growth flags are ${s.lg}/${s.rg}`);
  if (/Infinity|NaN/.test(s.text)) note(`k=${k}: Infinity or NaN leaked onto the page`);
  if (k < 5) { await page.locator('[data-action="closer"]').click(); await page.waitForTimeout(90); }
}
for (let i = 1; i < magnitudes.length; i += 1) {
  if (!(magnitudes[i] > magnitudes[i - 1] * 5)) note(`decade ${i} did not grow by about ten (${magnitudes[i - 1]} → ${magnitudes[i]})`);
}
await page.screenshot({ path: join(OUT, 'inf-2-deep.png') });

/* ②⭐⭐ 措辞:不许把 ∞ 当值 */
{
  const body = await page.evaluate(() => document.body.innerText);
  for (const bad of ['equals infinity', 'is infinity', '= infinity', 'reaches infinity']) {
    if (body.toLowerCase().includes(bad)) note(`the page says "${bad}"`);
  }
  if (!/without bound/i.test(body)) note('the page never says "without bound"');
  // ⚠️ 从属性读,不读 KaTeX 渲染出来的文字。
  const tex = await page.locator('[data-panel="two-sided"]').getAttribute('data-tex');
  const flag = await page.locator('[data-panel="two-sided"]').getAttribute('data-two-sided');
  if (flag !== 'dne') note(`the two-sided panel reports "${flag}"`);
  if (!/does not exist/.test(tex ?? '')) note(`the two-sided tex is "${tex}"`);
  if (/=\s*[+-]?\\infty/.test(tex ?? '')) note('the two-sided line writes the limit as equal to infinity');
}

/* ③ 「给个界」:每个界都能被超过,而且需要的档位递增 */
{
  let previous = -1;
  for (const b of [10, 100, 1000, 1000000]) {
    await page.locator(`[data-bound="${b}"]`).click();
    await page.waitForTimeout(80);
    const needed = Number(await page.locator('[data-panel="bound"]').getAttribute('data-needed'));
    samples += 1;
    if (!Number.isFinite(needed)) note(`bound ${b} produced no decade`);
    if (!(needed > previous)) note(`bound ${b} needed decade ${needed}, not deeper than ${previous}`);
    previous = needed;
  }
  await page.screenshot({ path: join(OUT, 'inf-3-bound.png') });
}

/* ④ 文字不出框、不重叠 */
{
  const bad = await page.evaluate(() => {
    const svg = document.querySelector('main svg');
    const vb = svg.viewBox.baseVal;
    const boxes = [...svg.querySelectorAll('text')].map((t) => ({ t: t.textContent.trim(), b: t.getBBox() }));
    const out = [];
    for (const { t, b } of boxes) {
      if (b.x < vb.x - 0.5 || b.x + b.width > vb.x + vb.width + 0.5 || b.y < vb.y - 0.5 || b.y + b.height > vb.y + vb.height + 0.5) out.push(`outside: "${t}"`);
    }
    for (let a = 0; a < boxes.length; a += 1) for (let c = a + 1; c < boxes.length; c += 1) {
      const A = boxes[a].b, B = boxes[c].b;
      const w = Math.min(A.x + A.width, B.x + B.width) - Math.max(A.x, B.x);
      const h = Math.min(A.y + A.height, B.y + B.height) - Math.max(A.y, B.y);
      if (w > 0 && h > 0 && w * h > Math.min(A.width * A.height, B.width * B.height) * 0.2) out.push(`collide: "${boxes[a].t}" × "${boxes[c].t}"`);
    }
    return out;
  });
  for (const b of [...new Set(bad)]) note(b);
}

await browser.close();
server.close();
console.log(`sampled ${samples} states`);
if (errors.length) { console.error('✗\n' + errors.slice(0, 20).map((e) => '  ' + e).join('\n')); process.exit(1); }
console.log('✓ infinite limits clean');
