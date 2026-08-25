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
  if (cards !== 18) errors.push(`[${name}] expected 18 cards, got ${cards}`);
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
  for (const want of ['From Secant to Tangent', 'Why sin x / x \u2192 1', 'The Squeeze Theorem', 'Infinite Limits', 'The Epsilon-Delta Definition', 'Limit vs Function Value', 'One-Sided Limits', 'Increasing and Decreasing Intervals', 'Nondecreasing Functions', 'Nonincreasing Functions', 'Definition of a Function', 'Domain of a Function', 'Increasing Functions', 'Even and Odd Functions', 'Periodic Functions', 'Average Rate of Change', 'The Floor Function', 'The Ceiling Function']) {
    if (!body.includes(want)) errors.push(`[${name}] concept name "${want}" is missing`);
  }

  // 角标没了:卡片里不该再有那种大写小标签
  for (const chip of ['DEFINITIONS', 'SYMMETRY', 'PERIODICITY', 'RATES', 'INTEGERS', 'FUNCTIONS', 'DOMAIN']) {
    const hit = await page.locator(`[data-lesson-card] >> text="${chip}"`).count();
    if (hit > 0) errors.push(`[${name}] the corner tag "${chip}" is still rendered`);
  }

  // ⚠️ 预览盒子与 SVG 的实际绘制区必须**严丝合缝**。
  //    比例对不上时 `meet` 会让 SVG 缩在盒子中间,上下或左右露出黑边 —— 看着像图没加载完。
  const fit = await page.evaluate(() => {
    return [...document.querySelectorAll('[data-lesson-card] svg')].map((svg) => {
      const box = svg.parentElement.getBoundingClientRect();
      const drawn = svg.getBoundingClientRect();
      return { dw: Math.abs(box.width - drawn.width), dh: Math.abs(box.height - drawn.height), w: box.width, h: box.height };
    });
  });
  fit.forEach((f, i) => {
    if (f.dw > 1.5 || f.dh > 1.5) errors.push(`[${name}] preview ${i + 1} letterboxes: box ${f.w.toFixed(0)}×${f.h.toFixed(0)}, drawn off by ${f.dw.toFixed(1)}×${f.dh.toFixed(1)}`);
  });

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

  // 预览真的在动 —— 取**最后一个**几何元素,跨一整个循环采样
  const frames = [];
  for (let i = 0; i < 6; i += 1) {
    frames.push(await page.evaluate(() => [...document.querySelectorAll('[data-lesson-card] svg')].map((svg) => {
      const last = [...svg.querySelectorAll('circle,line,path')].pop();
      return `${last?.getAttribute('cx') ?? last?.getAttribute('x1') ?? last?.getAttribute('d')?.slice(-30) ?? ''}`;
    })));
    await page.waitForTimeout(700);
  }
  for (let c = 0; c < cards; c += 1) {
    if (new Set(frames.map((f) => f[c])).size < 2) errors.push(`[${name}] preview ${c + 1} never moves across a full loop`);
  }

  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: join(OUT, `00-home-${name}.png`), fullPage: true });
  await page.close();
}

// 每张卡都能点进对应的课,而且课页标题也换成了概念名
const NAMES = {
  functions: 'Definition of a Function', domain: 'Domain of a Function',
  increasing: 'Increasing Functions', symmetry: 'Even and Odd Functions',
  nondecreasing: 'Nondecreasing Functions', nonincreasing: 'Nonincreasing Functions',
  intervals: 'Increasing and Decreasing Intervals', 'one-sided': 'One-Sided Limits', 'limit-vs-value': 'Limit vs Function Value', 'epsilon-delta': 'The Epsilon-Delta Definition', 'infinite-limits': 'Infinite Limits', squeeze: 'The Squeeze Theorem', 'sin-over-x': 'Why sin x / x \u2192 1', 'secant-to-tangent': 'From Secant to Tangent',
  periodic: 'Periodic Functions', secant: 'Average Rate of Change',
  floor: 'The Floor Function', ceiling: 'The Ceiling Function',
};
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push(`[lesson] console: ${m.text()}`); });
for (const [id, title] of Object.entries(NAMES)) {
  await page.goto(`${URL}#/${id}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const h1 = (await page.locator('h1').first().innerText()).trim();
  // ⚠️ 目录写着一个名字、点进去顶上是另一个名字,是最招人烦的一种不一致。
  if (h1 !== title) errors.push(`[lesson/${id}] card says "${title}" but the page header says "${h1}"`);
}
await page.close();

await browser.close();
server.close();
if (errors.length) { console.error('✗\n' + errors.map((e) => '  ' + e).join('\n')); process.exit(1); }
console.log(`✓ home + ${Object.keys(NAMES).length} lesson headers all clean`);
