/**
 * 「From Secant to Tangent」的浏览器专项检查。
 * ⭐⭐ 两件事:割线斜率一路逼近 2a(独立公式核对),
 *     以及 **h = 0 时页面写的是 undefined 而不是某个斜率**。
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SHOT_DIR ?? join(HERE, 'screenshots');
const DIST = join(HERE, '..', '..', 'dist');
const PORT = 4207;
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
const URL = `http://localhost:${PORT}/#/secant-to-tangent`;

/** 独立重写:f(x) = x²,割线斜率 = 2a + h。 */
const expectSlope = (a, h) => 2 * a + h;

mkdirSync(OUT, { recursive: true });
const errors = [];
const note = (m) => errors.push(m);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1150 }, deviceScaleFactor: 2 });
page.on('console', (m) => { if (m.type() === 'error') note(`console: ${m.text()}`); });
page.on('pageerror', (e) => note(`pageerror: ${e.message}`));
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-panel="slope"]');

const set = (name, v) => page.evaluate(({ name, v }) => {
  const el = document.querySelector(`input[aria-label="${name}"]`);
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, String(v));
  el.dispatchEvent(new Event('input', { bubbles: true }));
}, { name, v });

const read = () => page.evaluate(() => {
  const p = document.querySelector('[data-panel="slope"]');
  const r = (w) => p?.querySelector(`[data-readout="${w}"]`)?.textContent?.trim();
  return {
    a: Number(document.querySelector('[data-readout="a"]')?.textContent?.trim()),
    h: Number(r('h')), slope: r('slope'), gap: Number(r('gap')),
    tangentish: p?.getAttribute('data-tangentish'),
    derivative: document.querySelector('[data-panel="limit"]')?.getAttribute('data-derivative'),
    whyZero: document.querySelector('[data-panel="why"]')?.textContent ?? '',
    text: document.body.innerText,
  };
});

let samples = 0;
for (const a of [1, 0.5, 1.5, -1]) {
  await set('a', a);
  const seenLabels = new Set();
  const gaps = [];
  for (const h of [2, 1, 0.5, 0.1, 0.01]) {
    await set('h', h);
    await page.waitForTimeout(45);
    const s = await read();
    samples += 1;
    const want = expectSlope(s.a, s.h);
    if (Math.abs(Number(s.slope) - want) > 2e-3) note(`a=${s.a} h=${s.h}: slope reads ${s.slope}, formula says ${want.toFixed(4)}`);
    if (Math.abs(s.gap - s.h) > 2e-3) note(`a=${s.a} h=${s.h}: gap reads ${s.gap}, should equal h`);
    if (s.derivative !== String(2 * s.a)) note(`a=${s.a}: derivative panel reads ${s.derivative}`);
    if (/NaN|Infinity/.test(s.text)) note(`NaN leaked at a=${s.a} h=${s.h}`);
    seenLabels.add(s.tangentish);
    gaps.push(s.gap);
  }
  // ⭐ 标签必须真的切换过 —— 否则 SECANT → TANGENT 那一刻没人看得到
  if (seenLabels.size !== 2) note(`a=${a}: the secant/tangent label never switched (${[...seenLabels]})`);
  for (let i = 1; i < gaps.length; i += 1) if (!(gaps[i] < gaps[i - 1])) note(`a=${a}: the gap did not shrink at step ${i}`);
}
await page.screenshot({ path: join(OUT, 'lh-2-tangent.png') });

/* ⭐⭐ h = 0 那句话:必须写 undefined,不许写某个斜率 */
{
  const s = await read();
  if (!/undefined/.test(s.whyZero)) note('the h = 0 panel does not say the slope is undefined');
  if (/h = 0 → slope = [-\d]/.test(s.whyZero)) note('the h = 0 panel prints a number for the slope');
  if (!/0\/0/.test(s.whyZero)) note('the h = 0 panel never mentions 0/0');
  if (!/limit/i.test(s.whyZero)) note('the h = 0 panel never connects this to needing a limit');
}

/* h 滑块到不了 0 */
{
  await set('h', 0);
  await page.waitForTimeout(60);
  const s = await read();
  if (!(s.h > 0)) note(`h reached ${s.h}`);
  if (s.slope === 'undefined') note('the slope went undefined — h should be clamped above zero');
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
      const h = Math.min(A.y + A.height, B.y + B.height) - Math.max(A.y, B.y);
      if (w > 0 && h > 0 && w * h > Math.min(A.width * A.height, B.width * B.height) * 0.2) out.push(`collide: "${boxes[a].t}" × "${boxes[c].t}"`);
    }
    return out;
  });
  for (const b of [...new Set(bad)]) note(b);
}

await browser.close();
server.close();
console.log(`sampled ${samples} (a, h) states`);
if (errors.length) { console.error('✗\n' + errors.slice(0, 20).map((e) => '  ' + e).join('\n')); process.exit(1); }
console.log('✓ secant to tangent clean');
