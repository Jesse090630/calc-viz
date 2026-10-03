/**
 * 「Theorems and Corollaries」的浏览器专项检查。
 *
 * ⭐⭐⭐ 核心一问:**那条链在屏幕上成立吗?**
 *   图上的每一条箭头都必须对应一条真的被用上的定理,而且点哪个方块就展开哪一条。
 *   图要是只是张插画,这一页就退回成了九条定理的罗列。
 *
 * ⭐⭐ 第二问:**条件说清楚了吗?**
 *   每个条件都必须带一条"去掉它会怎样"。只写条件不写它挡住了什么,等于没写。
 *
 * ⚠️ 期望值手推:
 *   · 中值定理例题:连线斜率 4,c = 2/√3 ≈ 1.154701;
 *   · Cauchy:比值 3/7 ≈ 0.428571,c = 14/9 ≈ 1.555556;
 *   · 线性近似:估计 2.025,上界 1.5625e−4,真实误差 1.54327e−4(必须更小);
 *   · 牛顿法第一步 1 − 1/4 = 0.75,翻车那例循环 0 → 1 → 0 → 1。
 *
 * ⚠️ 死界面自查:九条都点得到;「beyond BC」只出现在介值定理与最值定理上。
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SHOT_DIR ?? join(HERE, 'screenshots');
const DIST = join(HERE, '..', '..', 'dist');
const PORT = Number(process.env.SHOT_PORT ?? 4217);
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

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://localhost:${PORT}/#/theorems`, { waitUntil: 'networkidle' });

const fail = [];
const IDS = ['squeeze', 'ivt', 'evt', 'fermat', 'rolle', 'mvt', 'cauchy', 'linear', 'newton'];
const pick = async (id) => { await page.click(`[data-theorem="${id}"]`); await page.waitForTimeout(140); };
const attr = (sel, n) => page.$eval(sel, (el, k) => el.getAttribute(k), n).catch(() => undefined);
const count = (sel) => page.$$eval(sel, (els) => els.length);
const text = (sel) => page.$eval(sel, (el) => el.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
/** ⚠️ 从 `data-value` 属性上读**原始数**,不读渲染出来的文字。
    显示用科学记数还是定点是排版的事,断言不该跟着它走。 */
const values = () => page.$$eval('[data-value]', (els) => els.map((el) => Number(el.getAttribute('data-value'))));

/* ① 九条都在,都点得到 */
if ((await count('[data-theorem]')) !== 9) fail.push('应该有 9 条定理');
if ((await count('[data-node]')) !== 9) fail.push('图上应该有 9 个方块');
for (const id of IDS) {
  await pick(id);
  if ((await attr(`[data-theorem="${id}"]`, 'data-active')) !== 'yes') fail.push(`${id} 点了没选中`);
  if ((await attr(`[data-node="${id}"]`, 'data-active')) !== 'yes') fail.push(`${id} 选中后图上没跟着高亮`);
}

/* ⭐⭐⭐ ② 图不是插画:点方块也能切换 */
await pick('squeeze');
await page.click('[data-node="cauchy"]');
await page.waitForTimeout(160);
if ((await attr('[data-theorem="cauchy"]', 'data-active')) !== 'yes') {
  fail.push('点图上的方块没切换过去 —— 那张图就只是插画');
}

/* ⚠️⚠️ ②b 方块里的字不许写出方块外面。
   第一版拿正则去削定理名,「Linear Approximation」一个字都没削掉,直接溢出了。
   这里用 getBBox 量真实渲染宽度,而不是数字符。 */
const overflow = await page.evaluate(() => {
  const bad = [];
  for (const g of document.querySelectorAll('[data-node]')) {
    const rect = g.querySelector('rect');
    const label = g.querySelector('text');
    const w = label.getBBox().width;
    const box = +rect.getAttribute('width');
    if (w > box - 8) bad.push(`${label.textContent.trim()} ${w.toFixed(0)}px / 方块 ${box}px`);
  }
  return bad;
});
if (overflow.length) fail.push(`方块里的字写出去了:${overflow.join(' | ')}`);

/* ⚠️ 相邻两列之间要留得下箭头 */
const colGap = await page.evaluate(() => {
  const xs = [...document.querySelectorAll('[data-node] rect')]
    .map((r) => [+r.getAttribute('x'), +r.getAttribute('x') + +r.getAttribute('width')]);
  let worst = Infinity;
  for (const [, aEnd] of xs) {
    for (const [bStart] of xs) {
      const d = bStart - aEnd;
      if (d > 0) worst = Math.min(worst, d);
    }
  }
  return worst;
});
if (colGap < 20) fail.push(`相邻方块只隔 ${colGap.toFixed(1)}px,箭头画不出来`);

/* ⭐⭐ ③ 每条箭头都对应一条真的依赖,而且左右方向画得通 */
const arrows = await page.evaluate(() => {
  const boxes = {};
  for (const g of document.querySelectorAll('[data-node]')) {
    const r = g.querySelector('rect');
    boxes[g.getAttribute('data-node')] = +r.getAttribute('x') + +r.getAttribute('width') / 2;
  }
  return [...document.querySelectorAll('[data-edge]')].map((p) => {
    const [from, to] = p.getAttribute('data-edge').split('-');
    return { from, to, fx: boxes[from], tx: boxes[to] };
  });
});
if (arrows.length < 6) fail.push(`依赖箭头太少(${arrows.length} 条)`);
const WANT = new Set(['evt-rolle', 'fermat-rolle', 'rolle-mvt', 'rolle-cauchy', 'cauchy-linear', 'linear-newton']);
for (const w of WANT) {
  if (!arrows.some((a) => `${a.from}-${a.to}` === w)) fail.push(`少了这条箭头:${w}`);
}
for (const a of arrows) {
  if (!(a.fx < a.tx)) fail.push(`箭头 ${a.from}→${a.to} 不是从左往右,图会绕回来`);
}

/* ⚠️⚠️ ③b 箭头不许从**别的**方块身上压过去。
   方块是不透明的,被盖住一截的箭头会显得像是从那个方块出发的 ——
   第一版 Rolle → Cauchy 正好穿过 MVT,图把依赖关系讲反了。
   这里沿每条路径取样,看有没有点落进非端点的方块里。 */
const through = await page.evaluate(() => {
  const boxes = [...document.querySelectorAll('[data-node]')].map((g) => {
    const r = g.querySelector('rect');
    return {
      id: g.getAttribute('data-node'),
      x0: +r.getAttribute('x'), y0: +r.getAttribute('y'),
      x1: +r.getAttribute('x') + +r.getAttribute('width'),
      y1: +r.getAttribute('y') + +r.getAttribute('height'),
    };
  });
  const bad = [];
  for (const path of document.querySelectorAll('[data-edge]')) {
    const [from, to] = path.getAttribute('data-edge').split('-');
    const len = path.getTotalLength();
    for (let i = 0; i <= 60; i += 1) {
      const pt = path.getPointAtLength((len * i) / 60);
      let hit = false;
      for (const b of boxes) {
        if (b.id === from || b.id === to) continue;
        if (pt.x >= b.x0 && pt.x <= b.x1 && pt.y >= b.y0 && pt.y <= b.y1) {
          bad.push(`${from}\u2192${to} 穿过 ${b.id}`);
          hit = true;
          break;
        }
      }
      if (hit) break;
    }
  }
  return [...new Set(bad)];
});
if (through.length) fail.push(`箭头从别的方块身上压过去了:${through.join(' | ')}`);

/* ⭐⭐ ④ 每个条件都带"去掉它会怎样" */
for (const id of IDS) {
  await pick(id);
  const conds = await count('[data-condition]');
  const withouts = await count('[data-without]');
  if (conds < 2) fail.push(`${id} 的条件少于 2 条`);
  if (withouts !== conds) fail.push(`${id} 有 ${conds} 个条件却只有 ${withouts} 条"去掉它会怎样"`);
  if ((await count('[data-step]')) < 4) fail.push(`${id} 的证明少于 4 步`);
  if ((await count('[data-line]')) < 3) fail.push(`${id} 的例题少于 3 行`);
  if ((await text('[data-answer]')).length < 40) fail.push(`${id} 的例题没有结论`);
}

/* ⚠️ ⑤ 「beyond BC」只出现在介值定理和最值定理上 */
const gaps = {};
for (const id of IDS) {
  await pick(id);
  gaps[id] = await count('[data-gap="yes"]');
}
for (const id of IDS) {
  const want = (id === 'ivt' || id === 'evt') ? 1 : 0;
  if (want === 1 && gaps[id] < 1) fail.push(`${id} 的证明里应该标出用到完备性的那一步`);
  if (want === 0 && gaps[id] !== 0) fail.push(`${id} 的证明不该出现「beyond BC」标记`);
}
// 而且那两条上要把完备性是什么讲清楚
for (const id of ['ivt', 'evt']) {
  await pick(id);
  const t = await text('[data-rests]');
  if (!t.includes('least upper bound')) fail.push(`${id} 没说清完备性说的是什么`);
  if (!t.toLowerCase().includes('rational')) fail.push(`${id} 没说有理数上会怎样`);
}
// ⭐ 顺着链下来的那些,要说明自己是**间接**靠着它
await pick('mvt');
const indirect = await text('[data-rests]');
if (!indirect.includes('at one remove')) fail.push('中值定理没说明它是间接依赖完备性的');
if (indirect.includes('least upper bound')) fail.push('中值定理不该照抄"直接用到完备性"那段话');
// 而夹逼和费马根本不该出现这一段
for (const id of ['squeeze', 'fermat']) {
  await pick(id);
  if ((await count('[data-rests]')) !== 0) fail.push(`${id} 不靠完备性,不该出现那一段`);
}

/* ⭐ ⑥ 手推的数字 */
await pick('mvt');
let v = await values();
if (!v.includes(4)) fail.push(`中值定理的连线斜率应该是 4,读到 ${JSON.stringify(v)}`);
if (!v.some((x) => Math.abs(x - 2 / Math.sqrt(3)) < 1e-5)) fail.push('中值定理没给出 c = 2/√3');

await pick('cauchy');
v = await values();
if (!v.some((x) => Math.abs(x - 3 / 7) < 1e-5)) fail.push('Cauchy 没给出比值 3/7');
if (!v.some((x) => Math.abs(x - 14 / 9) < 1e-5)) fail.push('Cauchy 没给出 c = 14/9');

await pick('linear');
v = await values();
if (!v.some((x) => Math.abs(x - 2.025) < 1e-9)) fail.push('线性近似没给出估计值 2.025');
const bound = v.find((x) => Math.abs(x - 1.5625e-4) < 1e-12);
const err = v.find((x) => Math.abs(x - 1.543269e-4) < 1e-9);
if (bound === undefined) fail.push('线性近似没给出误差上界');
if (err === undefined) fail.push('线性近似没给出真实误差');
// ⭐⭐ 整条的分量所在:上界必须真的罩得住
if (bound !== undefined && err !== undefined && !(err < bound)) {
  fail.push(`真实误差 ${err} 没被上界 ${bound} 罩住 —— 那这条定理就说错了`);
}

await pick('newton');
v = await values();
if (!v.includes(1) || !v.includes(0.75)) fail.push('牛顿法没给出 x₀ = 1 和 x₁ = 0.75');
if (!v.some((x) => Math.abs(x - 0.6823278) < 1e-6)) fail.push('牛顿法没收敛到那个根');
// ⚠️ 翻车那一例必须真的在 0 和 1 之间打转
const newtonText = await text('[data-panel="example"]');
if (!newtonText.includes('cycles')) fail.push('牛顿法那一屏没写明翻车的例子会循环');

await pick('ivt');
v = await values();
if (!v.includes(-1) || !v.includes(1)) fail.push('介值定理没给出 f(0) = −1 和 f(1) = 1');
// ⭐ 介值定理和牛顿法追的是同一个根 —— 这一条把两页串起来
if (!v.some((x) => Math.abs(x - 0.6823278) < 1e-6)) fail.push('介值定理那屏没给出同一个根');

await pick('evt');
v = await values();
if (!v.some((x) => Math.abs(x - 18) < 1e-3)) fail.push('最值定理没给出最大值 18');
if (!v.some((x) => Math.abs(x + 2) < 1e-3)) fail.push('最值定理没给出最小值 −2');

/* ⑦ 站内链接只在挂了课的那几条上出现,而且指得对 */
let links = 0;
for (const id of IDS) {
  await pick(id);
  const n = await count('[data-lesson-link]');
  links += n;
  if (n > 0) {
    const href = await attr('[data-lesson-link]', 'href');
    if (!href.startsWith('#/')) fail.push(`${id} 的课程链接不对:${href}`);
  }
}
if (links < 4) fail.push(`挂课程链接的太少(${links} 条)`);

/* ⑧ 公式真的渲染了,不是一串 TeX 源码 */
/* ⚠️ 必须用 `innerText` 而不是 `textContent`:KaTeX 会把原始 TeX 塞进一个隐藏的
   `<annotation>` 里,`textContent` 连它一起读出来,于是这条检查会在页面完全正常时翻红。
   这个坑 CLAUDE.md 里记过一次,这次是在浏览器脚本里又踩了一遍。 */
await pick('mvt');
const body = await page.$eval('main', (el) => el.innerText.replace(/\s+/g, ' '));
for (const bad of ['\\frac', '\\quad', '\\Longrightarrow', '\\sum']) {
  if (body.includes(bad)) fail.push(`页面上出现了 TeX 源码:${bad}`);
}
if ((await count('.katex')) < 1) fail.push('没有任何公式被 KaTeX 渲染');

/* ⑨ 溢出与手机 */
const over = () => page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
await page.screenshot({ path: join(OUT, 'theorems-1280.png'), fullPage: true });
const wide = await over();
await page.setViewportSize({ width: 390, height: 900 });
await page.waitForTimeout(240);
await page.screenshot({ path: join(OUT, 'theorems-390.png'), fullPage: true });
const narrow = await over();
if (wide > 0 || narrow > 0) fail.push(`横向溢出 桌面 ${wide} / 390 ${narrow}`);
if (errors.length) fail.push(`控制台报错:${errors.join(' | ')}`);

await browser.close(); server.close();
console.log(fail.length ? '✗\n  ' + fail.join('\n  ') : '✓ theorems:链上每条箭头都是真依赖、条件都带反例、完备性只标在该标的两处,数字全对,无溢出无报错');
process.exit(fail.length ? 1 : 0);
