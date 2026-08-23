/**
 * 「Nondecreasing Functions」的浏览器专项检查。
 *
 * ⚠️ 这里的期望值**不从 `src/math/nondecreasing.ts` 拿**,而是在本文件里
 * 按图形重新手写一遍分段公式。从被测模块里取期望等于自己验自己 ——
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
const URL = `http://localhost:${PORT}/#/nondecreasing`;

/** 独立重写的一份分段公式 —— 与被测模块没有任何共享代码。 */
const F = {
  steps: (x) => (x <= 2 ? 1 : x <= 4 ? 1 + (x - 2) : x <= 6 ? 3 : 3 + (x - 6)),
  dip: (x) => (x <= 2 ? 1 : x <= 4 ? 1 + (x - 2) : x <= 5 ? 3 - (x - 4) : 2 + (x - 5)),
};
const EPS = 1e-6;
const expectShape = (id, x1, x2) => {
  const d = F[id](x2) - F[id](x1);
  return d > EPS ? 'up' : d < -EPS ? 'down' : 'flat';
};

mkdirSync(OUT, { recursive: true });
const errors = [];
const note = (m) => errors.push(m);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 2 });
page.on('console', (m) => { if (m.type() === 'error') note(`console: ${m.text()}`); });
page.on('pageerror', (e) => note(`pageerror: ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-panel="live-rule"]', { timeout: 20000 });

const slider = (name) => page.getByRole('slider', { name });
const readState = () =>
  page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const sliders = [...document.querySelectorAll('[role="slider"]')];
    return {
      x1: Number(sliders[0]?.getAttribute('aria-valuenow')),
      x2: Number(sliders[1]?.getAttribute('aria-valuenow')),
      shape: q('[data-panel="live-rule"]')?.getAttribute('data-shape'),
      verdict: q('[data-panel="live-rule"]')?.getAttribute('data-verdict'),
      strict: q('[data-relation="strictly-increasing"]')?.getAttribute('data-relation-holds'),
      nondec: q('[data-relation="nondecreasing"]')?.getAttribute('data-relation-holds'),
      active: q('[data-panel="mental-model"]')?.getAttribute('data-active'),
      graph: q('[role="tab"][aria-selected="true"]')?.getAttribute('data-graph'),
      text: document.body.innerText,
    };
  });

/* ── ① 两个图上扫一遍滑块 ─────────────────────────────────────────── */
let samples = 0;
/** ⚠️ 扫过程中**真的见到过**哪几种形状。见下面第 ② 段。 */
const observed = { steps: new Set(), dip: new Set() };
for (const graphId of ['steps', 'dip']) {
  await page.locator(`[role="tab"][data-graph="${graphId}"]`).click();
  await page.waitForTimeout(120);

  // ⚠️ 起点里**必须**有 40(x₁ = 4.0)。dip 图上只有 x₁ 落在峰顶附近时,
  //    往右扫才会真的走进下坡 —— 起点全取 0/2.5/5 的话,'down' 一次都不会出现,
  //    整轮扫描对这一节最要紧的那个状态**什么也没验到**。
  for (const start of [0, 25, 40, 50]) {
    // x₁ 先归零再右移 start 格,x₂ 从 x₁ 右边一格开始往右扫
    await slider('x₁').focus();
    await page.keyboard.press('Home');
    for (let i = 0; i < start; i += 1) await page.keyboard.press('ArrowRight');
    await slider('x₂').focus();
    await page.keyboard.press('Home'); // 会被最小间隔顶回 x₁ 右边一格

    for (let i = 0; i < 26; i += 1) {
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      const s = await readState();
      samples += 1;

      if (!(s.x1 < s.x2)) note(`[${graphId}] order broke: x1=${s.x1} x2=${s.x2}`);
      const want = expectShape(graphId, s.x1, s.x2);
      observed[graphId].add(want);
      if (s.shape !== want) note(`[${graphId}] x1=${s.x1} x2=${s.x2}: shape says "${s.shape}", independent formula says "${want}"`);
      if (s.verdict !== (want === 'down' ? 'broken' : 'holds')) note(`[${graphId}] x1=${s.x1} x2=${s.x2}: verdict "${s.verdict}" disagrees with shape "${want}"`);
      // ⭐ 这一节的全部内容:平坦时 `<` 失败而 `≤` 成立
      if (s.strict !== (want === 'up' ? 'yes' : 'no')) note(`[${graphId}] x1=${s.x1} x2=${s.x2}: strict "${s.strict}" wrong for "${want}"`);
      if (s.nondec !== (want === 'down' ? 'no' : 'yes')) note(`[${graphId}] x1=${s.x1} x2=${s.x2}: nondecreasing "${s.nondec}" wrong for "${want}"`);
      if (s.active !== s.shape) note(`[${graphId}] mental model shows "${s.active}" but the pair is "${s.shape}"`);
      if (/NaN|Infinity|undefined/.test(s.text)) note(`[${graphId}] x1=${s.x1} x2=${s.x2}: NaN/Infinity/undefined leaked onto the page`);
    }
  }
}

/* ── ② 扫的过程中三种形状都真的出现过 ─────────────────────────────── */
// ⚠️ 这一段是给**测试本身**的检查,不是给产品的。
//    扫了一百多个位置却一次也没见过 'down',上面那一大堆断言就等于没跑 ——
//    第一版正是这样:起点取 0 / 2.5 / 5,dip 图上永远从低处往高处看,
//    绿灯全亮,而这一节最要紧的那个状态一次都没被验到。
for (const want of ['up', 'flat']) {
  if (!observed.steps.has(want)) note(`the sweep never produced "${want}" on the steps graph — those assertions ran vacuously`);
}
for (const want of ['up', 'flat', 'down']) {
  if (!observed.dip.has(want)) note(`the sweep never produced "${want}" on the dip graph — those assertions ran vacuously`);
}
if (observed.steps.has('down')) note('the steps graph produced a falling pair — it is supposed to be nondecreasing');

/* ── ③ 平坦预设:`<` 与 `≤` 分道扬镳 ──────────────────────────────── */
await page.locator('[role="tab"][data-graph="steps"]').click();
await page.locator('[data-preset="Both on a flat stretch"]').click();
await page.waitForTimeout(150);
{
  const s = await readState();
  if (s.shape !== 'flat') note(`the "flat stretch" preset landed on "${s.shape}", not flat`);
  if (s.strict !== 'no' || s.nondec !== 'yes') note(`on a flat pair, strict=${s.strict} nondecreasing=${s.nondec} — the whole lesson is that these differ`);
  const split = await page.locator('[data-split]').getAttribute('data-split');
  if (split !== 'yes') note('the "one symbol apart" callout did not fire on a flat pair');
  await page.screenshot({ path: join(OUT, 'nd-1-flat.png') });
}

/* ── ④ Break it:提示给出的一对真的会失败,而且状态会记住 ──────────── */
await page.locator('[data-action="break-it"]').click();
await page.waitForTimeout(150);
{
  const before = await page.locator('[data-panel="break-it"]').getAttribute('data-found');
  if (before !== 'no') note(`the dip graph opened already marked as broken (${before})`);
  await page.screenshot({ path: join(OUT, 'nd-2-dip-before.png') });

  await page.locator('[data-action="show-counterexample"]').click();
  await page.waitForTimeout(200);
  const s = await readState();
  if (s.shape !== 'down') note(`"Show me one" produced a "${s.shape}" pair — the hint does not actually break the rule`);
  const found = await page.locator('[data-panel="break-it"]').getAttribute('data-found');
  if (found !== 'yes') note('finding a counterexample did not latch');
  await page.screenshot({ path: join(OUT, 'nd-3-broken.png') });

  // ⚠️ 拖走之后**仍然**记着找到过 —— 否则学生一动就前功尽弃
  await slider('x₁').focus();
  await page.keyboard.press('Home');
  await page.waitForTimeout(150);
  const stillFound = await page.locator('[data-panel="break-it"]').getAttribute('data-found');
  if (stillFound !== 'yes') note('the "you broke it" state disappeared as soon as the pair moved');
}

/* ── ⑤ 整张图的结论 ───────────────────────────────────────────────── */
{
  const dip = await page.locator('[data-whole-graph]').getAttribute('data-whole-graph');
  if (dip !== 'refuted') note(`the dip graph reports "${dip}" for the whole function`);
  await page.locator('[role="tab"][data-graph="steps"]').click();
  await page.waitForTimeout(150);
  const steps = await page.locator('[data-whole-graph]').getAttribute('data-whole-graph');
  if (steps !== 'holds-on-grid') note(`the steps graph reports "${steps}" for the whole function`);
  // ⚠️ 措辞不许自称"证明了每一对" —— 有限抽样证明不了 ∀
  const body = await page.evaluate(() => document.body.innerText);
  for (const forbidden = 'we checked every pair'; body.toLowerCase().includes(forbidden); ) {
    note('the page claims to have checked every pair');
    break;
  }
}

/* ── ⑥ 没有一行 SVG 文字跑出取景框 ────────────────────────────────── */
for (const [graphId, pair] of [['steps', [0, 8]], ['dip', [4, 5]]]) {
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
  for (const b of escaped) note(`[${graphId} ${pair.join('→')}] SVG text outside the viewBox: ${b}`);
  await page.screenshot({ path: join(OUT, `nd-4-${graphId}-wide.png`) });
}

/* ── ⑦ 图上任意两行字都不许叠在一起 ───────────────────────────────── */
/*
  ⚠️ 这一条是这一节写出来的最有用的检查。
  前两版截图里出现过两次文字互相压住:
    ① 两点等高时,两个坐标标签 + "same height" 叠成 `s(0:4he1i0)t`;
    ② 下坡段的 "↘ down" 与当前这一对的 "↘ went down" 糊在一起。
  两次都是我盯着截图才发现的。位置是随两点移动的,靠人眼抽查必然漏 ——
  所以改成**扫一遍位置,逐对量文字包围盒**。
*/
{
  const overlaps = [];
  for (const graphId of ['steps', 'dip']) {
    await page.locator(`[role="tab"][data-graph="${graphId}"]`).click();
    await page.waitForTimeout(120);
    await slider('x₁').focus();
    await page.keyboard.press('Home');
    for (let i = 0; i < 22; i += 1) {
      // x₁ 每次右移 0.4,x₂ 被最小间隔推着走 —— 覆盖一整条行程
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
            const area = w * h;
            const smaller = Math.min(A.width * A.height, B.width * B.height);
            // 压住小于两成算擦边,不报;超过就是真的读不清了
            if (area > smaller * 0.2) out.push(`"${boxes[a].t}" × "${boxes[c].t}"`);
          }
        }
        return out;
      });
      for (const b of bad) {
        const s = await readState();
        overlaps.push(`[${graphId} x1=${s.x1} x2=${s.x2}] ${b}`);
      }
    }
  }
  // 同一对文字在相邻位置会重复报,去个重再输出
  for (const o of [...new Set(overlaps.map((s) => s.replace(/x1=[\d.]+ x2=[\d.]+/, '…')))]) {
    note(`labels collide: ${o}`);
  }
}

/* ── ⑧ 键盘可达 ───────────────────────────────────────────────────── */
{
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-panel="live-rule"]');
  const reachable = await page.evaluate(() =>
    [...document.querySelectorAll('[role="slider"], button, a')].every((el) => el.tabIndex >= 0),
  );
  if (!reachable) note('something interactive is not reachable by keyboard');
}

await browser.close();
server.close();
console.log(`sampled ${samples} slider positions`);
if (errors.length) { console.error('✗\n' + errors.slice(0, 25).map((e) => '  ' + e).join('\n') + (errors.length > 25 ? `\n  … and ${errors.length - 25} more` : '')); process.exit(1); }
console.log('✓ nondecreasing lab clean');
