/**
 * 六条特殊极限的浏览器专项检查(五条走共用的 `RatioLab`,加上 sin x / x 那一课)。
 *
 * ⭐⭐ 三件事:
 *   ① 六条的「direct substitution」在屏幕上**完全一样**(都是 0/0);
 *   ② 阶梯上的读数**一档比一档更接近**各自的极限,而且最后一档确实到位;
 *   ③ 缩放越深,曲线与它的局部替身**差得越小** —— 这个数从画面上读,不是我说的。
 *
 * ⚠️ 期望值在这个文件里**独立重写**一遍,不 import 被测模块。
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SHOT_DIR ?? join(HERE, 'screenshots');
const DIST = join(HERE, '..', '..', 'dist');
const PORT = 4212;
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
const BASE = `http://localhost:${PORT}/#/`;

/** ⚠️ 独立重算:极限值在这里**手写**,不从模块里取。 */
const LESSONS = [
  // ⚠️ sin x / x 那一课的滑块拖的是 **θ**(线性刻度),不是别的五课那种十进位档 ——
  //    它比另外五课早写,而且几何面板需要一个能看清角的角度范围。
  //    第一版检查对六课一律去找 `input[aria-label="x"]`,在这一课上拿到 null,
  //    然后 `setter.call(null, …)` 抛 "Illegal invocation" —— 整个检查直接崩,
  //    不是报一条失败。**探到再用**,别假设页面长什么样。
  { route: 'sin-over-x', limit: 1, ladder: true, zoom: false, slider: 'theta', steps: [1, 0.5, 0.25, 0.1, 0.05, 0.02] },
  { route: 'tan-over-x', limit: 1, ladder: true, zoom: true, slider: 'x', steps: [0.2, 0.6, 1.2, 2, 3, 4] },
  { route: 'cos-over-x', limit: 0, ladder: true, zoom: true, slider: 'x', steps: [0.2, 0.6, 1.2, 2, 3, 4] },
  { route: 'cos-over-x2', limit: 0.5, ladder: true, zoom: true, naive: true, slider: 'x', steps: [0.2, 0.6, 1.2, 2, 3, 4] },
  { route: 'exp-over-x', limit: 1, ladder: true, zoom: true, slider: 'x', steps: [0.2, 0.6, 1.2, 2, 3, 4] },
  { route: 'log-over-x', limit: 1, ladder: true, zoom: true, slider: 'x', steps: [0.2, 0.6, 1.2, 2, 3, 4] },
];

mkdirSync(OUT, { recursive: true });
const errors = [];
const note = (m) => errors.push(m);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1400 }, deviceScaleFactor: 2 });
page.on('console', (m) => { if (m.type() === 'error') note(`console: ${m.text()}`); });
page.on('pageerror', (e) => note(`pageerror: ${e.message}`));

const substitutionsSeen = new Set();
let zoomsChecked = 0;
let factorPanelsChecked = 0;

for (const lesson of LESSONS) {
  const tag = lesson.route;
  await page.goto(BASE + tag, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-panel="substitution"]');

  /* ① 代入 —— 六条必须给出同一个形状 */
  {
    const form = await page.locator('[data-panel="substitution"]').first().getAttribute('data-form');
    const text = await page.locator('[data-panel="substitution"]').first().innerText();
    substitutionsSeen.add(form);
    if (form !== '0/0') note(`[${tag}] substitution reads ${form}`);
    if (!/INDETERMINATE/i.test(text)) note(`[${tag}] the substitution panel never says INDETERMINATE`);
    // ⚠️ 这块面板不许下结论
    if (/=\s*-?\d/.test(text.replace(/\b0\/0\b/g, ''))) note(`[${tag}] the substitution panel states a value: "${text.replace(/\s+/g, ' ').slice(0, 100)}"`);
  }

  /* ② 阶梯 —— 一档比一档更近,最后一档到位 */
  if (lesson.ladder) {
    const rows = await page.evaluate(() => {
      const panel = document.querySelector('[data-panel="ladder"]');
      return [...panel.querySelectorAll('[data-row-value]')].map((el) => ({
        x: Number(el.getAttribute('data-row-value')),
        value: Number(el.textContent.trim()),
        gap: panel.querySelector(`[data-row-gap="${el.getAttribute('data-row-value')}"]`)?.textContent?.trim(),
      }));
    });
    if (rows.length < 6) note(`[${tag}] the ladder only has ${rows.length} rows`);
    let previous = Infinity;
    let moved = 0;
    for (const row of rows) {
      if (!Number.isFinite(row.value)) { note(`[${tag}] x = ${row.x} reads "${row.value}"`); continue; }
      const gap = Math.abs(row.value - lesson.limit);
      if (gap > previous + 1e-12) note(`[${tag}] the ladder moved away from ${lesson.limit} at x = ${row.x}`);
      if (gap < previous) moved += 1;
      previous = gap;
      // ⚠️ 差距那一列**永远不许显示成 0**
      if (row.gap === '0' || row.gap === '0.0') note(`[${tag}] the gap column reads exactly 0 at x = ${row.x}`);
    }
    if (moved < 4) note(`[${tag}] the ladder barely moves — only ${moved} rows got closer`);
    if (previous > 1e-5) note(`[${tag}] the deepest ladder row is still ${previous} from ${lesson.limit}`);
    const last = rows[rows.length - 1];
    if (Math.abs(last.value - lesson.limit) > 1e-5) note(`[${tag}] the last row reads ${last.value}, expected ${lesson.limit}`);
  }

  /* ⭐ 两条余弦课:教科书写法那一列必须在深处**明显跑掉** */
  if (lesson.naive) {
    const naive = await page.evaluate(() => {
      const panel = document.querySelector('[data-panel="ladder"]');
      const note = panel.querySelector('[data-readout="naive-note"]');
      return {
        breaksAt: note?.getAttribute('data-breaks-at'),
        rows: [...panel.querySelectorAll('[data-row-naive]')].map((el) => ({
          x: Number(el.getAttribute('data-row-naive')),
          value: Number(el.textContent.trim()),
          good: Number(panel.querySelector(`[data-row-value="${el.getAttribute('data-row-naive')}"]`)?.textContent?.trim()),
        })),
      };
    });
    if (!naive.breaksAt) note(`[${tag}] the naive column has no explanation of where it breaks`);
    const worst = naive.rows.reduce((m, r) => Math.max(m, Math.abs(r.value - r.good)), 0);
    // ⚠️ 差别要**在屏幕上读得出来**(七位小数),不是浮点里存在就算。
    if (!(worst > 1e-3)) note(`[${tag}] the naive column never visibly disagrees — nothing is being demonstrated (worst ${worst})`);
    // ⭐ 而且最深那一档必须整个塌掉:教科书写法读 0,正确答案不是 0
    const deepest = naive.rows[naive.rows.length - 1];
    if (deepest.value !== 0) note(`[${tag}] the naive column never collapses to 0 (deepest reads ${deepest.value})`);
    if (Math.abs(deepest.good - lesson.limit) > 1e-9) note(`[${tag}] the stable column is wrong at the deepest row: ${deepest.good}`);
    // ⚠️ 而稳定那一列在同样的 x 上必须**是对的**
    for (const row of naive.rows) {
      if (Math.abs(row.good - lesson.limit) > Math.abs(row.x) * 2 + 1e-5) {
        note(`[${tag}] the stable column reads ${row.good} at x = ${row.x}`);
      }
    }
  }

  /* ③ 缩放 —— 档位越深,差距越小 */
  if (lesson.zoom) {
    const setZoom = (v) => page.evaluate((v) => {
      const el = document.querySelector('input[aria-label="zoom"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, String(v));
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, v);

    let previous = Infinity;
    let widest = 0;
    for (const level of [0, 1, 2, 3, 4, 5, 6]) {
      await setZoom(level);
      await page.waitForTimeout(60);
      const gap = Number(await page.locator('[data-panel="zoom"]').getAttribute('data-gap'));
      if (level === 0) widest = gap;
      if (!(gap < previous)) note(`[${tag}] zoom level ${level} is not closer than the one before (${previous} → ${gap})`);
      previous = gap;
      // 曲线必须真的画出来了
      const drawn = await page.evaluate(() =>
        [...document.querySelectorAll('[data-panel="zoom"] [data-curve]')].map((p) => (p.getAttribute('d') ?? '').length));
      if (drawn.length < 2) note(`[${tag}] zoom level ${level} draws ${drawn.length} curves`);
      if (drawn.some((d) => d < 20)) note(`[${tag}] a curve is empty at zoom level ${level}`);
    }
    // ⚠️ 防空跑:最宽那一档必须**看得出不一样**,否则「放大才像」没有对照
    if (!(widest > 0.02)) note(`[${tag}] the curves already coincide at the widest zoom (${widest}) — nothing to notice`);
    if (!(previous < widest / 10)) note(`[${tag}] zooming barely helped: ${widest} → ${previous}`);
    zoomsChecked += 1;
    await setZoom(2);
  }

  /* ④ 代数一步一步露完 */
  {
    const before = Number(await page.locator('[data-panel="algebra"]').getAttribute('data-revealed'));
    const total = Number(await page.locator('[data-panel="algebra"]').getAttribute('data-total'));
    if (before !== 1) note(`[${tag}] the algebra did not start at one step (${before})`);
    // ⚠️ 点之前先看按钮**在不在**。
    //    第一版是 `.click().catch(() => {})` —— 按钮消失之后每次点击要等满 30 秒超时,
    //    六节课乘五步就是十几分钟,看起来像检查卡死了。
    //    「catch 掉错误」把一个 30 秒的等待伪装成了一次无害的失败。
    for (let i = 0; i < total + 1; i += 1) {
      const button = page.locator('[data-action="next-step"]').first();
      if (await button.count() === 0) break;
      await button.click();
      await page.waitForTimeout(40);
    }
    const after = Number(await page.locator('[data-panel="algebra"]').getAttribute('data-revealed'));
    if (after !== total) note(`[${tag}] the algebra stopped at ${after} of ${total} steps`);
  }

  /* ⑤ 因子表盘 —— 乘积必须等于当前比值 */
  if (await page.locator('[data-panel="factors"]').count() > 0) {
    const factors = await page.evaluate(() => ({
      product: document.querySelector('[data-readout="product"]')?.getAttribute('data-value'),
      gauges: [...document.querySelectorAll('[data-gauge]')].map((g) => Number(g.getAttribute('data-value'))),
      // ⚠️ 拿**全精度**属性,不拿七位小数的显示值 ——
      //    用显示值去比全精度乘积会得到一堆假失败(第一版就是这么写的)。
      ratio: Number(document.querySelector('[data-readout="ratio"]')?.getAttribute('data-value')),
      ratioShown: document.querySelector('[data-readout="ratio"]')?.textContent?.trim(),
    }));
    const product = Number(factors.product);
    if (!Number.isFinite(product)) note(`[${tag}] the factor product reads ${factors.product}`);
    // ⭐ 逐点恒等式:因子乘起来**就是**那个比值,不只是极限处相等
    if (Math.abs(product - factors.ratio) > 1e-9 * Math.max(1, Math.abs(factors.ratio))) {
      note(`[${tag}] factors multiply to ${product} but the ratio reads ${factors.ratio}`);
    }
    const byHand = factors.gauges.reduce((a, b) => a * b, 1);
    if (Math.abs(byHand - product) > 1e-9 * Math.max(1, Math.abs(product))) {
      note(`[${tag}] the gauges say ${byHand} but the product row says ${product}`);
    }
    // 显示出来的两个数字也必须一致 —— 全精度对上、屏幕上写着两个数,同样是错
    if (factors.ratioShown !== undefined && Number(factors.ratioShown).toFixed(7) !== product.toFixed(7)) {
      note(`[${tag}] the screen shows ratio ${factors.ratioShown} but product ${product.toFixed(7)}`);
    }
    factorPanelsChecked += 1;
  } else if (lesson.route !== 'sin-over-x' && lesson.route !== 'exp-over-x') {
    note(`[${tag}] has no factor panel, but it is supposed to be derived from an earlier limit`);
  }

  /* ⑥ 结论 */
  if (await page.locator('[data-panel="result"]').count() > 0) {
    const limit = Number(await page.locator('[data-panel="result"]').getAttribute('data-limit'));
    if (limit !== lesson.limit) note(`[${tag}] the result panel says ${limit}, expected ${lesson.limit}`);
    // ⚠️ 用 count 先探一次再读。直接 innerText 一个不存在的选择器会**挂 30 秒**才报错,
    //    整个检查看起来像卡死了 —— 缺一块面板应该当场说清楚,不是超时。
    if (await page.locator('[data-readout="provenance"]').count() === 0) {
      note(`[${tag}] the result panel never says where this limit comes from`);
    } else {
      const provenance = await page.locator('[data-readout="provenance"]').first().innerText();
      if (!/Proved from|rests on/i.test(provenance)) note(`[${tag}] provenance reads "${provenance.slice(0, 80)}"`);
    }
  }

  /* 拖滑块:比值跟着走向极限,而且永远不出现 NaN */
  {
    const selector = `input[aria-label="${lesson.slider}"]`;
    if (await page.locator(selector).count() === 0) {
      note(`[${tag}] has no ${lesson.slider} slider`);
    } else {
      const set = (v) => page.evaluate(({ selector, v }) => {
        const el = document.querySelector(selector);
        if (!(el instanceof window.HTMLInputElement)) throw new Error(`no input for ${selector}`);
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, String(v));
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, { selector, v });

      let previous = Infinity;
      let moved = 0;
      for (const step of lesson.steps) {
        await set(step);
        await page.waitForTimeout(50);
        const value = Number(await page.locator('[data-readout="ratio"]').first().textContent());
        if (!Number.isFinite(value)) { note(`[${tag}] the ratio readout is not a number at ${step}`); continue; }
        const gap = Math.abs(value - lesson.limit);
        if (gap > previous + 1e-9) note(`[${tag}] moving the slider closer to 0 pushed the ratio away from ${lesson.limit}`);
        if (gap < previous) moved += 1;
        previous = gap;
      }
      // 防空跑:滑块必须真的改变了读数
      if (moved < 3) note(`[${tag}] the slider barely changed the ratio — only ${moved} steps got closer`);
      if (!(previous < 1e-3)) note(`[${tag}] the slider never brings the ratio near ${lesson.limit} (still ${previous})`);
    }
  }

  /* 没有假值,文字不出框、不重叠 */
  {
    const body = await page.evaluate(() => document.body.innerText);
    if (/NaN|Infinity/.test(body)) note(`[${tag}] NaN or Infinity reached the screen`);
    // ⚠️ 半截的指数:×10 后面直接跟 ASCII 数字
    const halfExponent = body.match(/×10-?\d/);
    if (halfExponent) note(`[${tag}] a half-rendered exponent is on screen: "${halfExponent[0]}"`);

    const bad = await page.evaluate(() => {
      const out = [];
      for (const svg of document.querySelectorAll('main svg')) {
        const vb = svg.viewBox.baseVal;
        const boxes = [...svg.querySelectorAll('text')].map((t) => ({ t: t.textContent.trim(), b: t.getBBox() }));
        for (const { t, b } of boxes) {
          if (b.x < vb.x - 0.5 || b.x + b.width > vb.x + vb.width + 0.5 || b.y < vb.y - 0.5 || b.y + b.height > vb.y + vb.height + 0.5) out.push(`outside: "${t}"`);
        }
        for (let a = 0; a < boxes.length; a += 1) for (let c = a + 1; c < boxes.length; c += 1) {
          const A = boxes[a].b, B = boxes[c].b;
          const w = Math.min(A.x + A.width, B.x + B.width) - Math.max(A.x, B.x);
          const h = Math.min(A.y + A.height, B.y + B.height) - Math.max(A.y, B.y);
          if (w > 0 && h > 0 && w * h > Math.min(A.width * A.height, B.width * B.height) * 0.2) out.push(`collide: "${boxes[a].t}" × "${boxes[c].t}"`);
        }
      }
      return out;
    });
    for (const b of [...new Set(bad)]) note(`[${tag}] ${b}`);
  }

  await page.screenshot({ path: join(OUT, `sl-${tag}.png`), fullPage: true });
}

/* ⭐⭐ 六条的代入结果是同一个 */
if (substitutionsSeen.size !== 1) note(`the six lessons do not agree on the substitution form: ${[...substitutionsSeen].join(' | ')}`);

/* 每课自己那一块面板确实在场 */
{
  const EXTRAS = {
    'exp-over-x': ['[data-panel="secant"]', '[data-panel="bases"]'],
    'log-over-x': ['[data-panel="reflection"]'],
    'cos-over-x': ['[data-panel="conjugate"]'],
    'cos-over-x2': ['[data-panel="half-angle"]', '[data-panel="local"]'],
    'tan-over-x': ['[data-panel="three-way"]'],
  };
  for (const [route, selectors] of Object.entries(EXTRAS)) {
    await page.goto(BASE + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(250);
    for (const selector of selectors) {
      if (await page.locator(selector).count() === 0) note(`[${route}] is missing its own panel ${selector}`);
    }
  }
}

/* ⭐ 「为什么偏偏是 e」:只有 e 那一行读 1 */
{
  await page.goto(BASE + 'exp-over-x', { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-panel="bases"]');
  if (await page.locator('[data-panel="bases"]').getAttribute('data-open') !== 'no') note('the bases panel started open');
  await page.locator('[data-action="open-bases"]').click();
  await page.waitForTimeout(120);
  const slopes = await page.evaluate(() =>
    Object.fromEntries([...document.querySelectorAll('[data-base-slope]')].map((el) => [el.getAttribute('data-base-slope'), Number(el.textContent.trim())])));
  // 独立重算:ln 2 = 0.6931…, ln 3 = 1.0986…, ln 10 = 2.3026…
  const EXPECTED = { '2': Math.log(2), e: 1, '3': Math.log(3), '10': Math.log(10) };
  for (const [label, want] of Object.entries(EXPECTED)) {
    const got = slopes[label];
    if (!Number.isFinite(got)) { note(`the base table has no reading for ${label}`); continue; }
    if (Math.abs(got - want) > 1e-4) note(`base ${label} reads ${got}, expected ${want.toFixed(6)}`);
  }
  // ⭐ 只有 e 落在 1 上,别的都明显不是
  for (const label of ['2', '3', '10']) {
    if (Math.abs(slopes[label] - 1) < 1e-3) note(`base ${label} reads as 1 — then e is not special`);
  }
  if (new Set(Object.values(slopes)).size !== 4) note(`the four base readings are not distinct: ${JSON.stringify(slopes)}`);
  await page.screenshot({ path: join(OUT, 'sl-exp-bases.png'), fullPage: true });
}

/* ⭐ sin x / x 那一课的洞画在 (0, 1),而且是空心的 */
{
  await page.goto(BASE + 'sin-over-x', { waitUntil: 'networkidle' });
  await page.waitForTimeout(250);
  const hole = await page.evaluate(() => {
    const el = document.querySelector('[data-hole]');
    return el ? { fill: el.getAttribute('fill'), stroke: el.getAttribute('stroke') } : null;
  });
  if (!hole) note('sin x / x draws no hole at (0, 1)');
  else if (hole.fill !== '#0b1020') note(`the hole at (0, 1) is filled with ${hole.fill} — that says the value exists`);
  const text = await page.evaluate(() => document.body.innerText);
  if (!/not a proof/i.test(text)) note('sin x / x never says numerical evidence is not a proof');
  if (!/RADIANS/i.test(text)) note('sin x / x never states that theta is in radians');
}

await browser.close();
server.close();
console.log(`checked ${LESSONS.length} lessons · ${zoomsChecked} zoom sweeps · ${factorPanelsChecked} factor panels`);
if (errors.length) { console.error('✗\n' + errors.slice(0, 30).map((e) => '  ' + e).join('\n')); process.exit(1); }
console.log('✓ all six special limits clean');
