/**
 * 「Mean Value Theorem」的浏览器专项检查。
 *
 * ⚠️ 期望值手推:
 *   · `x³ − 3x` 在 `[−2, 2]`:连线斜率 `(2 − (−2))/4 = 1`,
 *     `3x² − 3 = 1 ⇒ x = ±2/√3 ≈ ±1.1547`,**两个** c;
 *   · `x² − 1` 在 `[−1, 1]`:连线水平,c = 0;
 *   · `|x|`、`x^{2/3}`、端点跳跃这三个:一个 c 都没有。
 *
 * ⭐⭐ 核心一问:**"找不到 c"这件事,在屏幕上看得见吗?**
 *   光写一句"定理不适用"没用 —— 学生要能在 f′ 那张图上
 *   亲眼看到曲线穿不过那条水平线。所以这里逐条检查:
 *   绿点的个数、判定条的措辞、以及滑块停在尖点上时读数说不说 "undefined"。
 *
 * ⚠️ 死界面自查:三种判定必须都能从按钮点到,
 *   "差商编答案"那一块也必须真的出现过,不能是写了没路的装饰。
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SHOT_DIR ?? join(HERE, 'screenshots');
const DIST = join(HERE, '..', '..', 'dist');
const PORT = Number(process.env.SHOT_PORT ?? 4213);
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
const URL = `http://localhost:${PORT}/#/mvt`;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(URL, { waitUntil: 'networkidle' });

const fail = [];
const pick = async (id) => { await page.click(`[data-case="${id}"]`); await page.waitForTimeout(120); };
const attr = (sel, name) => page.$eval(sel, (el, n) => el.getAttribute(n), name).catch(() => undefined);
const count = (sel) => page.$$eval(sel, (els) => els.length);
const read = (k) => page.$eval(`[data-readout="${k}"]`, (el) => el.textContent.trim()).catch(() => undefined);

/* ① 论点前置:两条前提,闭和开分得清 */
const needs = await count('[data-need]');
if (needs !== 2) fail.push(`前提应该列 2 条,实际 ${needs}`);
const needsText = await page.$eval('[data-panel="needs"]', (el) => el.textContent).catch(() => '');
for (const w of ['closed', 'open']) {
  if (!needsText.includes(w)) fail.push(`前提面板没提到「${w}」——"为什么一个闭一个开"是这一课的题眼`);
}

/* ② 五个情形逐个走一遍,判定与 c 的个数都要对 */
const WANT = {
  cubic: { verdict: 'applies', cs: 2 },
  rolle: { verdict: 'applies', cs: 1 },
  abs: { verdict: 'no-derivative', cs: 0 },
  cusp: { verdict: 'no-derivative', cs: 0 },
  jump: { verdict: 'no-continuity', cs: 0 },
};
const seenVerdicts = new Set();
for (const [id, want] of Object.entries(WANT)) {
  await pick(id);
  if ((await attr(`[data-case="${id}"]`, 'data-active')) !== 'yes') fail.push(`${id} 点了没选中`);
  const v = await attr('[data-verdict]', 'data-verdict');
  seenVerdicts.add(v);
  if (v !== want.verdict) fail.push(`${id} 判定应为 ${want.verdict},实际 ${v}`);
  const n = Number(await attr('[data-verdict]', 'data-c-count'));
  if (n !== want.cs) fail.push(`${id} 应该有 ${want.cs} 个 c,实际 ${n}`);
  // 图上的绿点数必须和判定条上的数字一致 —— 文字和画面不许打架
  const dots = await count('[data-c-mark]');
  const crosses = await count('[data-c-cross]');
  if (dots !== want.cs) fail.push(`${id} f 图上有 ${dots} 个 c,判定条说 ${want.cs}`);
  if (crosses !== want.cs) fail.push(`${id} f′ 图上有 ${crosses} 个交点,判定条说 ${want.cs}`);
  // 说明文字得是真话,不是占位
  const note = await page.$eval('[data-note="case"]', (el) => el.textContent.trim()).catch(() => '');
  if (note.length < 80) fail.push(`${id} 的说明太短(${note.length} 字)`);
}
// ⚠️ 死界面自查:三种判定分支都真的出现过
for (const v of ['applies', 'no-derivative', 'no-continuity']) {
  if (!seenVerdicts.has(v)) fail.push(`判定分支「${v}」从界面上走不到`);
}

/* ③ 手推的那两个 c(只能间接验:切线必须和连线平行) */
await pick('cubic');
const parallel = await page.evaluate(() => {
  const mark = document.querySelectorAll('[data-c-mark] line');
  const chord = document.querySelector('[data-chord="line"]');
  if (!chord || mark.length === 0) return null;
  const slope = (l) => {
    const y1 = +l.getAttribute('y1'); const y2 = +l.getAttribute('y2');
    const x1 = +l.getAttribute('x1'); const x2 = +l.getAttribute('x2');
    return (y2 - y1) / (x2 - x1);
  };
  const want = slope(chord);
  return [...mark].map((l) => Math.abs(slope(l) - want));
});
if (!parallel || parallel.length !== 2) fail.push('cubic 上应该画出两条平行切线');
else for (const d of parallel) {
  // ⭐ 这一课的结论就是"平行"。画歪了,整页白讲。
  if (d > 1e-6) fail.push(`切线和连线不平行,屏幕斜率差 ${d}`);
}

/* ④ 反例上,f′ 曲线确实穿不过那条水平线 */
for (const id of ['abs', 'cusp', 'jump']) {
  await pick(id);
  const straddles = await page.evaluate(() => {
    const target = document.querySelector('[data-target="line"]');
    if (!target) return null;
    const y = +target.getAttribute('y1');
    const runs = [...document.querySelectorAll('[data-df]')];
    if (runs.length === 0) return null;
    // 任何一段 polyline 里出现 y 值跨过 target 的相邻两点,就算穿过去了
    return runs.some((r) => {
      const ys = r.getAttribute('points').split(' ').map((p) => +p.split(',')[1]);
      for (let i = 1; i < ys.length; i += 1) {
        if ((ys[i - 1] - y) * (ys[i] - y) < 0) return true;
      }
      return false;
    });
  });
  if (straddles === null) fail.push(`${id} 的 f′ 图没画出来`);
  if (straddles) fail.push(`${id} 的 f′ 曲线在图上穿过了连线斜率 —— 和"找不到 c"自相矛盾`);
}
// 空转保护:好情形上它**必须**穿过去,否则上面那条检查什么也没证明
await pick('cubic');
const goodStraddles = await page.evaluate(() => {
  const y = +document.querySelector('[data-target="line"]').getAttribute('y1');
  return [...document.querySelectorAll('[data-df]')].some((r) => {
    const ys = r.getAttribute('points').split(' ').map((p) => +p.split(',')[1]);
    for (let i = 1; i < ys.length; i += 1) if ((ys[i - 1] - y) * (ys[i] - y) < 0) return true;
    return false;
  });
});
if (!goodStraddles) fail.push('cubic 的 f′ 曲线没穿过连线斜率 —— 上面那条反例检查是空转的');

/* ⑤ 滑块停在尖点上:读数必须说 undefined,不许给个假数 */
await pick('abs');
await page.$eval('input[type="range"]', (el) => {
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  set.call(el, '0');
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(150);
const atCorner = await read('slope');
if (atCorner !== 'undefined') fail.push(`滑块停在尖点上,斜率读数是「${atCorner}」,应该是 undefined`);
const xAtCorner = await read('x');
if (Number(xAtCorner) !== 0) fail.push(`滑块没能精确停在 0 上(读到 ${xAtCorner})——那个分支就点不到`);
// 挪开之后又该给出真斜率 ±1
await page.$eval('input[type="range"]', (el) => {
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  set.call(el, '0.5');
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(150);
const off = await read('slope');
if (Math.abs(Number(off) - 1) > 1e-9) fail.push(`|x| 在 0.5 处斜率应为 1,读到 ${off}`);

/* ⚠️⚠️ Rolle 那句话必须跟着前提走:前提成立才说"这就是 Rolle",
   前提不成立要说"同一个反例把 Rolle 一起推翻"。
   第一版两边共用一句,在 |x| 那一屏写着"这就是 Rolle"——
   而 Rolle 在那里根本用不了。这一页整篇都在批评这种毛病。 */
for (const [id, want] of [['rolle', 'holds'], ['abs', 'fails'], ['cusp', 'fails'], ['jump', 'fails']]) {
  await pick(id);
  const got = await attr('[data-note="rolle"]', 'data-rolle');
  if (got !== want) fail.push(`${id} 的 Rolle 说明应为「${want}」,实际「${got}」`);
}
// cubic 两端不等高,压根不该出现这一句
await pick('cubic');
if ((await count('[data-note="rolle"]')) !== 0) fail.push('cubic 两端不等高,不该出现 Rolle 那一句');

/* ⑥ 差商编答案那一块:必须在尖点课上出现,且在好情形上消失 */
await pick('cusp');
const naiveShown = await count('[data-panel="naive"]');
if (naiveShown !== 1) fail.push('尖点情形上「差商编答案」那一块没出现');
await pick('cubic');
if ((await count('[data-panel="naive"]')) !== 0) fail.push('好情形上不该出现「差商编答案」那一块');

/* ⑦ 不连续那一课:空心圈和实心点必须画在**不同**高度 */
await pick('jump');
const holeGap = await page.evaluate(() => {
  const g = document.querySelector('[data-bad="0"]');
  if (!g) return null;
  const cs = [...g.querySelectorAll('circle')];
  if (cs.length !== 2) return null;
  return Math.abs(+cs[0].getAttribute('cy') - +cs[1].getAttribute('cy'));
});
if (holeGap === null) fail.push('跳跃点没画成"空心圈 + 实心点"');
else if (holeGap < 20) fail.push(`空心圈和实心点只差 ${holeGap}px,看不出端点被搬走了`);
/* ⚠️⚠️ 曲线绝不能用一条假的"陡降"把 (1, 1⁻) 和 (1, 0) 连起来。
   陡降是有斜率的,学生会跑去那里找 c —— 而那里其实什么都没有。
   所以查的不是"断成几段"(只剩一个孤点时本来就画不成折线),
   而是:任何一段折线里都不许出现纵向的断崖。 */
const cliff = async () => page.evaluate(() => {
  let worst = 0;
  for (const r of document.querySelectorAll('[data-curve]')) {
    const ys = r.getAttribute('points').split(' ').map((p) => +p.split(',')[1]);
    for (let i = 1; i < ys.length; i += 1) worst = Math.max(worst, Math.abs(ys[i] - ys[i - 1]));
  }
  return worst;
});
const jumpCliff = await cliff();
if (jumpCliff > 25) fail.push(`跳跃处曲线被一条 ${jumpCliff.toFixed(1)}px 的假陡降接上了`);
// 画出来的那条线必须停在**左极限**那一头,而不是溜到搬走后的值上
const endsHigh = await page.evaluate(() => {
  const runs = [...document.querySelectorAll('[data-curve]')];
  const last = runs[runs.length - 1].getAttribute('points').split(' ');
  const hole = document.querySelector('[data-bad="0"] circle');
  return Math.abs(+last[last.length - 1].split(',')[1] - +hole.getAttribute('cy'));
});
if (endsHigh > 4) fail.push(`曲线没停在空心圈上(差 ${endsHigh.toFixed(1)}px)`);
// 空转保护 + 一般不变量:每个情形都不许有断崖
for (const id of ['cubic', 'rolle', 'abs', 'cusp']) {
  await pick(id);
  const w = await cliff();
  if (w > 25) fail.push(`${id} 的曲线里有一处 ${w.toFixed(1)}px 的断崖`);
}

/* ⑧ ⭐⭐ 颜色:函数和连线不许是同一个色。
   这一页从头到尾在比"连线"和"切线",两者要是和函数本身同色,
   整张图就读不出来了。第一版正是这么画的,所有测试当时都是绿的,
   靠看截图才发现。 */
await pick('cubic');
const strokes = await page.evaluate(() => ({
  curve: document.querySelector('[data-curve]').getAttribute('stroke'),
  chord: document.querySelector('[data-chord="line"]').getAttribute('stroke'),
  tangent: document.querySelector('[data-c-mark] line').getAttribute('stroke'),
  sweep: document.querySelector('[data-sweep="tangent"]').getAttribute('stroke'),
  df: document.querySelector('[data-df]').getAttribute('stroke'),
  target: document.querySelector('[data-target="line"]').getAttribute('stroke'),
}));
const dist = (p, q) => {
  const n = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [a, b] = [n(p), n(q)];
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
};
for (const [p, q] of [['curve', 'chord'], ['curve', 'tangent'], ['curve', 'sweep'],
  ['chord', 'tangent'], ['chord', 'sweep'], ['df', 'target']]) {
  const d = dist(strokes[p], strokes[q]);
  if (d < 60) fail.push(`${p}(${strokes[p]}) 和 ${q}(${strokes[q]}) 颜色太接近(距离 ${d.toFixed(0)})`);
}

/* ⑨ 长切线必须裁在画框里,不许拖出去 */
const escaped = await page.evaluate(() => {
  const need = ['[data-sweep="tangent"]', '[data-chord="line"]', '[data-c-mark] line'];
  const bad = [];
  for (const sel of need) {
    for (const el of document.querySelectorAll(sel)) {
      if (!el.getAttribute('clip-path')) bad.push(sel);
    }
  }
  return bad;
});
if (escaped.length) fail.push(`这些长线没裁在画框里:${[...new Set(escaped)].join(', ')}`);

/* ⑩ 画框:所有画出来的东西都在 viewBox 里 */
await pick('cubic');
const outside = await page.evaluate(() => {
  const bad = [];
  for (const svg of document.querySelectorAll('svg')) {
    const vb = svg.getAttribute('viewBox');
    if (!vb) continue;
    const [, , w, h] = vb.split(/\s+/).map(Number);
    for (const el of svg.querySelectorAll('circle, text')) {
      const cx = +(el.getAttribute('cx') ?? el.getAttribute('x') ?? 0);
      const cy = +(el.getAttribute('cy') ?? el.getAttribute('y') ?? 0);
      if (cx < -2 || cy < -2 || cx > w + 2 || cy > h + 2) bad.push(`${el.tagName} @ ${cx},${cy}`);
    }
  }
  return bad;
});
if (outside.length) fail.push(`有元素画到画框外:${outside.join(', ')}`);

/* ⑪ 溢出与手机 */
const over = () => page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
await page.screenshot({ path: join(OUT, 'mvt-1280.png'), fullPage: true });
const wide = await over();
await page.setViewportSize({ width: 390, height: 900 });
await page.waitForTimeout(220);
await page.screenshot({ path: join(OUT, 'mvt-390.png'), fullPage: true });
const narrow = await over();
if (wide > 0 || narrow > 0) fail.push(`横向溢出 桌面 ${wide} / 390 ${narrow}`);
if (errors.length) fail.push(`控制台报错:${errors.join(' | ')}`);

await browser.close(); server.close();
console.log(fail.length ? '✗\n  ' + fail.join('\n  ') : '✓ mvt:两个 c 的切线真平行、三个反例的 f′ 真穿不过去、尖点读数说 undefined,无溢出无报错');
process.exit(fail.length ? 1 : 0);
