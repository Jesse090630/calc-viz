/**
 * 「Two Nailed Disks」的浏览器专项检查。
 *
 * ⭐⭐⭐ 核心一问:**「角速度恒定 ⇒ 面积变化率恒定」这句话被画面否掉了吗?**
 *   `dα/dt` 的读数必须从头到尾纹丝不动,而 `dA/dt` 必须一路掉到 0。
 *   两个数并排摆着,那句话才站不住 —— 只写一行字是不够的。
 *
 * ⭐⭐ 第二问:**那张图是真的几何,还是示意图?**
 *   阴影轮廓的鞋带面积、闭式面积、圆心距公式三个读数必须一致;
 *   而且阴影的每个顶点都必须落在某一个圆上。
 *
 * ⚠️ 期望值手推(r = 1):
 *   · α = 90°:A = π/2 + 1 ≈ 2.5708,dA/dt = 0.5·(1+0) = 0.5;
 *   · α = 180°:A = π ≈ 3.1416(整盘),dA/dt = 0;
 *   · α = 0°:A = 0,dA/dt = 0.5·2 = 1(最快就在起点);
 *   · 圆心角 θ = 180° − α,弦把 α 平分成 α/2。
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SHOT_DIR ?? join(HERE, 'screenshots');
const DIST = join(HERE, '..', '..', 'dist');
const PORT = Number(process.env.SHOT_PORT ?? 4222);
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
page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });
await page.goto(`http://localhost:${PORT}/#/rotating-disks`, { waitUntil: 'networkidle' });

const fail = [];
const setAlpha = async (deg) => {
  await page.$eval('input[type="range"]', (el, v) => {
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(el, String(v));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, deg);
  await page.waitForTimeout(140);
};
const read = (k) => page.$eval(`[data-readout="${k}"]`, (el) => el.textContent.trim()).catch(() => undefined);
const num = async (k) => Number((await read(k)).replace(/[^0-9.\-]/g, ''));
const count = (sel) => page.$$eval(sel, (els) => els.length);
const attr = (sel, n) => page.$eval(sel, (el, k) => el.getAttribute(k), n).catch(() => undefined);

/* ① 论点前置:要打掉的那句话 */
const trap = await page.$eval('[data-panel="trap"]', (el) => el.textContent).catch(() => '');
if (!trap.toLowerCase().includes('constant')) fail.push('没把「角速度恒定」那句话摆出来');
if (!trap.includes('1 + cos')) fail.push('没给出 (1 + cos α) 这个因子');

/* ⚠️⚠️ 两个端点必须**真的滑得到**。
   第一版滑块按弧度走,`180 × (π/180)` 在浮点下比 π 大一点点,
   最后一档被判越界 —— 最远只到 179°,而 `α = 180°`(dA/dt 恰好为 0)
   正是这一课的落点,却成了走不到的状态。 */
for (const [deg, want] of [[0, '0.0°'], [180, '180.0°']]) {
  await setAlpha(deg);
  const shown = await read('alpha');
  if (shown !== want) fail.push(`滑块滑不到 ${deg}°(显示「${shown}」)—— 那是个走不到的状态`);
}
await setAlpha(180);
if ((await num('rate')) !== 0) fail.push('α = 180° 时 dA/dt 必须**恰好**是 0,不是接近 0');

/* ② ⭐⭐⭐ 两个率:一个不动,一个在掉 */
const omegas = [];
const rates = [];
for (const d of [0, 45, 90, 135, 180]) {
  await setAlpha(d);
  omegas.push(await read('omega'));
  rates.push(await num('rate'));
}
if (new Set(omegas).size !== 1) fail.push(`dα/dt 竟然变了:${JSON.stringify(omegas)}`);
if (omegas[0] !== '0.500') fail.push(`dα/dt 应该读作 0.500,实际「${omegas[0]}」`);
for (let i = 1; i < rates.length; i += 1) {
  if (!(rates[i] < rates[i - 1] + 1e-9)) fail.push(`dA/dt 在 ${i} 处没有继续下降`);
}
// 手推值
if (Math.abs(rates[0] - 1) > 1e-3) fail.push(`α=0 时 dA/dt 应为 1,读到 ${rates[0]}`);
if (Math.abs(rates[2] - 0.5) > 1e-3) fail.push(`α=90° 时 dA/dt 应为 0.5,读到 ${rates[2]}`);
if (Math.abs(rates[4]) > 1e-3) fail.push(`α=180° 时 dA/dt 应为 0,读到 ${rates[4]}`);
// ⭐ 起点最快
if (!(rates[0] >= Math.max(...rates) - 1e-9)) fail.push('最快的不是起点 —— 这一课的反直觉点没了');

/* ③ ⭐⭐ 三条路径的面积读数必须一致 */
for (const d of [20, 60, 90, 140, 175]) {
  await setAlpha(d);
  const a = await num('area');
  const b = await num('area-alt');
  const c = await num('area-poly');
  if (Math.abs(a - b) > 2e-3) fail.push(`α=${d}°:闭式 ${a} 和圆心距公式 ${b} 对不上`);
  if (Math.abs(a - c) > 5e-3) fail.push(`α=${d}°:闭式 ${a} 和画出来的轮廓 ${c} 对不上 —— 图是假的`);
}
// 手推:α = 90° 时 A = π/2 + 1
await setAlpha(90);
if (Math.abs((await num('area')) - (Math.PI / 2 + 1)) > 1e-3) fail.push('α=90° 的面积不是 π/2 + 1');
await setAlpha(180);
if (Math.abs((await num('area')) - Math.PI) > 1e-3) fail.push('α=180° 时下盘没有整个露出来');

/* ④ 几何读数:θ = 180° − α,弦平分 α */
for (const d of [30, 90, 150]) {
  await setAlpha(d);
  const th = await num('theta');
  const half = await num('half');
  if (Math.abs(th - (180 - d)) > 0.6) fail.push(`α=${d}°:圆心角应为 ${180 - d}°,读到 ${th}°`);
  if (Math.abs(half - d / 2) > 0.6) fail.push(`α=${d}°:弦应把 α 平分成 ${d / 2}°,读到 ${half}°`);
}
// ⚠️ α = 180° 时 M 退回 N,半角没有定义
await setAlpha(180);
if ((await read('half')) !== 'undefined') fail.push('α=180° 时半角应显示 undefined,不该编一个数');

/* ⑤ ⭐⭐ 阴影轮廓的每个顶点都落在某一个圆上 —— 图是算出来的,不是画出来的 */
await setAlpha(70);
const offCircle = await page.evaluate(() => {
  const pts = document.querySelector('[data-shaded]').getAttribute('points')
    .split(' ').map((q) => q.split(',').map(Number));
  const circle = (sel) => document.querySelector(sel).getAttribute('points')
    .split(' ').map((q) => q.split(',').map(Number));
  const fit = (c) => {
    const xs = c.map((p) => p[0]); const ys = c.map((p) => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    return { cx, cy, r: (Math.max(...xs) - Math.min(...xs)) / 2 };
  };
  const a = fit(circle('[data-circle="bottom"]'));
  const b = fit(circle('[data-circle="top"]'));
  let worst = 0;
  for (const [x, y] of pts) {
    const d1 = Math.abs(Math.hypot(x - a.cx, y - a.cy) - a.r);
    const d2 = Math.abs(Math.hypot(x - b.cx, y - b.cy) - b.r);
    worst = Math.max(worst, Math.min(d1, d2));
  }
  return worst;
});
if (offCircle > 1.2) fail.push(`阴影轮廓上有点不在任何一个圆上(最远 ${offCircle.toFixed(2)}px)`);

/* ⑥ 菱形真的是菱形:四条边等长 */
const rhombus = await page.evaluate(() => {
  const pts = document.querySelector('[data-rhombus]').getAttribute('points')
    .split(' ').map((q) => q.split(',').map(Number));
  const sides = pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length];
    return Math.hypot(p[0] - q[0], p[1] - q[1]);
  });
  return { min: Math.min(...sides), max: Math.max(...sides), n: sides.length };
});
if (rhombus.n !== 4) fail.push('菱形不是四个顶点');
if (rhombus.max - rhombus.min > 1) fail.push(`菱形四条边不等长(${rhombus.min.toFixed(1)}–${rhombus.max.toFixed(1)}px)——「四边都是半径」那一步就没有画面作证`);

/* ⑦ 四个点都标出来了,而且标签不许叠在一起 */
await setAlpha(70);
for (const label of ['N', 'O₁', 'O₂', 'M']) {
  if ((await count(`[data-point="${label}"]`)) !== 1) fail.push(`图上没标出 ${label}`);
}
// ⚠️ α = 180° 时 M 并回 N,这时应该只画一个点、写成「M = N」,
//    而不是把两个标签叠成一团("MN" 看起来像渲染故障)。
await setAlpha(180);
if ((await count('[data-point="N = M"]')) !== 1) fail.push('相切时没把 M 和 N 合并标注');
if ((await count('[data-point="M"]')) !== 0) fail.push('相切时还单独画着 M');
// α = 0:两盘完全重合,两个圆心是同一个点
await setAlpha(0);
if ((await count('[data-point="O₁ = O₂"]')) !== 1) fail.push('完全重合时没把两个圆心合并标注');

/* ⚠️ 图里任意两个文字标签都不许压在一起 */
for (const d of [0, 45, 90, 135, 180]) {
  await setAlpha(d);
  const clash = await page.evaluate(() => {
    const svg = document.querySelector('svg');
    const ts = [...svg.querySelectorAll('text')].map((t) => ({
      s: t.textContent.trim(), x: +t.getAttribute('x'), y: +t.getAttribute('y'),
    }));
    const bad = [];
    for (let i = 0; i < ts.length; i += 1) {
      for (let j = i + 1; j < ts.length; j += 1) {
        if (Math.abs(ts[i].x - ts[j].x) < 13 && Math.abs(ts[i].y - ts[j].y) < 11) {
          bad.push(`${ts[i].s}/${ts[j].s}`);
        }
      }
    }
    return bad;
  });
  if (clash.length) fail.push(`α=${d}°:标签叠在一起 ${clash.join(', ')}`);
}

/* ⑧ 八步推导,每步都有「容易错在哪」 */
if ((await count('[data-step]')) !== 8) fail.push('推导应该是 8 步');
if ((await count('[data-watch]')) !== 8) fail.push('每一步都该有「容易错在哪」');
const steps = await page.$eval('[data-panel="steps"]', (el) => el.innerText);
if (!steps.includes('rhombus')) fail.push('没讲菱形那一步(提示其实能证)');
if (!/sin\(π − α\)|sin\(pi/.test(steps) && !steps.includes('+sin α')) {
  fail.push('没提醒 sin(π − α) = +sin α 这个符号坑');
}

/* ⑨ 变化率曲线:ω 那条是平的,dA/dt 那条不是 */
const curveFlat = await page.evaluate(() => {
  const ys = document.querySelector('[data-rate-curve]').getAttribute('points')
    .split(' ').map((q) => +q.split(',')[1]);
  const o = document.querySelector('[data-omega-line]');
  return {
    rateSpread: Math.max(...ys) - Math.min(...ys),
    omegaFlat: Math.abs(+o.getAttribute('y1') - +o.getAttribute('y2')),
  };
});
if (curveFlat.omegaFlat > 0.5) fail.push('ω 那条线不是水平的');
if (curveFlat.rateSpread < 40) fail.push('dA/dt 那条曲线几乎是平的 —— 对比就没了');

/* ⚠️ 这一页面向学生,**屏幕上不许出现中文**。
   注释用中文是这个项目的习惯,但一不小心就会漏进 JSX 文本里 ——
   刚才就漏了一个「计算」。这里直接查渲染出来的文字。 */
await setAlpha(60);
const cjk = await page.evaluate(() => {
  const txt = document.querySelector('main').innerText;
  const hits = txt.match(/[\u4e00-\u9fff]+/g);
  return hits ? [...new Set(hits)].slice(0, 5) : [];
});
if (cjk.length) fail.push(`页面上出现了中文:${cjk.join(' ')}`);

/* ⭐⭐⭐ Given / Need,以及算出来的那个答案 */
if ((await count('[data-given]')) !== 4) fail.push('Given 应该列 4 条');
// ⚠️ r 必须标成常数 —— 把它当变量是这题最典型的翻车
if ((await attr('[data-given="r"]', 'data-kind')) !== 'constant') fail.push('r 没标成常数');
if ((await attr('[data-given="dα/dt"]', 'data-kind')) !== 'constant') fail.push('dα/dt 没标成常数');
if ((await attr('[data-given="α"]', 'data-kind')) !== 'changing') fail.push('α 没标成变量');
if ((await attr('[data-given="A"]', 'data-kind')) !== 'changing') fail.push('A 没标成变量');
if ((await page.$eval('[data-need-symbol]', (e) => e.textContent.trim())) !== 'dA/dt') {
  fail.push('Need 不是 dA/dt');
}
const givenText = await page.$eval('[data-panel="given"]', (e) => e.innerText);
if (!givenText.includes('dr/dt = 0')) fail.push('Given 里没点明 dr/dt = 0');

// ⭐ 手推:α = 60° ⇒ cos = 0.5 ⇒ 1+cos = 1.5 ⇒ ×0.5 = 0.75
await setAlpha(60);
const subs = await page.$$eval('[data-sub-value]', (els) =>
  els.map((e) => Number(e.getAttribute('data-sub-value'))));
if (subs.length !== 6) fail.push(`代入步骤应有 6 个数,实际 ${subs.length}`);
const want60 = [60, 0.5, 1.5, 0.5, 0.75, 0.75];
for (let i = 0; i < want60.length; i += 1) {
  if (Math.abs(subs[i] - want60[i]) > 1e-6) {
    fail.push(`α=60° 第 ${i + 1} 个代入值应为 ${want60[i]},读到 ${subs[i]}`);
  }
}
const finalText = await page.$eval('[data-final-answer]', (e) => e.textContent.trim());
if (!/0\.7500\s*r²/.test(finalText)) fail.push(`α=60° 的最终答案不对:「${finalText}」`);
if (!finalText.includes('per second')) fail.push('最终答案没给单位');
// ⚠️ 答案必须带 r² —— 题目没给半径,报纯数字是错的
if (!finalText.includes('r²')) fail.push('最终答案漏了 r²');
// 换个角度也得对:α = 0 ⇒ 1.0 r²
await setAlpha(0);
if (!/1\.0000\s*r²/.test(await page.$eval('[data-final-answer]', (e) => e.textContent))) {
  fail.push('α=0 时最终答案应为 1.0000 r²');
}

/* ⑩ 画框与溢出 */
const outside = await page.evaluate(() => {
  const bad = [];
  for (const svg of document.querySelectorAll('svg')) {
    const vb = svg.getAttribute('viewBox');
    if (!vb) continue;
    const [, , w, h] = vb.split(/\s+/).map(Number);
    for (const el of svg.querySelectorAll('polyline, polygon')) {
      for (const q of el.getAttribute('points').split(' ')) {
        const [x, y] = q.split(',').map(Number);
        if (x < -2 || y < -2 || x > w + 2 || y > h + 2) bad.push(q);
      }
    }
  }
  return bad.slice(0, 3);
});
if (outside.length) fail.push(`有东西画到画框外:${outside.join(' ')}`);

await setAlpha(70);
const over = () => page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
await page.screenshot({ path: join(OUT, 'rotating-disks-1280.png'), fullPage: true });
const wide = await over();
await page.setViewportSize({ width: 390, height: 900 });
await page.waitForTimeout(240);
await page.screenshot({ path: join(OUT, 'rotating-disks-390.png'), fullPage: true });
const narrow = await over();
if (wide > 0 || narrow > 0) fail.push(`横向溢出 桌面 ${wide} / 390 ${narrow}`);
if (errors.length) fail.push(`控制台报错:${errors.join(' | ')}`);

await browser.close(); server.close();
console.log(fail.length ? '✗\n  ' + fail.join('\n  ') : '✓ rotating-disks:ω 不动而 dA/dt 掉到 0、三条面积路径一致、阴影轮廓真在圆上、菱形四边等长,无溢出无报错');
process.exit(fail.length ? 1 : 0);
