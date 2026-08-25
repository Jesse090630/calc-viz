/**
 * 「One-Sided Limits / Two Sides. One Destination.」的浏览器专项检查。
 *
 * ⚠️ 期望值在本文件里**另写一遍**,不从 `src/math/oneSidedLimits.ts` 拿。
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
const PORT = Number(process.env.SHOT_PORT ?? 4195);
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
const URL = `http://localhost:${PORT}/#/one-sided`;

/** 独立重写的两条函数。 */
const F = {
  square: { a: 2, left: (x) => x * x, right: (x) => x * x, agree: true },
  jump: { a: 2, left: (x) => x, right: (x) => x + 3, agree: false },
};
// ⚠️ 屏幕上的 x 和 f 都被四舍五入到三位,两边各自最多差半个末位 ——
// 容差必须至少覆盖 1e-3,否则会把"正确的舍入"报成"算错了"。
const EPS = 1.1e-3;

mkdirSync(OUT, { recursive: true });
const errors = [];
const note = (m) => errors.push(m);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 2 });
page.on('console', (m) => { if (m.type() === 'error') note(`console: ${m.text()}`); });
page.on('pageerror', (e) => note(`pageerror: ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-panel="verdict"]', { timeout: 20000 });

const handle = (name) => page.getByRole('slider', { name });
const readState = () =>
  page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const sliders = Object.fromEntries(
      [...document.querySelectorAll('[role="slider"]')].map((el) => [el.getAttribute('aria-label'), Number(el.getAttribute('aria-valuenow'))]),
    );
    const panel = (side) => q(`[data-panel="side"][data-side="${side}"]`);
    const read = (side, which) => panel(side)?.querySelector(`[data-readout="${which}"]`)?.textContent?.trim();
    return {
      left: sliders.left,
      right: sliders.right,
      leftX: read('left', 'x'),
      leftY: read('left', 'y'),
      rightX: read('right', 'x'),
      rightY: read('right', 'y'),
      agree: q('[data-panel="verdict"]')?.getAttribute('data-agree'),
      model: q('[data-panel="mental-model"]')?.getAttribute('data-agree'),
      fn: q('[role="tab"][aria-selected="true"][data-function]')?.getAttribute('data-function'),
      text: document.body.innerText,
    };
  });

/* ── ① 两条函数上把两个点各扫一遍 ─────────────────────────────────── */
let samples = 0;
for (const fnId of ['square', 'jump']) {
  await page.locator(`[role="tab"][data-function="${fnId}"]`).click();
  await page.waitForTimeout(160);
  const spec = F[fnId];

  for (const side of ['left', 'right']) {
    await handle(side).focus();
    await page.keyboard.press(side === 'left' ? 'Home' : 'End');
    for (let i = 0; i < 30; i += 1) {
      // Shift 让步子大一些,30 步能横穿半张图
      await page.keyboard.press(side === 'left' ? 'Shift+ArrowRight' : 'Shift+ArrowLeft');
      const s = await readState();
      samples += 1;

      // ⭐⭐ 侧别不可违反:左点永远 < a,右点永远 > a
      if (!(s.left < spec.a)) note(`[${fnId}] left handle reached or passed a: ${s.left}`);
      if (!(s.right > spec.a)) note(`[${fnId}] right handle reached or passed a: ${s.right}`);

      // ⚠️ x 取**屏幕上显示的那个**,不取 aria-valuenow。
      //    学生看到的是这一对 (x, f(x));它们必须互相自洽。
      //    (第一版读的是 aria-valuenow,而那里的精度一度写死成两位,
      //     于是每一条都报"对不上" —— 其实是播报值被截断了。已在共享组件里修掉。)
      const shownXNum = Number(side === 'left' ? s.leftX : s.rightX);
      const wantY = side === 'left' ? spec.left(shownXNum) : spec.right(shownXNum);
      const gotY = Number(side === 'left' ? s.leftY : s.rightY);
      if (Math.abs(gotY - wantY) > EPS) {
        note(`[${fnId}] ${side} at x=${shownXNum}: page shows f=${gotY}, independent formula says ${wantY.toFixed(4)}`);
      }
      // ⭐⭐ 显示出来的 x 永远不是目标值本身
      const shownX = side === 'left' ? s.leftX : s.rightX;
      if (Number(shownX) === spec.a) note(`[${fnId}] ${side} displays x as exactly ${spec.a}`);
      if (/NaN|Infinity|undefined/.test(s.text)) note(`[${fnId}] NaN/undefined leaked onto the page`);
    }
  }

  const s = await readState();
  if (s.agree !== (spec.agree ? 'yes' : 'no')) note(`[${fnId}] verdict says agree=${s.agree}`);
  if (s.model !== s.agree) note(`[${fnId}] mental model (${s.model}) disagrees with the verdict (${s.agree})`);
}

/* ── ② DNE 那一屏不许出现"极限等于某个数" ─────────────────────────── */
await page.locator('[role="tab"][data-function="jump"]').click();
await page.waitForTimeout(200);
{
  // ⚠️ 结论从**属性**读,不读 KaTeX 渲染出来的文字。
  //    这个项目里已经因为读渲染后的文案误判过三次。
  const panel = page.locator('[data-panel="verdict"]');
  const limit = await panel.getAttribute('data-limit');
  const tex = await panel.getAttribute('data-limit-tex');
  if (limit !== 'dne') note(`the DNE case reports data-limit="${limit}"`);
  if (!/does not exist/.test(tex ?? '')) note(`the DNE tex is "${tex}"`);
  // ⭐ 折中值、偏袒某一侧,都是看得见的假话
  if (/=\s*[\d.]/.test(tex ?? '')) note(`the DNE case writes an equals-a-number limit: "${tex}"`);
  const verdict = await panel.innerText();
  if (!/DNE/.test(verdict)) note('the DNE panel does not show the DNE badge');
  if (!/≠/.test(verdict)) note('the DNE panel does not put the two destinations side by side');
  await page.screenshot({ path: join(OUT, 'osl-2-dne.png') });
}

/* ── ③ 一致那一屏才给等号 ─────────────────────────────────────────── */
await page.locator('[role="tab"][data-function="square"]').click();
await page.waitForTimeout(200);
{
  const panel = page.locator('[data-panel="verdict"]');
  if ((await panel.getAttribute('data-limit')) !== '4') note('the agreeing case does not report the limit as 4');
  const verdict = await panel.innerText();
  if (/DNE/.test(verdict)) note('the agreeing case still shows DNE');
  if (!/Both sides agree/i.test(verdict)) note('the agreeing case does not say both sides agree');
  await page.screenshot({ path: join(OUT, 'osl-1-agree.png') });
}

/* ── ④ 「Closer」每按一次都更近,而且到不了 a ─────────────────────── */
{
  await page.locator('[data-focus="both"]').click();
  await page.locator('[data-action="restart"]').click();
  await page.waitForTimeout(200);
  let previous = null;
  for (let i = 0; i < 8; i += 1) {
    const s = await readState();
    const gaps = [F.square.a - s.left, s.right - F.square.a];
    if (previous) {
      for (let k = 0; k < 2; k += 1) {
        if (gaps[k] > previous[k] + 1e-9) note(`"Closer" moved a point away on press ${i} (side ${k})`);
      }
    }
    for (const gap of gaps) if (gap <= 0) note(`a point reached the target after ${i} presses`);
    previous = gaps;
    await page.locator('[data-action="closer"]').click();
    await page.waitForTimeout(140);
  }
  // 走到最近一档之后再按也不会越过去
  const end = await readState();
  if (!(end.left < F.square.a && end.right > F.square.a)) note('a point crossed the target after repeated presses');
  await page.screenshot({ path: join(OUT, 'osl-3-closed-in.png') });
}

/* ── ⑤ focus 只改变取景,不锁别的 —— 三个模式都可达 ───────────────── */
for (const f of ['left', 'right', 'both']) {
  await page.locator(`[data-focus="${f}"]`).click();
  await page.waitForTimeout(120);
  const selected = await page.locator(`[data-focus="${f}"]`).getAttribute('aria-selected');
  if (selected !== 'true') note(`focus "${f}" did not take`);
  // 无论哪个模式,两侧面板都仍然在 DOM 里(只是压暗)—— 不是幻灯片
  const panels = await page.locator('[data-panel="side"]').count();
  if (panels !== 2) note(`focus "${f}" hid a side panel (${panels} left) — that would make it a slideshow`);
}

/* ── ⑥ 图上任意两行字都不许叠在一起 ───────────────────────────────── */
{
  const overlaps = [];
  for (const fnId of ['square', 'jump']) {
    await page.locator(`[role="tab"][data-function="${fnId}"]`).click();
    await page.locator('[data-action="restart"]').click();
    await page.waitForTimeout(160);
    for (let i = 0; i < 10; i += 1) {
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
      for (const b of bad) overlaps.push(`[${fnId}] ${b}`);
      await page.locator('[data-action="closer"]').click();
      await page.waitForTimeout(120);
    }
  }
  for (const o of [...new Set(overlaps)]) note(`labels collide: ${o}`);
}

/* ── ⑦ 没有一行 SVG 文字跑出取景框 ────────────────────────────────── */
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

/* ── ⑧ 键盘可达 ───────────────────────────────────────────────────── */
{
  const reachable = await page.evaluate(() =>
    [...document.querySelectorAll('[role="slider"], button, a')].every((el) => el.tabIndex >= 0),
  );
  if (!reachable) note('something interactive is not reachable by keyboard');
}

await browser.close();
server.close();
console.log(`sampled ${samples} handle positions`);
if (errors.length) {
  console.error('✗\n' + errors.slice(0, 25).map((e) => '  ' + e).join('\n') + (errors.length > 25 ? `\n  … and ${errors.length - 25} more` : ''));
  process.exit(1);
}
console.log('✓ one-sided limits clean');
