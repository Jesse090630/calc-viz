/**
 * 「Euler's Method」的浏览器专项检查。
 *
 * ⭐⭐⭐ 核心一问:**把 h 推过临界点,屏幕会不会当场翻脸?**
 *   `y′ = −20(y − 1)` 上 h 从 0.05 拖到 0.15:
 *     · 放大因子读数要从 < 1 变成 2;
 *     · 判定要从 stable 变成 unstable;
 *     · 折线要**改用失败色**,而且真的上下变号。
 *   三样缺一样,这一课最重的那一句就没有画面作证。
 *
 * ⚠️ 期望值手推:
 *   · `y′ = y` 的欧拉值就是 `(1 + 1/n)^n`:n = 10 → 2.593742;
 *   · 门槛 `h = 2/|λ| = 2/20 = 0.1`,`h = 0.15` 时 `|1 + hλ| = |1 − 3| = 2`;
 *   · 比值那一列全在 2 附近 —— 一阶方法的全部代价。
 *
 * ⚠️ 死界面自查:偏向三档、稳定性四档、"走过尽头"那一块,都必须真的出现过。
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SHOT_DIR ?? join(HERE, 'screenshots');
const DIST = join(HERE, '..', '..', 'dist');
const PORT = Number(process.env.SHOT_PORT ?? 4215);
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
await page.goto(`http://localhost:${PORT}/#/euler`, { waitUntil: 'networkidle' });

const fail = [];
const pickEq = async (id) => { await page.click(`[data-eq="${id}"]`); await page.waitForTimeout(150); };
const setH = async (v) => {
  await page.$eval('input[type="range"]', (el, val) => {
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(el, String(val));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, v);
  await page.waitForTimeout(160);
};
const attr = (sel, n) => page.$eval(sel, (el, k) => el.getAttribute(k), n).catch(() => undefined);
const count = (sel) => page.$$eval(sel, (els) => els.length);
const text = (sel) => page.$eval(sel, (el) => el.textContent.trim()).catch(() => '');

/* ① 论点前置:三个想当然 */
if ((await count('[data-claim]')) !== 3) fail.push('应该列 3 个想当然');
const claims = await text('[data-panel="claims"]');
for (const w of ['average out', 'smaller step', 'a bit off']) {
  if (!claims.includes(w)) fail.push(`想当然那一栏没提到「${w}」`);
}

/* ② ⭐⭐⭐ 把 h 推过临界点 */
await pickEq('stiff');
await setH(0.05);
if ((await attr('[data-panel="stability"]', 'data-stability')) !== 'stable') fail.push('h = 0.05 应为 stable');
if ((await attr('[data-curve="euler"]', 'data-lying')) !== 'no') fail.push('h = 0.05 上折线不该标成假的');
const stableAmp = await text('[data-readout="amp"]');
if (!stableAmp.includes('0.') ) fail.push(`h = 0.05 的放大因子读数不对:「${stableAmp}」`);

await setH(0.1);
if ((await attr('[data-panel="stability"]', 'data-stability')) !== 'marginal') {
  fail.push('h = 0.1 正好在门槛上,应为 marginal —— 并进 stable 就是在页面上说谎');
}

await setH(0.15);
if ((await attr('[data-panel="stability"]', 'data-stability')) !== 'unstable') fail.push('h = 0.15 应为 unstable');
const amp = await text('[data-readout="amp"]');
if (!amp.includes('2')) fail.push(`h = 0.15 的放大因子应该是 2,读到「${amp}」`);
// ⚠️ 折线必须改色 —— 右栏说这段是假的,画面不能同时用"成立"的颜色画它
if ((await attr('[data-curve="euler"]', 'data-lying')) !== 'yes') fail.push('不稳定时折线没标成假的');
const colors = await page.evaluate(() => ({
  euler: document.querySelector('[data-curve="euler"]').getAttribute('stroke'),
  truth: document.querySelector('[data-truth="0"]').getAttribute('stroke'),
}));
if (colors.euler === colors.truth) fail.push('折线和真解同色,两条线分不开');
/* ⚠️⚠️ 偏向那一栏在不稳定时**不许**说"误差互相抵消"。
   折线确实两边都有,可原因是发散,不是抵消 —— 照搬那句安慰话
   等于给一场灾难配了句"没事"。(截图看出来的。) */
if ((await attr('[data-panel="bias"]', 'data-bias')) !== 'diverging') {
  fail.push('不稳定时偏向那一栏没改口');
}
const biasSay = await text('[data-panel="bias"]');
if (biasSay.includes('partly cancel')) fail.push(`不稳定时还在说"误差互相抵消":「${biasSay}」`);
if (!biasSay.includes('diverging')) fail.push('不稳定时没说清是发散');

// ⭐ 而且折线真的上下变号,真解真的单调
const flips = await page.evaluate(() => {
  const ys = document.querySelector('[data-curve="euler"]').getAttribute('points')
    .split(' ').map((q) => +q.split(',')[1]);
  let n = 0;
  for (let i = 2; i < ys.length; i += 1) {
    if ((ys[i] - ys[i - 1]) * (ys[i - 1] - ys[i - 2]) < 0) n += 1;
  }
  return { flips: n, pts: ys.length };
});
if (flips.pts < 3) fail.push('不稳定那一屏折线点太少,看不出震荡');
if (flips.flips < 1) fail.push('不稳定时折线没有上下变号 —— 那正是要看见的东西');
const monotone = await page.evaluate(() => {
  const ys = document.querySelector('[data-truth="0"]').getAttribute('points')
    .split(' ').map((q) => +q.split(',')[1]);
  for (let i = 1; i < ys.length; i += 1) if (ys[i] < ys[i - 1] - 0.01) return false;
  return true; // 屏幕 y 向下,真解下降 ⇒ 屏幕上递增
});
if (!monotone) fail.push('真解在屏幕上不是单调的 —— 和"它安安静静趋向 1"打架');
// 门槛读数
if (!(await text('[data-readout="limit"]')).includes('0.1')) fail.push('没写出 h ≤ 0.1 这个门槛');

/* ③ ⭐⭐ 一阶的代价:比值那一列全是 2 */
for (const eq of ['exp', 'wave', 'log', 'stiff', 'blowup']) {
  await pickEq(eq);
  const ratios = await page.$$eval('[data-ratio]', (els) =>
    els.map((el) => el.textContent.trim()).filter((t) => t !== '—').map(Number));
  if (ratios.length !== 4) fail.push(`${eq} 的表应该有 4 个比值,实际 ${ratios.length}`);
  for (const r of ratios) {
    if (!(r > 1.7 && r < 2.3)) fail.push(`${eq} 的比值 ${r} 不在 2 附近 —— 一阶这件事就说不出口了`);
  }
  const ord = await text('[data-readout="order"]');
  const p = Number(ord.replace(/[^0-9.]/g, ''));
  if (!(p > 0.85 && p < 1.15)) fail.push(`${eq} 量出来的阶是 ${p},应该接近 1`);
  // 第一行没有比值,不许拿 0 或 1 冒充
  const first = await page.$eval('[data-row] [data-ratio]', (el) => el.textContent.trim());
  if (first !== '—') fail.push(`${eq} 第一行不该有比值,却写着「${first}」`);
}

/* ④ 手推:y′ = y、n = 10 的欧拉值是 (1 + 1/10)^10 = 2.593742 */
await pickEq('exp');
const row10 = await page.$eval('[data-row="10"]', (el) =>
  [...el.querySelectorAll('td')].map((t) => t.textContent.trim()));
if (Math.abs(Number(row10[2]) - 1.1 ** 10) > 1e-5) {
  fail.push(`y′ = y、n = 10 应为 ${(1.1 ** 10).toFixed(6)},表里是 ${row10[2]}`);
}

/* ⑤ 死界面自查:偏向三档都走得到 */
const seenBias = new Set();
for (const eq of ['exp', 'wave', 'log', 'stiff', 'blowup']) {
  await pickEq(eq);
  seenBias.add(await attr('[data-panel="bias"]', 'data-bias'));
}
for (const b of ['below', 'above', 'mixed']) {
  if (!seenBias.has(b)) fail.push(`偏向「${b}」从界面上走不到`);
}

/* ⑥ ⭐ 走过尽头那一块 */
await pickEq('blowup');
await setH(0.2);
if ((await count('[data-panel="past"]')) !== 1) fail.push('y′ = y² 上没出现"走过尽头"那一块');
if ((await count('[data-end-marker]')) !== 1) fail.push('图上没画"解到此为止"那条竖线');
if ((await attr('[data-curve="euler"]', 'data-lying')) !== 'yes') fail.push('走过尽头时折线没标成假的');
// 真解必须在那条竖线**之前**就抬笔,不许画过去
const crosses = await page.evaluate(() => {
  const mark = +document.querySelector('[data-end-marker] line').getAttribute('x1');
  return [...document.querySelectorAll('[data-truth]')].some((el) =>
    el.getAttribute('points').split(' ').some((q) => +q.split(',')[0] > mark + 1));
});
if (crosses) fail.push('真解画过了"解到此为止"那条线 —— 那之后根本没有解');
// 而折线确实越过去了
const eulerCrosses = await page.evaluate(() => {
  const mark = +document.querySelector('[data-end-marker] line').getAttribute('x1');
  return document.querySelector('[data-curve="euler"]').getAttribute('points')
    .split(' ').some((q) => +q.split(',')[0] > mark + 1);
});
if (!eulerCrosses) fail.push('折线没有越过那条线 —— 这一屏的论点就落空了');
await pickEq('exp');
if ((await count('[data-panel="past"]')) !== 0) fail.push('没有尽头的方程上不该出现那一块');
if ((await count('[data-end-marker]')) !== 0) fail.push('没有尽头的方程上不该画那条竖线');

/* ⑦ 稳定性四档 */
const seenStab = new Set();
for (const [eq, hs] of [['stiff', [0.05, 0.1, 0.15]], ['blowup', [0.2]]]) {
  await pickEq(eq);
  for (const v of hs) { await setH(v); seenStab.add(await attr('[data-panel="stability"]', 'data-stability')); }
}
for (const k of ['stable', 'marginal', 'unstable', 'n/a']) {
  if (!seenStab.has(k)) fail.push(`稳定性「${k}」从界面上走不到`);
}

/* ⚠️ 稳定时那句安慰话又该回来 —— 上面那条不是恒真 */
await pickEq('stiff');
await setH(0.05);
if ((await attr('[data-panel="bias"]', 'data-bias')) === 'diverging') fail.push('稳定时偏向被误标成发散');

/* ⭐⭐ 横轴必须有刻度数字。
   `y′ = −20(y − 1)` 的横轴跨度不到 1,只吐整数的话一个数字都没有,
   而"h 相对横轴有多长"正是那一屏的全部内容。 */
for (const eq of ['exp', 'wave', 'log', 'stiff', 'blowup']) {
  await pickEq(eq);
  const labels = await page.evaluate(() => {
    const svg = document.querySelector('svg');
    const [, , , h] = svg.getAttribute('viewBox').split(/\s+/).map(Number);
    return [...svg.querySelectorAll('text')]
      .filter((t) => +t.getAttribute('y') > h - 20)
      .map((t) => t.textContent.trim());
  });
  if (labels.length < 3) fail.push(`${eq} 的横轴只有 ${labels.length} 个刻度数字`);
  for (const l of labels) {
    if (l.length > 5) fail.push(`${eq} 的横轴刻度带浮点毛刺:「${l}」`);
  }
}

/* ⭐ 纵轴必须标出 y = 1 —— 真解停在那儿,放大因子量的就是"离 1 有多远" */
await pickEq('stiff');
const yLabels = await page.evaluate(() => {
  const svg = document.querySelector('svg');
  const [, , , h] = svg.getAttribute('viewBox').split(/\s+/).map(Number);
  return [...svg.querySelectorAll('text')]
    .filter((t) => +t.getAttribute('y') < h - 20 && t.getAttribute('text-anchor') === 'end')
    .map((t) => t.textContent.trim());
});
if (!yLabels.includes('1')) fail.push(`stiff 的纵轴没标出 1,只有 ${JSON.stringify(yLabels)}`);

/* ⑧ 每一步都点出来了,而且步数读数对得上 */
await pickEq('exp');
await setH(0.1);
const nodes = await count('[data-node]');
const says = await text('[data-readout="steps"]');
if (nodes !== Number(says.split(' ')[0]) + 1) fail.push(`点数 ${nodes} 和读数「${says}」对不上`);
if (nodes < 5) fail.push('折线上没把每一步点出来');

/* ⑨ 画框 */
const outside = await page.evaluate(() => {
  const svg = document.querySelector('svg');
  const [, , w, h] = svg.getAttribute('viewBox').split(/\s+/).map(Number);
  const bad = [];
  for (const el of svg.querySelectorAll('polyline')) {
    for (const q of el.getAttribute('points').split(' ')) {
      const [x, y] = q.split(',').map(Number);
      if (x < -1 || y < -1 || x > w + 1 || y > h + 1) bad.push(q);
    }
  }
  for (const el of svg.querySelectorAll('circle')) {
    const x = +el.getAttribute('cx'); const y = +el.getAttribute('cy');
    if (x < -1 || y < -1 || x > w + 1 || y > h + 1) bad.push(`${x},${y}`);
  }
  return bad.slice(0, 3);
});
if (outside.length) fail.push(`有东西画到画框外:${outside.join(' ')}`);

/* ⑩ 溢出与手机 */
await pickEq('stiff');
await setH(0.15);
const over = () => page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
await page.screenshot({ path: join(OUT, 'euler-1280.png'), fullPage: true });
const wide = await over();
await page.setViewportSize({ width: 390, height: 900 });
await page.waitForTimeout(240);
await page.screenshot({ path: join(OUT, 'euler-390.png'), fullPage: true });
const narrow = await over();
if (wide > 0 || narrow > 0) fail.push(`横向溢出 桌面 ${wide} / 390 ${narrow}`);
if (errors.length) fail.push(`控制台报错:${errors.join(' | ')}`);

await browser.close(); server.close();
console.log(fail.length ? '✗\n  ' + fail.join('\n  ') : "✓ euler:h 推过 0.1 当场翻脸、比值那列全是 2、走过尽头有画面作证,无溢出无报错");
process.exit(fail.length ? 1 : 0);
