/**
 * 首页专项检查 —— 只看首页,不跑八条链。
 *
 * 存在的理由:每次只动首页版式时,`shots.mjs` 要跑完全部推导链(好几分钟),
 * 而真正要看的只有这一页。断言与 `shots.mjs` 的 home 段保持一致,
 * 外加这一轮改版自己的几条:标题不许留、角标不许留、预览不许露黑边。
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SHOT_DIR ?? join(HERE, 'screenshots');
const DIST = join(HERE, '..', '..', 'dist');
const PORT = Number(process.env.SHOT_PORT ?? 4188);
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
const URL = `http://localhost:${PORT}/`;

mkdirSync(OUT, { recursive: true });
const errors = [];
const browser = await chromium.launch();

for (const [name, width, height] of [['desktop', 1440, 1200], ['mobile', 430, 1400]]) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${name}] console: ${m.text()}`); });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const cards = await page.locator('[data-lesson-card]').count();
  if (cards !== 38) errors.push(`[${name}] expected 38 cards, got ${cards}`);
  if (await page.locator('canvas').count() !== 0) errors.push(`[${name}] a canvas started on the landing page`);
  if (await page.locator('[data-concept-card]').count() !== 0) errors.push(`[${name}] the parked catalogue is back`);

  const body = await page.evaluate(() => document.body.innerText);
  // ⚠️ Jesse 明确要求删掉的三样东西。断言的是**页面上看不到**,不是代码里没写。
  for (const gone of ['Where do these formulas come from', 'PRECALCULUS · INTERACTIVE', 'Nothing is hard-coded', 'Definitions everyone thinks']) {
    if (body.toUpperCase().includes(gone.toUpperCase())) errors.push(`[${name}] "${gone}" is still on the page`);
  }
  // 旧金句一个都不许留在目录上
  for (const gone of ['Every Pair Must Work', 'The Symmetry Test', 'Does It Repeat', 'Connect Two Points', 'Drop to the Integer', 'Jump to the Integer', 'One Input. One Output', 'Where Is x Allowed']) {
    if (body.includes(gone)) errors.push(`[${name}] old title "${gone}" is still on the home page`);
  }
  // 概念名都在
  for (const want of ['Difference of Squares', 'Difference of Cubes', 'The Binomial Theorem', 'Geometric Series', 'Indeterminate Forms', 'Special Limit Explorer', 'Why tan x / x \u2192 1', 'Why (1 \u2212 cos x) / x \u2192 0', 'Why (1 \u2212 cos x) / x\u00b2 \u2192 \u00bd', 'Why (e\u02e3 \u2212 1) / x \u2192 1', 'Why ln(1 + x) / x \u2192 1', 'From Secant to Tangent', 'Why sin x / x \u2192 1', 'The Squeeze Theorem', 'Infinite Limits', 'The Epsilon-Delta Definition', 'Limit vs Function Value', 'One-Sided Limits', 'Increasing and Decreasing Intervals', 'Nondecreasing Functions', 'Nonincreasing Functions', 'Definition of a Function', 'Domain of a Function', 'Increasing Functions', 'Even and Odd Functions', 'Periodic Functions', 'Average Rate of Change', 'The Floor Function', 'The Ceiling Function', 'The Derivative', 'Riemann Sums', 'The Natural Log', 'The Shell Method', 'The Disk Method', 'The Unit Circle', 'Trig Derivatives', 'The Chain Rule', 'u-Substitution']) {
    if (!body.includes(want)) errors.push(`[${name}] concept name "${want}" is missing`);
  }

  // 角标没了:卡片里不该再有那种大写小标签
  for (const chip of ['DEFINITIONS', 'SYMMETRY', 'PERIODICITY', 'RATES', 'INTEGERS', 'FUNCTIONS', 'DOMAIN']) {
    const hit = await page.locator(`[data-lesson-card] >> text="${chip}"`).count();
    if (hit > 0) errors.push(`[${name}] the corner tag "${chip}" is still rendered`);
  }

  // 目录是文字索引,当前指到的那一课在右侧共用一块 live preview。
  // 预览盒子与 SVG 的实际绘制区必须严丝合缝,不能露出 letterbox。
  const fit = await page.evaluate(() => {
    return [...document.querySelectorAll('[data-active-preview] svg')].map((svg) => {
      const box = svg.parentElement.getBoundingClientRect();
      const drawn = svg.getBoundingClientRect();
      const style = getComputedStyle(svg.parentElement);
      const innerWidth = box.width - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth);
      const innerHeight = box.height - parseFloat(style.borderTopWidth) - parseFloat(style.borderBottomWidth);
      return { dw: Math.abs(innerWidth - drawn.width), dh: Math.abs(innerHeight - drawn.height), w: innerWidth, h: innerHeight };
    });
  });
  fit.forEach((f, i) => {
    if (f.dw > 1.5 || f.dh > 1.5) errors.push(`[${name}] preview ${i + 1} letterboxes: box ${f.w.toFixed(0)}×${f.h.toFixed(0)}, drawn off by ${f.dw.toFixed(1)}×${f.dh.toFixed(1)}`);
  });
  if (fit.length !== 1) errors.push(`[${name}] expected one shared live preview, got ${fit.length}`);

  // 鼠标或键盘指到哪一课,共享预览就必须跟到哪一课。
  for (const id of ['domain', 'epsilon-delta', 'geometric-series']) {
    await page.locator(`[data-lesson-card="${id}"]`).hover();
    const shown = await page.locator('[data-active-preview]').getAttribute('data-preview-for');
    if (shown !== id) errors.push(`[${name}] pointing at ${id} left the live preview on ${shown}`);
  }
  await page.evaluate(() => scrollTo(0, 0));

  // 卡片同排等高 —— "整齐"这件事要量,不能靠感觉
  const rows = await page.evaluate(() => {
    const map = new Map();
    for (const el of document.querySelectorAll('[data-lesson-card]')) {
      const r = el.getBoundingClientRect();
      const key = Math.round(r.top);
      map.set(key, [...(map.get(key) ?? []), Math.round(r.height)]);
    }
    return [...map.values()];
  });
  for (const row of rows) {
    if (new Set(row).size > 1) errors.push(`[${name}] cards in one row have different heights: ${row.join(', ')}`);
  }

  // 右上角两块板还在
  const toolbar = page.locator('[data-learning-tools]');
  if (!(await toolbar.getByRole('link', { name: 'Open calc type board' }).isVisible())) errors.push(`[${name}] Type board trigger went missing`);
  if (!(await toolbar.getByRole('button', { name: 'Open formula deck' }).isVisible())) errors.push(`[${name}] Formula deck trigger went missing`);

  // ⚠️ 工具条是 fixed 的,首页没有大标题之后,第一排卡片会往上顶 —— 别顶到工具条底下去。
  const clash = await page.evaluate(() => {
    const bar = document.querySelector('[data-learning-tools]').getBoundingClientRect();
    return [...document.querySelectorAll('[data-lesson-card]')].some((el) => {
      const r = el.getBoundingClientRect();
      return r.top < bar.bottom && r.bottom > bar.top && r.left < bar.right && r.right > bar.left;
    });
  });
  if (clash) errors.push(`[${name}] a lesson card slid underneath the fixed toolbar`);

  /*
   * 预览真的在动 —— 跨一整个循环采样。
   *
   * ⚠️ 第一版只取**最后一个** `circle,line,path` 的 cx / x1 / d。三处漏网:
   *   ① `polygon` 不在选择器里 —— 整张图由多边形组成的预览取到 undefined,
   *      签名恒为空字符串,于是"没动"和"取不到"长得一模一样;
   *   ② 只读 x1,而有的元素动的是 y1;
   *   ③ 只看一个元素,那个元素恰好静止就会误判。
   * 现在把**每个**几何元素的一组关键属性拼成签名:任何一处动了都算动。
   * 这样既不会漏,也不会因为"最后一个元素恰好是静态的"而误报。
   */
  const SIGNATURE = `[...svg.querySelectorAll('circle,line,path,polygon,rect,ellipse')]
    .map((el) => ['cx','cy','r','x1','y1','x2','y2','d','points','x','y','width','height','opacity','fill-opacity']
      .map((name) => el.getAttribute(name) ?? '').join('|'))
    .join(';')`;
  const frames = [];
  for (let i = 0; i < 6; i += 1) {
    frames.push(await page.evaluate(`(() => { const svg = document.querySelector('[data-active-preview] svg'); return svg ? ${SIGNATURE} : ''; })()`));
    await page.waitForTimeout(700);
  }
  if (frames[0].length < 10) errors.push(`[${name}] live preview produced an empty signature — the movement check would be vacuous`);
  if (new Set(frames).size < 2) errors.push(`[${name}] live preview never moves across a full loop`);

  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: join(OUT, `00-home-${name}.png`), fullPage: true });
  await page.close();
}

// 每张卡都能点进对应的课,而且课页标题也换成了概念名
const NAMES = {
  functions: 'Definition of a Function', domain: 'Domain of a Function',
  increasing: 'Increasing Functions', symmetry: 'Even and Odd Functions',
  nondecreasing: 'Nondecreasing Functions', nonincreasing: 'Nonincreasing Functions',
  'difference-of-squares': 'Difference of Squares',
  'difference-of-cubes': 'Difference of Cubes',
  'binomial-theorem': 'The Binomial Theorem',
  'geometric-series': 'Geometric Series',
  indeterminate: 'Indeterminate Forms',
  'tan-over-x': 'Why tan x / x \u2192 1',
  'cos-over-x': 'Why (1 \u2212 cos x) / x \u2192 0',
  'cos-over-x2': 'Why (1 \u2212 cos x) / x\u00b2 \u2192 \u00bd',
  'exp-over-x': 'Why (e\u02e3 \u2212 1) / x \u2192 1',
  'log-over-x': 'Why ln(1 + x) / x \u2192 1',
  'special-limits': 'Special Limit Explorer',
  intervals: 'Increasing and Decreasing Intervals', 'one-sided': 'One-Sided Limits', 'limit-vs-value': 'Limit vs Function Value', 'epsilon-delta': 'The Epsilon-Delta Definition', 'infinite-limits': 'Infinite Limits', squeeze: 'The Squeeze Theorem', 'sin-over-x': 'Why sin x / x \u2192 1', 'secant-to-tangent': 'From Secant to Tangent',
  periodic: 'Periodic Functions', secant: 'Average Rate of Change',
  floor: 'The Floor Function', ceiling: 'The Ceiling Function',
  'chain-rule': 'The Chain Rule',
  'u-substitution': 'u-Substitution',
};
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push(`[lesson] console: ${m.text()}`); });
for (const [id, title] of Object.entries(NAMES)) {
  await page.goto(`${URL}#/${id}`, { waitUntil: 'networkidle' });
  /*
   * ⚠️ **等到标题真的换掉**,不要固定睡 500 ms。
   * 每节课是一个 lazy chunk,换路由时旧页面会多留一瞬。
   * 课程一多,那一瞬就可能超过 500 ms —— 于是检查读到的是**上一课**的标题,
   * 报出一个根本不存在的"目录与页头不一致"。轮询比睡觉可靠。
   */
  await page
    .waitForFunction(
      (want) => document.querySelector('h1')?.textContent?.trim() === want,
      title,
      { timeout: 8000 },
    )
    .catch(() => {});
  const h1 = (await page.locator('h1').first().innerText()).trim();
  // ⚠️ 目录写着一个名字、点进去顶上是另一个名字,是最招人烦的一种不一致。
  if (h1 !== title) errors.push(`[lesson/${id}] card says "${title}" but the page header says "${h1}"`);
}
await page.close();

/*
 * ⭐⭐ 七条推导链 —— 它们的页头**不是**概念名(是当前那一步的标题),
 * 所以不能塞进上面的 NAMES 对照。这里按链自己的方式验:
 *   ① 3D 场景真的挂上了(canvas 存在);
 *   ② 步骤条写着这条链的名字和总步数;
 *   ③ 右上角的 fixed 工具条**没有压住**那行步骤条 —— 这是一次真事故的回归测试:
 *      桌面端 "Derivation chain · Shell Method · step 1 of 9" 曾被切成
 *      "DERIVATION" 加一个孤零零的数字;
 *   ④ 步骤大纲列出全部步骤,并把第 1 步标成当前。
 */
const CHAINS = {
  derivative: 'The Derivative', 'riemann-sum': 'Riemann Sums',
  'log-integral': 'The Natural Log', 'shell-method': 'Shell Method',
  'disk-method': 'Disk Method', 'unit-circle': 'Trigonometry',
  'trig-rates': 'Trig derivatives & integrals',
};
const chainPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
chainPage.on('console', (m) => { if (m.type() === 'error') errors.push(`[chain] console: ${m.text()}`); });
chainPage.on('pageerror', (e) => errors.push(`[chain] pageerror: ${e.message}`));
for (const [id, name] of Object.entries(CHAINS)) {
  await chainPage.goto(`${URL}#/${id}`, { waitUntil: 'networkidle' });
  await chainPage.waitForSelector('[data-step-outline]', { timeout: 8000 }).catch(() => {});
  const info = await chainPage.evaluate(() => {
    const bar = document.querySelector('[data-learning-tools]')?.getBoundingClientRect();
    const header = [...document.querySelectorAll('aside p')]
      .find((el) => el.textContent.includes('Derivation chain'));
    const box = header?.getBoundingClientRect();
    const steps = [...document.querySelectorAll('[data-step-outline]')];
    return {
      canvas: document.querySelectorAll('canvas').length,
      header: header?.textContent?.trim() ?? '',
      covered: !!(bar && box && box.top < bar.bottom && box.right > bar.left && box.left < bar.right),
      steps: steps.length,
      current: steps.filter((el) => el.dataset.stepOutline === 'current').length,
      firstIsCurrent: steps[0]?.dataset.stepOutline === 'current',
    };
  });
  if (info.canvas !== 1) errors.push(`[chain/${id}] expected one canvas, got ${info.canvas}`);
  if (!info.header.includes(name)) errors.push(`[chain/${id}] step header reads "${info.header}"`);
  // ⚠️ 这一条就是那次事故本身
  if (info.covered) errors.push(`[chain/${id}] the fixed toolbar still covers the step header`);
  const declared = Number(info.header.match(/of (\d+)/)?.[1] ?? 0);
  if (declared < 6) errors.push(`[chain/${id}] step header did not say how many steps there are: "${info.header}"`);
  if (info.steps !== declared) errors.push(`[chain/${id}] outline lists ${info.steps} steps but the header says ${declared}`);
  if (info.current !== 1 || !info.firstIsCurrent) errors.push(`[chain/${id}] outline does not mark step 1 as the current one`);
}
await chainPage.close();

/*
 * ⭐ 认不出的路由必须**说出来**。以前它静默渲染首页,地址栏还留着坏 hash ——
 * 于是"链接打错一个字"和"网站正常"在屏幕上一模一样。
 */
{
  const p404 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await p404.goto(`${URL}#/definitely-not-a-route`, { waitUntil: 'networkidle' });
  await p404.waitForTimeout(400);
  const shown = await p404.evaluate(() => ({
    home: !!document.querySelector('[data-home-shell]'),
    echoed: document.querySelector('[data-missing-route]')?.textContent?.trim() ?? '',
  }));
  if (shown.home) errors.push('[404] an unknown route still silently renders the home page');
  // ⚠️ 必须把那个名字回显出来 —— 打错字时那是唯一的线索
  if (!shown.echoed.includes('definitely-not-a-route')) errors.push(`[404] the bad route is not echoed back (saw "${shown.echoed}")`);
  await p404.close();
}

/*
 * ⭐ 390px 上**每一个**筛选都要在屏幕里。原来是单行横向滚动,没有任何提示,
 * "Algebra patterns" 整个落在屏幕外 —— 能滚到,但没人知道要滚。加了第五个分区之后更藏。
 */
{
  const pf = await browser.newPage({ viewport: { width: 390, height: 900 } });
  await pf.goto(URL, { waitUntil: 'networkidle' });
  await pf.waitForTimeout(600);
  const clipped = await pf.evaluate(() => {
    const nav = document.querySelector('.home-filters');
    const edge = nav.getBoundingClientRect().right;
    return [...nav.querySelectorAll('button')]
      .filter((b) => b.getBoundingClientRect().right > edge + 0.5)
      .map((b) => b.textContent.trim());
  });
  if (clipped.length) errors.push(`[mobile] these filters sit off-screen at 390px: ${clipped.join(', ')}`);
  const count = await pf.evaluate(() => document.querySelectorAll('.home-filters button').length);
  if (count !== 5) errors.push(`[mobile] expected 5 filter buttons, got ${count}`);
  await pf.close();
}

await browser.close();
server.close();
if (errors.length) { console.error('✗\n' + errors.map((e) => '  ' + e).join('\n')); process.exit(1); }
console.log(`✓ home + ${Object.keys(NAMES).length} lesson headers all clean`);
