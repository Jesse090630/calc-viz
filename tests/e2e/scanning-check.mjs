/**
 * 「Increasing and Decreasing Intervals / Scan the Curve」的浏览器专项检查。
 *
 * ⚠️ 期望值**在本文件里重写一遍**,不从 `src/math/scanning.ts` 拿。
 * 从被测模块取期望等于自己验自己 —— 那只能测出"渲染层有没有把值搬过去"。
 * 这里用的是一套完全不同的判据:**在窗口里密集取样,逐对比较**,
 * 与页面上那两条路径都不共享代码。
 *
 * ⚠️ 状态一律从 `data-*` 读,不搜文案。
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SHOT_DIR ?? join(HERE, 'screenshots');
const DIST = join(HERE, '..', '..', 'dist');
const PORT = Number(process.env.SHOT_PORT ?? 4193);
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
const URL = `http://localhost:${PORT}/#/intervals`;

/* ── 独立重写的曲线与判据 ─────────────────────────────────────────── */
const EPS = 1e-7;
const ease = (t) => (1 - Math.cos(Math.PI * t)) / 2;

/** 与页面同样的三条曲线,但这里从拐点表**另写一遍**求值。 */
const CURVES = {
  wave: { corners: [[3, 5], [7, 2]], k: 0.35 },
  plateau: { corners: [[1.5, 1], [3.5, 4.5], [6.5, 4.5], [8.5, 1.5]], k: 0.35 },
  challenge: { corners: [[2, 1.5], [4.5, 6], [7, 2.5]], k: 0.35 },
};

function f(id, x) {
  const { corners, k } = CURVES[id];
  const [fx, fy] = corners[0];
  const [lx, ly] = corners[corners.length - 1];
  // 第一段往上走 → 左臂往下(越往左越高);第一段往下 → 左臂往上
  const firstUp = corners[1][1] > fy;
  if (x <= fx) return fy + (firstUp ? 1 : -1) * k * (x - fx) ** 2;
  const lastUp = ly > corners[corners.length - 2][1];
  if (x >= lx) return ly + (lastUp ? -1 : 1) * k * (x - lx) ** 2;
  for (let i = 1; i < corners.length; i += 1) {
    const [ax, ay] = corners[i - 1];
    const [bx, by] = corners[i];
    if (x > bx) continue;
    if (Math.abs(by - ay) <= EPS) return ay;
    return ay + (by - ay) * ease((x - ax) / (bx - ax));
  }
  return ly;
}

/** 判据:窗口内密集取样,**逐对**比较。跨过极值必然同时出现升与降 → mixed。 */
function expectBehaviour(id, from, to) {
  const ys = [];
  for (let i = 0; i <= 120; i += 1) ys.push(f(id, from + ((to - from) * i) / 120));
  let allUp = true;
  let allDown = true;
  let allFlat = true;
  for (let i = 0; i < ys.length; i += 1) {
    for (let j = i + 1; j < ys.length; j += 1) {
      const d = ys[j] - ys[i];
      if (d > EPS) { allDown = false; allFlat = false; }
      else if (d < -EPS) { allUp = false; allFlat = false; }
      else { allUp = false; allDown = false; }
    }
  }
  if (allFlat) return 'flat';
  if (allUp) return 'up';
  if (allDown) return 'down';
  return 'mixed';
}

mkdirSync(OUT, { recursive: true });
const errors = [];
const note = (m) => errors.push(m);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 2 });
page.on('console', (m) => { if (m.type() === 'error') note(`console: ${m.text()}`); });
page.on('pageerror', (e) => note(`pageerror: ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-panel="verdict"]', { timeout: 20000 });

const band = () => page.getByRole('slider', { name: 'Scan window position' });
const startHandle = () => page.getByRole('slider', { name: 'start' });
const endHandle = () => page.getByRole('slider', { name: 'end' });

const readState = () =>
  page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const sliders = [...document.querySelectorAll('[role="slider"]')];
    const num = (el) => Number(el?.getAttribute('aria-valuenow'));
    // 顺序:band(先渲染)、start、end
    const byLabel = Object.fromEntries(sliders.map((el) => [el.getAttribute('aria-label'), el]));
    return {
      from: num(byLabel.start),
      to: num(byLabel.end),
      behaviour: q('[data-panel="verdict"]')?.getAttribute('data-behaviour'),
      parts: [...document.querySelectorAll('[data-part]')].map((el) => el.getAttribute('data-part')),
      onInterval: [...document.querySelectorAll('[data-interval][data-on="yes"]')].map((el) => el.getAttribute('data-interval')),
      curve: q('[role="tab"][aria-selected="true"]')?.getAttribute('data-curve'),
      text: document.body.innerText,
    };
  });

/* ── ① 三条曲线上把窗口扫一遍 ─────────────────────────────────────── */
let samples = 0;
const observed = {};
for (const curveId of ['wave', 'plateau', 'challenge']) {
  await page.locator(`[role="tab"][data-curve="${curveId}"]`).click();
  await page.waitForTimeout(140);
  observed[curveId] = new Set();

  // 三种宽度各扫一趟:窄的多半落在单一走向里,宽的必然跨过转折点
  for (const widthPresses of [0, 8, 24]) {
    // 先把窗口收到最左最窄,再按需要加宽
    await startHandle().focus();
    await page.keyboard.press('Home');
    await endHandle().focus();
    await page.keyboard.press('Home');
    for (let i = 0; i < widthPresses; i += 1) await page.keyboard.press('ArrowRight');

    await band().focus();
    await page.keyboard.press('Home');
    for (let step = 0; step < 24; step += 1) {
      for (let k = 0; k < 4; k += 1) await page.keyboard.press('ArrowRight');
      const s = await readState();
      samples += 1;

      if (!(s.from < s.to)) note(`[${curveId}] window collapsed: ${s.from} → ${s.to}`);
      const want = expectBehaviour(curveId, s.from, s.to);
      observed[curveId].add(want);
      if (s.behaviour !== want) {
        note(`[${curveId}] [${s.from}, ${s.to}]: page says "${s.behaviour}", independent sampler says "${want}"`);
      }
      // mixed 时才切块,而且切块数必须 ≥ 2
      if (want === 'mixed' && s.parts.length < 2) note(`[${curveId}] [${s.from}, ${s.to}]: mixed but only ${s.parts.length} parts listed`);
      if (want !== 'mixed' && s.parts.length !== 0) note(`[${curveId}] [${s.from}, ${s.to}]: not mixed but ${s.parts.length} parts listed`);
      // 单一走向时必须能指出所属区间;mixed 时不能
      if (want !== 'mixed' && s.onInterval.length !== 1) note(`[${curveId}] [${s.from}, ${s.to}]: ${s.onInterval.length} intervals highlighted for "${want}"`);
      if (want === 'mixed' && s.onInterval.length !== 0) note(`[${curveId}] [${s.from}, ${s.to}]: mixed but an interval is highlighted`);
      if (want !== 'mixed' && s.onInterval[0] && s.onInterval[0] !== want) {
        note(`[${curveId}] [${s.from}, ${s.to}]: highlighted interval is "${s.onInterval[0]}" but the window is "${want}"`);
      }
      if (/NaN|Infinity(?!\))|undefined/.test(s.text)) note(`[${curveId}] [${s.from}, ${s.to}]: NaN/undefined leaked onto the page`);
    }
  }
}

/* ── ② 扫描过程中四种结论都真的出现过 ─────────────────────────────── */
// ⚠️ 给测试自己的检查。上一节吃过亏:扫了一百多个位置,最要紧的那个状态一次没出现,
//    上面那堆断言等于空跑。
for (const [curveId, want] of [
  ['wave', ['down', 'mixed', 'up']],
  ['plateau', ['down', 'flat', 'mixed', 'up']],
  ['challenge', ['down', 'mixed', 'up']],
]) {
  const got = [...observed[curveId]].sort();
  for (const w of want) {
    if (!got.includes(w)) note(`[${curveId}] the sweep never produced "${w}" (saw ${got.join(',')}) — those assertions ran vacuously`);
  }
}

/* ── ③ 跨过极值时不许给出单一答案 ─────────────────────────────────── */
await page.locator('[role="tab"][data-curve="wave"]').click();
await page.locator('[data-preset="Across the top"]').click();
await page.waitForTimeout(180);
{
  const s = await readState();
  if (s.behaviour !== 'mixed') note(`the "across the top" preset reports "${s.behaviour}", expected mixed`);
  // ⭐ 这一节的全部内容:只比两端会给出一个确定但错误的答案
  const endpointsSay = f('wave', s.to) > f('wave', s.from) ? 'up' : 'down';
  if (s.behaviour === endpointsSay) note('the page agreed with the naive endpoint comparison across a turning point');
  if (s.parts.length !== 2) note(`mixed window split into ${s.parts.length} parts, expected 2`);
  const crossings = await page.locator('[data-panel="verdict"]').innerText();
  if (!/maximum|minimum/.test(crossings)) note('the mixed panel does not name the turning point');
  await page.screenshot({ path: join(OUT, 'scan-1-mixed.png') });
}

/* ── ④ 单一走向的三种情况各截一张 ─────────────────────────────────── */
for (const [preset, want, shot] of [
  ['A rising stretch', 'up', 'scan-2-increasing.png'],
  ['A falling stretch', 'down', 'scan-3-decreasing.png'],
]) {
  await page.locator(`[data-preset="${preset}"]`).click();
  await page.waitForTimeout(180);
  const s = await readState();
  if (s.behaviour !== want) note(`preset "${preset}" reports "${s.behaviour}", expected "${want}"`);
  await page.screenshot({ path: join(OUT, shot) });
}

await page.locator('[role="tab"][data-curve="plateau"]').click();
await page.locator('[data-preset="The flat stretch"]').click();
await page.waitForTimeout(180);
{
  const s = await readState();
  if (s.behaviour !== 'flat') note(`the flat preset reports "${s.behaviour}", expected flat`);
  await page.screenshot({ path: join(OUT, 'scan-4-constant.png') });
}

/* ── ⑤ 挑战:选中递增段才算过,而且过了就记住 ─────────────────────── */
await page.locator('[data-action="challenge"]').click();
await page.waitForTimeout(180);
{
  const before = await page.locator('[data-panel="challenge"]').getAttribute('data-solved');
  if (before !== 'no') note(`the challenge opened already solved (${before})`);

  // 拖到 challenge 曲线的递增段(极小 2 → 极大 4.5)。
  // ⚠️ **先放右端再放左端**。反过来的话左端会被"最小宽度"顶住:
  //    右端还在 1.6 时,左端最多只能推到 1.2,后面的按键全部落空 ——
  //    第一版就是这么写的,窗口落在 [1.2, 5.6](mixed),整个"通过"分支根本没被测到。
  //    是那条"fixture 必须真的是递增的"断言把它抓出来的。
  await endHandle().focus();
  await page.keyboard.press('Home');
  for (let i = 0; i < 32; i += 1) await page.keyboard.press('ArrowRight'); // end ≈ 4.0
  await startHandle().focus();
  await page.keyboard.press('Home');
  for (let i = 0; i < 25; i += 1) await page.keyboard.press('ArrowRight'); // start ≈ 2.5
  await page.waitForTimeout(180);

  const s = await readState();
  const want = expectBehaviour('challenge', s.from, s.to);
  if (want !== 'up') note(`the challenge fixture window [${s.from}, ${s.to}] is "${want}", not increasing — the check would not test the pass state`);
  const result = await page.locator('[data-panel="challenge"]').getAttribute('data-result');
  if (result !== 'pass') note(`challenge result is "${result}" on an increasing window`);
  const solved = await page.locator('[data-panel="challenge"]').getAttribute('data-solved');
  if (solved !== 'yes') note('solving the challenge did not latch');
  await page.screenshot({ path: join(OUT, 'scan-5-challenge-pass.png') });

  // 拖成跨过极大值 → 必须变成 mixed,但"已经找到过"仍然记着
  await endHandle().focus();
  for (let i = 0; i < 20; i += 1) await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(180);
  const after = await readState();
  if (expectBehaviour('challenge', after.from, after.to) !== 'mixed') {
    note(`the widened challenge window is "${expectBehaviour('challenge', after.from, after.to)}", expected mixed`);
  } else if (after.behaviour !== 'mixed') {
    note(`the widened challenge window reports "${after.behaviour}"`);
  }
  const still = await page.locator('[data-panel="challenge"]').getAttribute('data-solved');
  if (still !== 'yes') note('the solved state disappeared as soon as the window moved');
  await page.screenshot({ path: join(OUT, 'scan-6-challenge-mixed.png') });
}

/* ── ⑥ 拖端点时另一端钉住 ─────────────────────────────────────────── */
await page.locator('[role="tab"][data-curve="wave"]').click();
await page.waitForTimeout(140);
{
  const before = await readState();
  await startHandle().focus();
  for (let i = 0; i < 60; i += 1) await page.keyboard.press('ArrowRight'); // 往右拖过头
  await page.waitForTimeout(160);
  const after = await readState();
  if (Math.abs(after.to - before.to) > 0.001) note(`dragging the start handle moved the end handle: ${before.to} → ${after.to}`);
  if (!(after.from < after.to)) note('the window collapsed when the start handle was pushed past the end');
}

/* ── ⑦ 图上任意两行字都不许叠在一起 ───────────────────────────────── */
{
  const overlaps = [];
  for (const curveId of ['wave', 'plateau', 'challenge']) {
    await page.locator(`[role="tab"][data-curve="${curveId}"]`).click();
    await page.waitForTimeout(120);
    await band().focus();
    await page.keyboard.press('Home');
    for (let i = 0; i < 22; i += 1) {
      for (let k = 0; k < 5; k += 1) await page.keyboard.press('ArrowRight');
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
      for (const b of bad) overlaps.push(`[${curveId}] ${b}`);
    }
  }
  for (const o of [...new Set(overlaps)]) note(`labels collide: ${o}`);
}

/* ── ⑧ 没有一行 SVG 文字跑出取景框 ────────────────────────────────── */
{
  const escaped = await page.evaluate(() => {
    const svg = document.querySelector('main svg');
    const vb = svg.viewBox.baseVal;
    const bad = [];
    for (const t of svg.querySelectorAll('text')) {
      const b = t.getBBox();
      if (b.x < vb.x - 0.5 || b.y < vb.y - 0.5 || b.x + b.width > vb.x + vb.width + 0.5 || b.y + b.height > vb.y + vb.height + 0.5) {
        bad.push(`"${t.textContent.trim()}"`);
      }
    }
    return bad;
  });
  for (const b of escaped) note(`SVG text outside the viewBox: ${b}`);
}

/* ── ⑨ 小圆点真的在动 ─────────────────────────────────────────────── */
{
  const frames = [];
  for (let i = 0; i < 5; i += 1) {
    frames.push(await page.evaluate(() => {
      const circles = [...document.querySelectorAll('main svg circle')];
      return circles.map((c) => c.getAttribute('cx')).join('|');
    }));
    await page.waitForTimeout(320);
  }
  if (new Set(frames).size < 2) note('the travelling dot never moves');
}

/* ── ⑩ 键盘可达 ───────────────────────────────────────────────────── */
{
  const reachable = await page.evaluate(() =>
    [...document.querySelectorAll('[role="slider"], button, a')].every((el) => el.tabIndex >= 0),
  );
  if (!reachable) note('something interactive is not reachable by keyboard');
}

await browser.close();
server.close();
console.log(`sampled ${samples} scanner positions`);
if (errors.length) {
  console.error('✗\n' + errors.slice(0, 25).map((e) => '  ' + e).join('\n') + (errors.length > 25 ? `\n  … and ${errors.length - 25} more` : ''));
  process.exit(1);
}
console.log('✓ scan-the-curve clean');
