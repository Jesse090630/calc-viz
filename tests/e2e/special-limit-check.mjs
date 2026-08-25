/**
 * 「Why sin x / x → 1」的浏览器专项检查。
 * ⭐⭐ 三件事:几何不等式一路成立、比值一路夹在 [cos θ, 1] 里、
 *     以及**角度制那个不同的答案**确实摆了出来。
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SHOT_DIR ?? join(HERE, 'screenshots');
const DIST = join(HERE, '..', '..', 'dist');
const PORT = 4205;
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
const URL = `http://localhost:${PORT}/#/sin-over-x`;

mkdirSync(OUT, { recursive: true });
const errors = [];
const note = (m) => errors.push(m);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 2 });
page.on('console', (m) => { if (m.type() === 'error') note(`console: ${m.text()}`); });
page.on('pageerror', (e) => note(`pageerror: ${e.message}`));
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-panel="geometry"]');

const read = () => page.evaluate(() => {
  const g = document.querySelector('[data-panel="geometry"]');
  const s = document.querySelector('[data-panel="squeeze"]');
  const num = (root, w) => Number(root?.querySelector(`[data-readout="${w}"]`)?.textContent?.trim());
  return {
    theta: Number(document.querySelector('[data-readout="theta"]')?.textContent?.trim()),
    sin: num(g, 'sin'), arc: num(g, 'arc'), tan: num(g, 'tan'), holds: g?.getAttribute('data-holds'),
    cos: num(s, 'cos'), ratio: num(s, 'ratio'), within: s?.getAttribute('data-within'),
    limit: document.querySelector('[data-panel="result"]')?.getAttribute('data-limit'),
    revealed: Number(document.querySelector('[data-panel="algebra"]')?.getAttribute('data-revealed')),
    degrees: document.querySelector('[data-panel="radians"]')?.getAttribute('data-open'),
    degreeLimit: Number(document.querySelector('[data-panel="radians"]')?.getAttribute('data-degree-limit')),
    text: document.body.innerText,
  };
});

const setTheta = (v) => page.evaluate((v) => {
  const el = document.querySelector('input[aria-label="theta"]');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, String(v));
  el.dispatchEvent(new Event('input', { bubbles: true }));
}, v);

let samples = 0;
const ratios = [];
for (const t of [1.2, 1.0, 0.8, 0.5, 0.3, 0.15, 0.08, 0.04, 0.02]) {
  await setTheta(t);
  await page.waitForTimeout(50);
  const s = await read();
  samples += 1;
  // ⭐ 几何不等式:sin θ < θ < tan θ,用页面读数直接查
  if (!(s.sin < s.arc && s.arc < s.tan)) note(`θ=${s.theta}: ${s.sin} < ${s.arc} < ${s.tan} is false`);
  if (s.holds !== 'yes') note(`θ=${s.theta}: data-holds is ${s.holds}`);
  // ⚠️ 弧长必须**等于** θ —— 换成角度就不成立,那是整节课的关键
  if (Math.abs(s.arc - s.theta) > 5e-4) note(`θ=${s.theta}: arc reads ${s.arc}, should equal theta`);
  // ⭐ 夹逼
  if (!(s.cos <= s.ratio + 1e-6 && s.ratio <= 1 + 1e-6)) note(`θ=${s.theta}: ratio ${s.ratio} not inside [${s.cos}, 1]`);
  if (s.within !== 'yes') note(`θ=${s.theta}: data-within is ${s.within}`);
  if (s.limit !== '1') note(`the result panel reads ${s.limit}`);
  if (/NaN|Infinity/.test(s.text)) note(`NaN leaked at θ=${s.theta}`);
  ratios.push(s.ratio);
}
for (let i = 1; i < ratios.length; i += 1) {
  if (!(Math.abs(ratios[i] - 1) <= Math.abs(ratios[i - 1] - 1) + 1e-9)) note(`ratio moved away from 1 at step ${i}`);
}
if (!(Math.abs(ratios[ratios.length - 1] - 1) < 1e-4)) note('the ratio never gets close to 1');
await page.screenshot({ path: join(OUT, 'sl-2-tight.png') });

/* 代数一步一步露 */
{
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('[data-panel="algebra"]');
  if ((await read()).revealed !== 1) note('the algebra did not start at one step');
  for (let i = 0; i < 3; i += 1) {
    await page.locator('[data-action="next-step"]').click().catch(() => {});
    await page.waitForTimeout(60);
  }
  const after = await read();
  if (after.revealed !== 3) note(`the algebra stopped at ${after.revealed} steps`);
  await page.screenshot({ path: join(OUT, 'sl-3-algebra.png') });
}

/* ⭐⭐ 角度制那个不同的答案 */
{
  const before = await read();
  if (before.degrees !== 'no') note('the degrees note was already open');
  await page.locator('[data-action="why-radians"]').click();
  await page.waitForTimeout(80);
  const s = await read();
  if (s.degrees !== 'yes') note('the degrees note did not open');
  if (Math.abs(s.degreeLimit - Math.PI / 180) > 1e-6) note(`the degree limit reads ${s.degreeLimit}`);
  if (Math.abs(s.degreeLimit - 1) < 0.5) note('the degree answer is being reported as about 1');
  if (!/RADIANS/.test(s.text)) note('the page never states that theta is in radians');
  await page.screenshot({ path: join(OUT, 'sl-4-radians.png') });
}

/* 文字不出框、不重叠(两张图都查) */
{
  const bad = await page.evaluate(() => {
    const out = [];
    for (const svg of document.querySelectorAll('main svg')) {
      const vb = svg.viewBox.baseVal;
      const boxes = [...svg.querySelectorAll('text')].map((t) => ({ t: t.textContent.trim(), b: t.getBBox() }));
      for (const { t, b } of boxes) if (b.x < vb.x - 0.5 || b.x + b.width > vb.x + vb.width + 0.5 || b.y < vb.y - 0.5 || b.y + b.height > vb.y + vb.height + 0.5) out.push(`outside: "${t}"`);
      for (let a = 0; a < boxes.length; a += 1) for (let c = a + 1; c < boxes.length; c += 1) {
        const A = boxes[a].b, B = boxes[c].b;
        const w = Math.min(A.x + A.width, B.x + B.width) - Math.max(A.x, B.x);
        const h = Math.min(A.y + A.height, B.y + B.height) - Math.max(A.y, B.y);
        if (w > 0 && h > 0 && w * h > Math.min(A.width * A.height, B.width * B.height) * 0.2) out.push(`collide: "${boxes[a].t}" × "${boxes[c].t}"`);
      }
    }
    return out;
  });
  for (const b of [...new Set(bad)]) note(b);
}

await browser.close();
server.close();
console.log(`sampled ${samples} theta values`);
if (errors.length) { console.error('✗\n' + errors.slice(0, 20).map((e) => '  ' + e).join('\n')); process.exit(1); }
console.log('✓ sin x / x clean');
