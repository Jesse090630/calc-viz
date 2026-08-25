/**
 * 「Limit vs Function Value」的浏览器专项检查。
 *
 * ⭐⭐ 唯一真正要证的事:**把 f(1) 拖遍整个范围,极限读数一次都不许变。**
 * 状态从 `data-*` 读,期望值在本文件里另写。
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SHOT_DIR ?? join(HERE, 'screenshots');
const DIST = join(HERE, '..', '..', 'dist');
const PORT = Number(process.env.SHOT_PORT ?? 4197);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

const server = await new Promise((resolve) => {
  const s = createServer((req, res) => {
    const rel = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = join(DIST, rel === '/' ? 'index.html' : rel);
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  s.listen(PORT, () => resolve(s));
});
const URL = `http://localhost:${PORT}/#/limit-vs-value`;

/** 独立重写:除了 x = 1,这条函数就是 x + 1。 */
const f = (x) => x + 1;
const EPS = 1.1e-3;

mkdirSync(OUT, { recursive: true });
const errors = [];
const note = (m) => errors.push(m);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 2 });
page.on('console', (m) => { if (m.type() === 'error') note(`console: ${m.text()}`); });
page.on('pageerror', (e) => note(`pageerror: ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-panel="contrast"]', { timeout: 20000 });

const read = () =>
  page.evaluate(() => {
    const c = document.querySelector('[data-panel="contrast"]');
    const pick = (side, which) => document.querySelector(`[data-side="${side}"] [data-readout="${which}"]`)?.textContent?.trim();
    const point = document.querySelector('[role="slider"][aria-label="value of f at 1"]');
    return {
      limit: c?.getAttribute('data-limit'),
      value: c?.getAttribute('data-value'),
      same: c?.getAttribute('data-same'),
      mode: document.querySelector('[role="tab"][aria-selected="true"][data-mode]')?.getAttribute('data-mode'),
      pointY: point ? Number(point.getAttribute('aria-valuenow')) : null,
      lx: pick('left', 'x'), ly: pick('left', 'y'),
      rx: pick('right', 'x'), ry: pick('right', 'y'),
      text: document.body.innerText,
    };
  });

/* ── ① hole 模式:f(1) 没有值,极限是 2 ─────────────────────────── */
{
  const s = await read();
  if (s.mode !== 'hole') note(`opened in mode "${s.mode}"`);
  if (s.limit !== '2') note(`limit reads "${s.limit}" in hole mode`);
  if (s.value !== 'undefined') note(`f(1) reads "${s.value}" in hole mode`);
  if (/NaN/.test(s.text)) note('NaN leaked onto the page');
  await page.screenshot({ path: join(OUT, 'lvv-1-hole.png') });
}

/* ── ②⭐⭐ isolated 模式:把 f(1) 拖遍整个范围,极限一次都不变 ───── */
await page.locator('[role="tab"][data-mode="isolated"]').click();
await page.waitForTimeout(200);
let samples = 0;
const seenValues = new Set();
{
  const handle = page.getByRole('slider', { name: 'value of f at 1' });
  await handle.focus();
  await page.keyboard.press('Home');
  await page.waitForTimeout(120);
  for (let i = 0; i < 60; i += 1) {
    await page.keyboard.press('Shift+ArrowUp');
    const s = await read();
    samples += 1;
    seenValues.add(s.value);
    // ⭐⭐ 这一条就是整节课
    if (s.limit !== '2') note(`limit changed to "${s.limit}" when f(1) = ${s.value}`);
    if (s.value === 'undefined') note('f(1) reads undefined while a point is placed');
    if (/NaN/.test(s.text)) note(`NaN leaked with f(1) = ${s.value}`);
    // data-same 只在孤立点恰好落在洞上时才是 yes
    const wantSame = Math.abs(Number(s.value) - 2) < 1e-3 ? 'yes' : 'no';
    if (s.same !== wantSame) note(`data-same is "${s.same}" at f(1) = ${s.value}`);
  }
  // 拖动**必须真的改变过** f(1),否则上面几十条断言全是空跑
  if (seenValues.size < 5) note(`f(1) only ever took ${seenValues.size} distinct values — the drag did nothing`);
  await page.screenshot({ path: join(OUT, 'lvv-2-isolated.png') });
}

/* ── ③ 两个走近的点读数与独立公式一致,而且到不了 1 ─────────────── */
{
  await page.locator('[data-action="restart"]').click();
  await page.waitForTimeout(160);
  for (let i = 0; i < 6; i += 1) {
    const s = await read();
    samples += 1;
    for (const [xs, ys, side] of [[s.lx, s.ly, 'left'], [s.rx, s.ry, 'right']]) {
      const x = Number(xs);
      if (side === 'left' && !(x < 1)) note(`left point reached ${x}`);
      if (side === 'right' && !(x > 1)) note(`right point reached ${x}`);
      if (Math.abs(Number(ys) - f(x)) > EPS) note(`${side} at ${x}: page shows ${ys}, formula says ${f(x).toFixed(3)}`);
    }
    await page.locator('[data-action="closer"]').click();
    await page.waitForTimeout(130);
  }
}

/* ── ④ 「放到洞上」之后仍然只是"恰好相等" ─────────────────────── */
{
  await page.locator('[data-action="on-hole"]').click();
  await page.waitForTimeout(200);
  const s = await read();
  if (s.same !== 'yes') note(`data-same is "${s.same}" after putting the point on the hole`);
  if (s.limit !== '2') note(`limit reads "${s.limit}" with the point on the hole`);
  if (s.value !== '2') note(`f(1) reads "${s.value}" with the point on the hole`);
  await page.screenshot({ path: join(OUT, 'lvv-3-on-hole.png') });
}

/* ── ⑤ 洞永远是空心的 ─────────────────────────────────────────── */
{
  // 空心 = fill 是背景色。写死成实心的话这一节的视觉入口就没了。
  const holeFilled = await page.evaluate(() => {
    const circles = [...document.querySelectorAll('main svg circle')];
    // 洞画在直线上、半径 6、描边是曲线色
    return circles.some((c) => c.getAttribute('r') === '6' && c.getAttribute('fill') !== '#0b1020' && c.getAttribute('stroke-width') === '2.4');
  });
  if (holeFilled) note('the hole is drawn filled');
}

/* ── ⑥ 文字不重叠、不出框 ─────────────────────────────────────── */
{
  const bad = await page.evaluate(() => {
    const svg = document.querySelector('main svg');
    const vb = svg.viewBox.baseVal;
    const boxes = [...svg.querySelectorAll('text')].map((t) => ({ t: t.textContent.trim(), b: t.getBBox() }));
    const out = [];
    for (const { t, b } of boxes) {
      if (b.x < vb.x - 0.5 || b.x + b.width > vb.x + vb.width + 0.5 || b.y < vb.y - 0.5 || b.y + b.height > vb.y + vb.height + 0.5) out.push(`outside: "${t}"`);
    }
    for (let a = 0; a < boxes.length; a += 1) {
      for (let c = a + 1; c < boxes.length; c += 1) {
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
console.log(`sampled ${samples} states, f(1) took ${seenValues.size} distinct values`);
if (errors.length) {
  console.error('✗\n' + errors.slice(0, 20).map((e) => '  ' + e).join('\n') + (errors.length > 20 ? `\n  … and ${errors.length - 20} more` : ''));
  process.exit(1);
}
console.log('✓ limit vs function value clean');
