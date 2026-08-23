/**
 * 「Nondecreasing / Nonincreasing Functions」的浏览器专项检查。
 * **两节课跑同一套断言** —— 它们共用一个组件,只测一边等于把另一边整个放空。
 *
 * ⚠️ 这里的期望值**不从 `src/math/weakMonotonicity.ts` 拿**,而是在本文件里
 * 按四张图重新手写一遍分段公式。从被测模块里取期望等于自己验自己 ——
 * 那样测的只是"渲染层有没有把数字原样搬过去",而不是"屏幕上的结论对不对"。
 *
 * ⚠️ 一切状态都从 `data-*` 属性读,不搜页面文案。
 * 这个项目里已经有三次因为读文案而误判的记录(KaTeX 读不出、CSS uppercase、常驻对照表)。
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SHOT_DIR ?? join(HERE, 'screenshots');
const DIST = join(HERE, '..', '..', 'dist');
const PORT = Number(process.env.SHOT_PORT ?? 4191);
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
const BASE = `http://localhost:${PORT}/`;

/** 独立重写的四份分段公式 —— 与被测模块没有任何共享代码。 */
const F = {
  steps: (x) => (x <= 2 ? 1 : x <= 4 ? 1 + (x - 2) : x <= 6 ? 3 : 3 + (x - 6)),
  dip: (x) => (x <= 2 ? 1 : x <= 4 ? 1 + (x - 2) : x <= 5 ? 3 - (x - 4) : 2 + (x - 5)),
  fallingSteps: (x) => (x <= 2 ? 5 - x : x <= 6 ? 3 : 3 - (x - 6)),
  bump: (x) => (x <= 3 ? 5 - x : x <= 4 ? 2 + (x - 3) : x <= 6 ? 3 : 3 - (x - 6)),
};
const EPS = 1e-6;
const expectShape = (id, x1, x2) => {
  const d = F[id](x2) - F[id](x1);
  return d > EPS ? 'up' : d < -EPS ? 'down' : 'flat';
};

/** 每节课的方向常量,同样独立写死,不从模块 import。 */
const LESSONS = [
  {
    route: 'nondecreasing',
    title: 'Nondecreasing Functions',
    good: 'steps',
    broken: 'dip',
    forbidden: 'down',
    required: 'up',
    weakRelation: 'nondecreasing',
    strictRelation: 'strictly-increasing',
    // ⚠️ 起点必须覆盖到犯规那一段的左端,否则 forbidden 一次都不会出现
    starts: [0, 25, 40, 50],
    flatPreset: 'Both on a flat stretch',
  },
  {
    route: 'nonincreasing',
    title: 'Nonincreasing Functions',
    good: 'fallingSteps',
    broken: 'bump',
    forbidden: 'up',
    required: 'down',
    weakRelation: 'nonincreasing',
    strictRelation: 'strictly-decreasing',
    starts: [0, 25, 30, 50],
    flatPreset: 'Both on a flat stretch',
  },
];

mkdirSync(OUT, { recursive: true });
const errors = [];
const note = (m) => errors.push(m);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 2 });
page.on('console', (m) => { if (m.type() === 'error') note(`console: ${m.text()}`); });
page.on('pageerror', (e) => note(`pageerror: ${e.message}`));

const slider = (name) => page.getByRole('slider', { name });
const readState = (lesson) =>
  page.evaluate(({ weakRelation, strictRelation }) => {
    const q = (s) => document.querySelector(s);
    const sliders = [...document.querySelectorAll('[role="slider"]')];
    return {
      x1: Number(sliders[0]?.getAttribute('aria-valuenow')),
      x2: Number(sliders[1]?.getAttribute('aria-valuenow')),
      shape: q('[data-panel="live-rule"]')?.getAttribute('data-shape'),
      verdict: q('[data-panel="live-rule"]')?.getAttribute('data-verdict'),
      strict: q(`[data-relation="${strictRelation}"]`)?.getAttribute('data-relation-holds'),
      weak: q(`[data-relation="${weakRelation}"]`)?.getAttribute('data-relation-holds'),
      active: q('[data-panel="mental-model"]')?.getAttribute('data-active'),
      graph: q('[role="tab"][aria-selected="true"]')?.getAttribute('data-graph'),
      text: document.body.innerText,
    };
  }, { weakRelation: lesson.weakRelation, strictRelation: lesson.strictRelation });

let samples = 0;

for (const lesson of LESSONS) {
  await page.goto(`${BASE}#/${lesson.route}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-panel="live-rule"]', { timeout: 20000 });

  const h1 = (await page.locator('h1').first().innerText()).trim();
  if (h1 !== lesson.title) note(`[${lesson.route}] header says "${h1}"`);

  // ⚠️ 换课时组件被复用,状态可能还停在上一节的图上。
  const opened = await page.locator('[role="tab"][aria-selected="true"]').getAttribute('data-graph');
  if (opened !== lesson.good) note(`[${lesson.route}] opened on graph "${opened}", expected "${lesson.good}"`);

  /* ── ① 两张图上扫一遍滑块 ─────────────────────────────────────── */
  const observed = { [lesson.good]: new Set(), [lesson.broken]: new Set() };
  for (const graphId of [lesson.good, lesson.broken]) {
    await page.locator(`[role="tab"][data-graph="${graphId}"]`).click();
    await page.waitForTimeout(120);

    for (const start of lesson.starts) {
      await slider('x₁').focus();
      await page.keyboard.press('Home');
      for (let i = 0; i < start; i += 1) await page.keyboard.press('ArrowRight');
      await slider('x₂').focus();
      await page.keyboard.press('Home'); // 会被最小间隔顶回 x₁ 右边一格

      for (let i = 0; i < 26; i += 1) {
        for (let k = 0; k < 3; k += 1) await page.keyboard.press('ArrowRight');
        const s = await readState(lesson);
        samples += 1;

        if (!(s.x1 < s.x2)) note(`[${graphId}] order broke: x1=${s.x1} x2=${s.x2}`);
        const want = expectShape(graphId, s.x1, s.x2);
        observed[graphId].add(want);
        const allowed = want !== lesson.forbidden;

        if (s.shape !== want) note(`[${graphId}] x1=${s.x1} x2=${s.x2}: shape says "${s.shape}", independent formula says "${want}"`);
        if (s.verdict !== (allowed ? 'holds' : 'broken')) note(`[${graphId}] x1=${s.x1} x2=${s.x2}: verdict "${s.verdict}" disagrees with "${want}"`);
        // ⭐ 这两节课的全部内容:平坦时严格版本失败而弱版本成立
        if (s.strict !== (want === lesson.required ? 'yes' : 'no')) note(`[${graphId}] x1=${s.x1} x2=${s.x2}: strict "${s.strict}" wrong for "${want}"`);
        if (s.weak !== (allowed ? 'yes' : 'no')) note(`[${graphId}] x1=${s.x1} x2=${s.x2}: weak "${s.weak}" wrong for "${want}"`);
        if (s.active !== s.shape) note(`[${graphId}] mental model shows "${s.active}" but the pair is "${s.shape}"`);
        if (/NaN|Infinity|undefined/.test(s.text)) note(`[${graphId}] x1=${s.x1} x2=${s.x2}: NaN/Infinity/undefined leaked onto the page`);
      }
    }
  }

  /* ── ② 扫的过程中该出现的形状都真的出现过 ─────────────────────── */
  // ⚠️ 这一段是给**测试本身**的检查。扫了上百个位置却一次没见过 forbidden,
  //    上面那一大堆断言就等于没跑 —— 非递减那一版正是这么空跑过一轮。
  for (const want of [lesson.required, 'flat']) {
    if (!observed[lesson.good].has(want)) note(`[${lesson.route}] the sweep never produced "${want}" on ${lesson.good} — those assertions ran vacuously`);
  }
  for (const want of ['up', 'flat', 'down']) {
    if (!observed[lesson.broken].has(want)) note(`[${lesson.route}] the sweep never produced "${want}" on ${lesson.broken} — those assertions ran vacuously`);
  }
  if (observed[lesson.good].has(lesson.forbidden)) {
    note(`[${lesson.route}] ${lesson.good} produced a "${lesson.forbidden}" pair — that graph is supposed to satisfy the rule`);
  }

  /* ── ③ 平坦预设:严格与弱分道扬镳 ─────────────────────────────── */
  await page.locator(`[role="tab"][data-graph="${lesson.good}"]`).click();
  await page.locator(`[data-preset="${lesson.flatPreset}"]`).click();
  await page.waitForTimeout(150);
  {
    const s = await readState(lesson);
    if (s.shape !== 'flat') note(`[${lesson.route}] the flat preset landed on "${s.shape}"`);
    if (s.strict !== 'no' || s.weak !== 'yes') note(`[${lesson.route}] on a flat pair strict=${s.strict} weak=${s.weak} — the whole lesson is that these differ`);
    const split = await page.locator('[data-split]').getAttribute('data-split');
    if (split !== 'yes') note(`[${lesson.route}] the "one symbol apart" callout did not fire on a flat pair`);
    await page.screenshot({ path: join(OUT, `wm-${lesson.route}-1-flat.png`) });
  }

  /* ── ④ 三格面板:被禁的那一格排在最后,而且只有它标 not allowed ── */
  {
    const cells = await page.evaluate(() =>
      [...document.querySelectorAll('[data-panel="mental-model"] [data-cell]')].map((el) => ({
        cell: el.getAttribute('data-cell'),
        allowed: el.getAttribute('data-allowed'),
      })),
    );
    if (cells.length !== 3) note(`[${lesson.route}] mental model has ${cells.length} cells`);
    const banned = cells.filter((c) => c.allowed === 'no');
    if (banned.length !== 1 || banned[0]?.cell !== lesson.forbidden) {
      note(`[${lesson.route}] mental model marks ${JSON.stringify(banned)} as forbidden, expected only "${lesson.forbidden}"`);
    }
    if (cells[2]?.cell !== lesson.forbidden) note(`[${lesson.route}] the forbidden cell is not last: ${cells.map((c) => c.cell).join(',')}`);
    if (cells.find((c) => c.cell === 'flat')?.allowed !== 'yes') note(`[${lesson.route}] flat is not marked allowed`);
  }

  /* ── ⑤ Break it:提示给出的一对真的会失败,而且状态会记住 ──────── */
  await page.locator('[data-action="break-it"]').click();
  await page.waitForTimeout(150);
  {
    const before = await page.locator('[data-panel="break-it"]').getAttribute('data-found');
    if (before !== 'no') note(`[${lesson.route}] the broken graph opened already marked as broken (${before})`);
    await page.screenshot({ path: join(OUT, `wm-${lesson.route}-2-before.png`) });

    await page.locator('[data-action="show-counterexample"]').click();
    await page.waitForTimeout(200);
    const s = await readState(lesson);
    if (s.shape !== lesson.forbidden) note(`[${lesson.route}] "Show me one" produced a "${s.shape}" pair — the hint does not break the rule`);
    const found = await page.locator('[data-panel="break-it"]').getAttribute('data-found');
    if (found !== 'yes') note(`[${lesson.route}] finding a counterexample did not latch`);
    await page.screenshot({ path: join(OUT, `wm-${lesson.route}-3-broken.png`) });

    // ⚠️ 拖走之后**仍然**记着找到过 —— 否则学生一动就前功尽弃
    await slider('x₁').focus();
    await page.keyboard.press('Home');
    await page.waitForTimeout(150);
    const still = await page.locator('[data-panel="break-it"]').getAttribute('data-found');
    if (still !== 'yes') note(`[${lesson.route}] the "you broke it" state disappeared as soon as the pair moved`);
  }

  /* ── ⑥ 整张图的结论 ───────────────────────────────────────────── */
  {
    const broken = await page.locator('[data-whole-graph]').getAttribute('data-whole-graph');
    if (broken !== 'refuted') note(`[${lesson.route}] the broken graph reports "${broken}"`);
    await page.locator(`[role="tab"][data-graph="${lesson.good}"]`).click();
    await page.waitForTimeout(150);
    const good = await page.locator('[data-whole-graph]').getAttribute('data-whole-graph');
    if (good !== 'holds-on-grid') note(`[${lesson.route}] the good graph reports "${good}"`);
    // ⚠️ 措辞不许自称"证明了每一对" —— 有限抽样证明不了 ∀
    const body = await page.evaluate(() => document.body.innerText);
    if (body.toLowerCase().includes('we checked every pair')) note(`[${lesson.route}] the page claims to have checked every pair`);
  }

  /* ── ⑦ 没有一行 SVG 文字跑出取景框 ────────────────────────────── */
  for (const graphId of [lesson.good, lesson.broken]) {
    await page.locator(`[role="tab"][data-graph="${graphId}"]`).click();
    await page.locator('[data-preset="End to end"]').click().catch(() => {});
    await page.waitForTimeout(200);
    const escaped = await page.evaluate(() => {
      const svg = document.querySelector('main svg');
      if (!svg) return ['no svg'];
      const vb = svg.viewBox.baseVal;
      const bad = [];
      for (const t of svg.querySelectorAll('text')) {
        const b = t.getBBox();
        if (b.x < vb.x - 0.5 || b.y < vb.y - 0.5 || b.x + b.width > vb.x + vb.width + 0.5 || b.y + b.height > vb.y + vb.height + 0.5) {
          bad.push(`"${t.textContent.trim()}" at x=${b.x.toFixed(0)} w=${b.width.toFixed(0)}`);
        }
      }
      return bad;
    });
    for (const b of escaped) note(`[${graphId}] SVG text outside the viewBox: ${b}`);
    await page.screenshot({ path: join(OUT, `wm-${lesson.route}-4-${graphId}-wide.png`) });
  }

  /* ── ⑧ 图上任意两行字都不许叠在一起 ───────────────────────────── */
  /*
    ⚠️ 这是非递减那一轮写出来的最有用的检查,抓到过三处肉眼没看出来的重叠。
    标签位置随两点移动,靠人眼抽查必然漏。
  */
  {
    const overlaps = [];
    for (const graphId of [lesson.good, lesson.broken]) {
      await page.locator(`[role="tab"][data-graph="${graphId}"]`).click();
      await page.waitForTimeout(120);
      await slider('x₁').focus();
      await page.keyboard.press('Home');
      for (let i = 0; i < 22; i += 1) {
        for (let k = 0; k < 4; k += 1) await page.keyboard.press('ArrowRight');
        const bad = await page.evaluate(() => {
          const svg = document.querySelector('main svg');
          const boxes = [...svg.querySelectorAll('text')].map((t) => ({ t: t.textContent.trim(), b: t.getBBox() }));
          const out = [];
          for (let a = 0; a < boxes.length; a += 1) {
            for (let c = a + 1; c < boxes.length; c += 1) {
              const A = boxes[a].b;
              const B = boxes[c].b;
              const w = Math.min(A.x + A.width, B.x + B.width) - Math.max(A.x, B.x);
              const h = Math.min(A.y + A.height, B.y + B.height) - Math.max(A.y, B.y);
              if (w <= 0 || h <= 0) continue;
              const smaller = Math.min(A.width * A.height, B.width * B.height);
              if (w * h > smaller * 0.2) out.push(`"${boxes[a].t}" × "${boxes[c].t}"`);
            }
          }
          return out;
        });
        for (const b of bad) overlaps.push(`[${graphId}] ${b}`);
      }
    }
    for (const o of [...new Set(overlaps)]) note(`labels collide: ${o}`);
  }

  /* ── ⑨ 键盘可达 ───────────────────────────────────────────────── */
  {
    const reachable = await page.evaluate(() =>
      [...document.querySelectorAll('[role="slider"], button, a')].every((el) => el.tabIndex >= 0),
    );
    if (!reachable) note(`[${lesson.route}] something interactive is not reachable by keyboard`);
  }
}

/* ── ⑩ 两节课确实用的是**不同**的图与符号 ─────────────────────────── */
// 共用一个组件最容易出的错就是"两页长得一模一样"。这里正面查一次。
{
  const grab = async (route) => {
    await page.goto(`${BASE}#/${route}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-panel="live-rule"]');
    return page.evaluate(() => ({
      curve: document.querySelector('main svg path')?.getAttribute('d'),
      relations: [...document.querySelectorAll('[data-relation]')].map((el) => el.getAttribute('data-relation')),
      forbidden: document.querySelector('[data-panel="mental-model"] [data-allowed="no"]')?.getAttribute('data-cell'),
    }));
  };
  const a = await grab('nondecreasing');
  const b = await grab('nonincreasing');
  if (a.curve === b.curve) note('both lessons draw the same curve');
  if (JSON.stringify(a.relations) === JSON.stringify(b.relations)) note(`both lessons show the same relations: ${a.relations}`);
  if (a.forbidden === b.forbidden) note(`both lessons forbid the same shape: ${a.forbidden}`);
  if (a.forbidden !== 'down' || b.forbidden !== 'up') note(`forbidden shapes are ${a.forbidden} / ${b.forbidden}`);
}

await browser.close();
server.close();
console.log(`sampled ${samples} slider positions across both lessons`);
if (errors.length) {
  console.error('✗\n' + errors.slice(0, 25).map((e) => '  ' + e).join('\n') + (errors.length > 25 ? `\n  … and ${errors.length - 25} more` : ''));
  process.exit(1);
}
console.log('✓ both weak-monotone lessons clean');
