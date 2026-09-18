/**
 * 「Slope Fields」的浏览器专项检查。
 *
 * ⭐⭐ 核心一问:**"解在那儿,公式里没有它的位置"这件事,屏幕上看得见吗?**
 *   点到 `y² ` 或 logistic 的 `y = 0`:
 *     · 实线(沿方向走出来的)必须**还在**;
 *     · 虚线(代通解得到的)必须**消失**;
 *     · 右边那一栏必须说"没有有限的 C"。
 *   三样缺一样,这一页就白讲了。
 *
 * ⚠️ 期望值手推:
 *   · `dy/dx = y` 过 (0,1):C = 1;过 (0,0):C = 0(蒙混过关的那个);
 *   · `dy/dx = y²` 过 (0,1):C = −1;过 (0,0):**没有 C**;
 *   · logistic 过 (0,1):C = 0;过 (0,0):**没有 C**。
 *
 * ⚠️ 死界面自查:没有 C 的那一支、场里空掉的一行、"分不了离"的标记、
 *   解曲线提前到头 —— 四个都必须真的点得到。
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SHOT_DIR ?? join(HERE, 'screenshots');
const DIST = join(HERE, '..', '..', 'dist');
const PORT = Number(process.env.SHOT_PORT ?? 4214);
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
await page.goto(`http://localhost:${PORT}/#/slope-field`, { waitUntil: 'networkidle' });

const fail = [];
const pickEq = async (id) => { await page.click(`[data-eq="${id}"]`); await page.waitForTimeout(140); };
const pickStart = async (i) => { await page.click(`[data-start="${i}"]`); await page.waitForTimeout(140); };
const attr = (sel, n) => page.$eval(sel, (el, k) => el.getAttribute(k), n).catch(() => undefined);
const count = (sel) => page.$$eval(sel, (els) => els.length);
const text = (sel) => page.$eval(sel, (el) => el.textContent.trim()).catch(() => '');

/* ① 论点前置:四步里恰好一步被标出有代价,而且是第二步 */
if ((await count('[data-step]')) !== 4) fail.push('分离变量应该列 4 步');
const costly = await page.$$eval('[data-costly="yes"]', (els) => els.map((el) => el.getAttribute('data-step')));
if (costly.length !== 1 || costly[0] !== '2') fail.push(`有代价的应该只有第 2 步,实际 ${JSON.stringify(costly)}`);
if (!(await text('[data-panel="recipe"]')).includes('divide')) fail.push('第 2 步没说清是"除"这一步');

/* ② ⭐⭐⭐ 整页的支点:丢掉的那个解 */
const LOSTCASE = [['square', 3], ['logistic', 4]];
for (const [eq, idx] of LOSTCASE) {
  await pickEq(eq);
  await pickStart(idx);
  if ((await attr('[data-panel="verdict"]', 'data-found')) !== 'no') {
    fail.push(`${eq} 的 y = 0 上竟然报出了一个 C`);
  }
  const say = await text('[data-readout="c"]');
  if (!say.includes('no finite C')) fail.push(`${eq} 的 y = 0 上措辞不对:「${say}」`);
  // 实线必须还在 —— 那个解本来就存在
  if ((await count('[data-curve="walked"]')) !== 1) fail.push(`${eq} 的 y = 0 上实线不见了`);
  // ⭐ 虚线必须消失 —— 公式里没有它
  if ((await count('[data-curve="formula"]')) !== 0) {
    fail.push(`${eq} 的 y = 0 上虚线还在 —— 那等于说公式覆盖得到它`);
  }
  /* ⚠️ 实线不许用"成立"的绿色画一条正被判定为"丢了"的解。
     整屏都在说这条解不在公式里,画面必须说同一句话。 */
  if ((await attr('[data-curve="walked"]', 'data-lost')) !== 'yes') {
    fail.push(`${eq} 的 y = 0 上实线没标成"丢掉的那条"`);
  }
  const strokes = await page.evaluate(() => ({
    curve: document.querySelector('[data-curve="walked"]').getAttribute('stroke'),
    line: document.querySelector('[data-equilibrium="0"] line').getAttribute('stroke'),
  }));
  if (strokes.curve !== strokes.line) {
    fail.push(`${eq}:实线 ${strokes.curve} 和那条平衡线 ${strokes.line} 颜色不一致,画面自相矛盾`);
  }
  // 实线确实是那条水平线
  const flat = await page.evaluate(() => {
    const ys = document.querySelector('[data-curve="walked"]').getAttribute('points')
      .split(' ').map((q) => +q.split(',')[1]);
    return Math.max(...ys) - Math.min(...ys);
  });
  if (flat > 0.5) fail.push(`${eq} 的 y = 0 上那条线不是水平的(高低差 ${flat}px)`);
}

/* 普通初值上实线该是"成立"的颜色 —— 上面那条不是恒真 */
await pickEq('logistic');
await pickStart(0);
if ((await attr('[data-curve="walked"]', 'data-lost')) !== 'no') fail.push('普通初值上实线被误标成"丢掉的"');

/* ③ 而蒙混过关的那一个:同样是 y = 0,公式却给得出来 */
await pickEq('exp');
await pickStart(3);
if ((await attr('[data-panel="verdict"]', 'data-found')) !== 'yes') {
  fail.push('dy/dx = y 的 y = 0 应该由 C = 0 给出来');
}
if (!(await text('[data-readout="c"]')).includes('C = 0')) fail.push('没说出 C = 0');
if ((await count('[data-curve="formula"]')) === 0) fail.push('dy/dx = y 的 y = 0 上虚线应该在');

/* ④ ⭐⭐ logistic 一个方程演完两边 */
await pickEq('logistic');
const rows = await page.$$eval('[data-row]', (els) =>
  els.map((el) => [el.getAttribute('data-row'), el.getAttribute('data-in-formula')]));
const want = JSON.stringify([['0', 'no'], ['1', 'yes']]);
if (JSON.stringify(rows) !== want) fail.push(`logistic 的两个平衡解判定不对:${JSON.stringify(rows)}`);
if ((await attr('[data-panel="equilibria"]', 'data-lost')) !== '1') fail.push('logistic 应该恰好丢掉一个');
// 图上两条横线也要分别标对
const marks = await page.$$eval('[data-equilibrium]', (els) =>
  els.map((el) => [el.getAttribute('data-equilibrium'), el.getAttribute('data-in-formula')]));
if (JSON.stringify(marks) !== want) fail.push(`图上的平衡解标记和右栏不一致:${JSON.stringify(marks)}`);

/* ⑤ 两条路径在普通初值上必须重合 */
for (const [eq, idx] of [['exp', 0], ['square', 0], ['logistic', 1], ['linear', 0]]) {
  await pickEq(eq);
  await pickStart(idx);
  /* ⚠️ 两条折线的**取样密度不一样**(通解在整个窗口上取 400 点,
     走出来的那条按 h = 0.004 取,范围还更窄)。拿"最近的那个点"去比,
     量到的是取样间隔,不是两条曲线的差 —— 陡的地方一格 x 就是好几个 px。
     所以要在通解那条折线上**按 x 线性插值**,再和走出来的那条比。 */
  const off = await page.evaluate(() => {
    const parse = (el) => el.getAttribute('points').split(' ').map((q) => q.split(',').map(Number));
    const w = parse(document.querySelector('[data-curve="walked"]'));
    const runs = [...document.querySelectorAll('[data-curve="formula"]')].map(parse);
    if (!runs.length) return null;
    const at = (x) => {
      for (const r of runs) {
        for (let i = 1; i < r.length; i += 1) {
          const [x0, y0] = r[i - 1];
          const [x1, y1] = r[i];
          if ((x - x0) * (x - x1) <= 0 && x0 !== x1) {
            return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
          }
        }
      }
      return null;
    };
    let worst = 0;
    let seen = 0;
    for (const [x, y] of w) {
      const v = at(x);
      if (v === null) continue;
      worst = Math.max(worst, Math.abs(v - y));
      seen += 1;
    }
    return seen < 100 ? null : worst;   // 重叠太少就别声称验过了
  });
  if (off === null) fail.push(`${eq}/${idx} 上通解那条没画出来,或者和实线几乎不重叠`);
  // 两条互不相干的路径画在同一张图上,差过半个像素就说明有一条是错的
  else if (off > 0.5) fail.push(`${eq}/${idx} 两条路径在屏幕上差了 ${off.toFixed(2)}px`);
}

/* ⑥ ⭐ 场里空掉的那一行(−x/y 的 y = 0),以及解曲线提前到头 */
await pickEq('circles');
const ticksNow = await count('[data-tick]');
const full = 17 * 13;
if (ticksNow !== full - 17) fail.push(`−x/y 应该少画一整行(${full - 17} 段),实际 ${ticksNow} 段`);
const ends = await page.evaluate(() => {
  const xs = document.querySelector('[data-curve="walked"]').getAttribute('points')
    .split(' ').map((q) => +q.split(',')[0]);
  const svg = document.querySelector('svg');
  const w = +svg.getAttribute('viewBox').split(' ')[2];
  return { lo: Math.min(...xs), hi: Math.max(...xs), w };
});
// 圆在 x = ±2 处到头,而画框到 ±3 —— 曲线两头都该离边框远远的
if (ends.lo < 34 + 10) fail.push('−x/y 的解曲线一直画到了左边框,没在圆转竖直的地方停');
if (ends.hi > ends.w - 34 - 10) fail.push('−x/y 的解曲线一直画到了右边框');
// 其他方程不该少画
await pickEq('exp');
if ((await count('[data-tick]')) !== full) fail.push('dy/dx = y 的场不该有空格');

/* ⑦ 分不了离的那一个 */
await pickEq('linear');
if ((await count('[data-note="not-separable"]')) !== 1) fail.push('linear 上没说它分不了离');
if ((await count('[data-panel="equilibria"]')) !== 0) fail.push('linear 没有平衡解,不该出现那一栏');
await pickEq('exp');
if ((await count('[data-note="not-separable"]')) !== 0) fail.push('可分离的方程上不该出现那句话');

/* ⑧ 场里每一段等长 —— 长度不许随斜率变 */
await pickEq('square'); // y² 的斜率从 0 到 9,差得最开
const lens = await page.$$eval('[data-tick]', (els) => els.map((el) => Math.hypot(
  +el.getAttribute('x2') - +el.getAttribute('x1'),
  +el.getAttribute('y2') - +el.getAttribute('y1'))));
const spread = Math.max(...lens) - Math.min(...lens);
if (spread > 0.01) fail.push(`场里的线段长短不一(相差 ${spread.toFixed(3)}px)——它只该表达方向`);
if (Math.max(...lens) < 8) fail.push('场里的线段太短,看不出方向');

/* ⑨ 画框:没有东西画到 viewBox 外面 */
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
  return bad.slice(0, 3);
});
if (outside.length) fail.push(`有曲线画到画框外:${outside.join(' ')}`);

/* ⑩ 每个方程都有像样的说明 */
for (const eq of ['exp', 'square', 'logistic', 'circles', 'linear']) {
  await pickEq(eq);
  if ((await text('[data-note="eq"]')).length < 80) fail.push(`${eq} 的说明太短`);
}

/* ⑪ 溢出与手机 */
await pickEq('logistic');
const over = () => page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
await page.screenshot({ path: join(OUT, 'slope-field-1280.png'), fullPage: true });
const wide = await over();
await page.setViewportSize({ width: 390, height: 900 });
await page.waitForTimeout(220);
await page.screenshot({ path: join(OUT, 'slope-field-390.png'), fullPage: true });
const narrow = await over();
if (wide > 0 || narrow > 0) fail.push(`横向溢出 桌面 ${wide} / 390 ${narrow}`);
if (errors.length) fail.push(`控制台报错:${errors.join(' | ')}`);

await browser.close(); server.close();
console.log(fail.length ? '✗\n  ' + fail.join('\n  ') : '✓ slope-field:丢掉的解上实线在、虚线消失、措辞说得清,场里等长无空转,无溢出无报错');
process.exit(fail.length ? 1 : 0);
