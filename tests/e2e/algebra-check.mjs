/**
 * 四节代数课的浏览器专项检查。
 *
 * ⭐⭐ 每一课都有一件**只有在浏览器里才验得了**的事:
 *   平方差 —— 重排完成之前结论**不许出现**;
 *   立方差 —— 三块的截面读数与第二个因子的三项一一对上;
 *   二项式 —— 屏幕上画出来的方案**个数**就是系数;
 *   等比级数 —— 中间每一列都被划掉,只剩头尾两列。
 *
 * ⚠️ 期望值在这个文件里**独立重算**,不 import 被测模块。
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SHOT_DIR ?? join(HERE, 'screenshots');
const DIST = join(HERE, '..', '..', 'dist');
const PORT = 4214;
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

mkdirSync(OUT, { recursive: true });
const errors = [];
const note = (m) => errors.push(m);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1400 }, deviceScaleFactor: 2 });
page.on('console', (m) => { if (m.type() === 'error') note(`console: ${m.text()}`); });
page.on('pageerror', (e) => note(`pageerror: ${e.message}`));

const setSlider = (label, value) => page.evaluate(({ label, value }) => {
  const el = document.querySelector(`input[aria-label="${label}"]`);
  if (!(el instanceof window.HTMLInputElement)) throw new Error(`no slider ${label}`);
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, String(value));
  el.dispatchEvent(new Event('input', { bubbles: true }));
}, { label, value });

const clickAll = async (selector, max = 8) => {
  for (let i = 0; i < max; i += 1) {
    const button = page.locator(selector).first();
    if (await button.count() === 0) break;
    await button.click();
    await page.waitForTimeout(40);
  }
};

const collisions = () => page.evaluate(() => {
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

const hygiene = async (tag) => {
  const body = await page.evaluate(() => document.body.innerText);
  if (/NaN|Infinity/.test(body)) note(`[${tag}] NaN or Infinity reached the screen`);
  if (/×10-?\d/.test(body)) note(`[${tag}] a half-rendered exponent is on screen`);
  if (/undefined/.test(body)) note(`[${tag}] the word "undefined" leaked onto the page`);
  for (const b of [...new Set(await collisions())]) note(`[${tag}] ${b}`);
};

/* ══════════════════ ① 平方差:分幕证明 ════════════════════════════ */
{
  const tag = 'difference-of-squares';
  await page.goto(BASE + tag, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-panel="controls"]');

  const stage = () => page.evaluate(() => {
    const controls = document.querySelector('[data-panel="controls"]');
    const running = document.querySelector('[data-panel="running"]');
    return {
      index: Number(controls?.getAttribute('data-stage')),
      global: Number(controls?.getAttribute('data-global')),
      playing: controls?.getAttribute('data-playing'),
      operation: document.querySelector('[data-panel="caption"]')?.getAttribute('data-operation'),
      areaTex: running?.getAttribute('data-area-tex') ?? '',
      identity: running?.getAttribute('data-identity') ?? '',
      result: document.querySelectorAll('[data-panel="result"]').length,
      chips: [...document.querySelectorAll('[data-stage-chip]')].map((el) => ({
        id: el.getAttribute('data-stage-chip'),
        active: el.getAttribute('data-active'),
      })),
      body: document.body.innerText,
    };
  });

  /* 五幕的指示器 */
  {
    const s0 = await stage();
    if (s0.chips.length !== 5) note(`[${tag}] expected 5 stage chips, got ${s0.chips.length}`);
    const ids = s0.chips.map((c) => c.id).join(',');
    if (ids !== 'build,remove,cut,rearrange,factor') note(`[${tag}] stage chips are ${ids}`);
    if (s0.index !== 0) note(`[${tag}] did not start at stage 0`);
    if (s0.chips.filter((c) => c.active === 'yes').length !== 1) note(`[${tag}] more than one chip is active`);
    if (s0.areaTex !== '') note(`[${tag}] an area expression was showing before the square was drawn: "${s0.areaTex}"`);
    if (s0.result !== 0) note(`[${tag}] the result panel was on screen at stage 0`);
  }

  /* ⭐⭐ 手动一幕一幕走。每一幕的**运算**必须对得上,而且等号在最后一幕之前一个字都没有 */
  {
    const WANT = [
      { op: 'multiplication', area: 'a^2' },
      { op: 'subtraction', area: 'a^2 - b^2' },
      { op: 'decomposition', area: 'a^2 - b^2' },
      { op: 'rearrangement', area: 'a^2 - b^2' },
      { op: 'factor-last', area: '(a - b)(a + b)' },
    ];
    let stepped = 0;
    for (let i = 0; i < 5; i += 1) {
      if (i > 0) {
        await page.locator('[data-action="next"]').click();
        await page.waitForTimeout(90);
      } else {
        // 第一幕:先走到它的末尾
        await page.locator('[data-action="next"]').click();
        await page.waitForTimeout(90);
      }
      const st = await stage();
      if (st.index !== i) { note(`[${tag}] Next landed on stage ${st.index}, expected ${i}`); continue; }
      stepped += 1;
      if (WANT[i].op !== 'factor-last' && st.operation !== WANT[i].op) {
        note(`[${tag}] stage ${i} operation is "${st.operation}", expected "${WANT[i].op}"`);
      }
      if (st.areaTex !== WANT[i].area) note(`[${tag}] stage ${i} area reads "${st.areaTex}", expected "${WANT[i].area}"`);
      // ⭐⭐ 等号是结论
      if (i < 4) {
        if (st.identity !== '') note(`[${tag}] the identity appeared at stage ${i}`);
        if (st.result !== 0) note(`[${tag}] the result panel appeared at stage ${i}`);
        if (/= *\( *a *− *b *\)/.test(st.body.replace(/\s+/g, ' '))) {
          note(`[${tag}] the factored identity is written out at stage ${i}`);
        }
      }
      await page.screenshot({ path: join(OUT, `alg-squares-${i + 1}-${WANT[i].op}.png`), fullPage: true });
    }
    if (stepped !== 5) note(`[${tag}] only stepped through ${stepped} stages`);
  }

  /* 最后一幕走完:等号、乘积、两块都归位 */
  {
    const st = await stage();
    if (st.identity === '') note(`[${tag}] the identity never appeared at the end`);
    if (st.result !== 1) note(`[${tag}] no result panel at the end`);
    const done = await page.evaluate(() => ({
      product: document.querySelector('[data-panel="result"]')?.getAttribute('data-product'),
      settled: [...document.querySelectorAll('[data-piece]')].map((el) => el.getAttribute('data-settled')),
      target: document.querySelectorAll('[data-shape="target"]').length,
      pieces: Number(document.querySelector('[data-readout="pieces-sum"]')?.textContent),
      remaining: Number(document.querySelector('[data-readout="remaining"]')?.textContent),
    }));
    if (Number(done.product) !== 40) note(`[${tag}] the product reads ${done.product}, expected 40`);
    if (done.settled.some((x) => x !== 'yes')) note(`[${tag}] a piece never settled: ${done.settled.join(',')}`);
    if (done.target !== 1) note(`[${tag}] the finished rectangle is not outlined`);
    if (done.pieces !== done.remaining) note(`[${tag}] pieces sum ${done.pieces} ≠ remaining ${done.remaining}`);
    if (!st.body.includes('SAME PIECES')) note(`[${tag}] the "same pieces, same area" line never appears`);
  }

  /* Restart 回到起点,结论消失 */
  {
    await page.locator('[data-action="restart"]').click();
    await page.waitForTimeout(120);
    const st = await stage();
    if (st.index !== 0) note(`[${tag}] restart left the proof at stage ${st.index}`);
    if (st.result !== 0) note(`[${tag}] restart left the result panel on screen`);
    if (st.identity !== '') note(`[${tag}] restart left the identity on screen`);
  }

  /* ⭐ Play / Pause 真的在动、真的停得住 */
  {
    await page.locator('[data-action="play"]').click();
    await page.waitForTimeout(700);
    const moving = await stage();
    if (moving.playing !== 'yes') note(`[${tag}] play did not start the animation`);
    if (!(moving.global > 0)) note(`[${tag}] the animation did not advance while playing`);

    await page.locator('[data-action="pause"]').click();
    await page.waitForTimeout(80);
    const paused = await stage();
    await page.waitForTimeout(600);
    const still = await stage();
    if (paused.playing !== 'no') note(`[${tag}] pause did not stop the animation`);
    if (Math.abs(still.global - paused.global) > 1e-6) {
      note(`[${tag}] the animation kept moving after pause (${paused.global} → ${still.global})`);
    }
  }

  /* 一路播到底 */
  {
    await page.locator('[data-action="restart"]').click();
    await page.waitForTimeout(80);
    await page.locator('[data-action="play"]').click();
    await page.waitForFunction(
      () => Number(document.querySelector('[data-panel="controls"]')?.getAttribute('data-global')) >= 5,
      undefined,
      { timeout: 25000 },
    ).catch(() => note(`[${tag}] the proof never played to the end`));
    await page.waitForTimeout(150);
    const st = await stage();
    if (st.identity === '') note(`[${tag}] playing to the end did not reveal the identity`);
    await page.screenshot({ path: join(OUT, 'alg-squares.png'), fullPage: true });
  }

  /* ⭐ 换 a、b:退回起点,而且证明在新尺寸下照样成立 */
  {
    let sweeps = 0;
    for (const [a, b] of [[5, 1], [9, 8], [12, 5], [2, 1]]) {
      await setSlider('a', a);
      await setSlider('b', b);
      await page.waitForTimeout(90);
      const reset = await stage();
      if (reset.index !== 0) note(`[${tag}] changing a,b left the proof at stage ${reset.index}`);
      if (reset.result !== 0) note(`[${tag}] changing a,b left the conclusion on screen`);

      // 跳到最后一幕,验算
      await page.locator('[data-stage-chip="factor"]').click();
      await page.waitForTimeout(120);
      const read = await page.evaluate(() => ({
        a: Number(document.querySelector('[data-readout="a"]')?.textContent),
        b: Number(document.querySelector('[data-readout="b"]')?.textContent),
        big: Number(document.querySelector('[data-readout="big"]')?.textContent),
        small: Number(document.querySelector('[data-readout="small"]')?.textContent),
        remaining: Number(document.querySelector('[data-readout="remaining"]')?.textContent),
        pieces: Number(document.querySelector('[data-readout="pieces-sum"]')?.textContent),
        product: document.querySelector('[data-panel="result"]')?.getAttribute('data-product'),
        settled: [...document.querySelectorAll('[data-piece]')].map((el) => el.getAttribute('data-settled')),
      }));
      const A = read.a;
      const B = read.b;
      if (!(A > B && B >= 1)) note(`[${tag}] sliders produced a=${A} b=${B}`);
      if (read.big !== A * A) note(`[${tag}] a² reads ${read.big} for a=${A}`);
      if (read.small !== B * B) note(`[${tag}] b² reads ${read.small} for b=${B}`);
      if (read.remaining !== A * A - B * B) note(`[${tag}] remaining reads ${read.remaining} at ${A},${B}`);
      if (read.pieces !== read.remaining) note(`[${tag}] pieces sum ${read.pieces} ≠ ${read.remaining} at ${A},${B}`);
      if (Number(read.product) !== (A - B) * (A + B)) note(`[${tag}] product reads ${read.product} at ${A},${B}`);
      if (read.settled.some((x) => x !== 'yes')) note(`[${tag}] pieces did not settle at ${A},${B}`);
      sweeps += 1;
    }
    if (sweeps !== 4) note(`[${tag}] only swept ${sweeps} slider states`);
  }

  /* 代数覆盖层:两项向对方靠拢然后消失 */
  {
    await setSlider('a', 7);
    await setSlider('b', 3);
    await page.waitForTimeout(80);
    await page.locator('[data-toggle="mode"] [data-option="algebra"]').click();
    await page.waitForTimeout(140);
    if (await page.locator('[data-readout="expansion-row"]').count() !== 0) {
      note(`[${tag}] the expansion was already open`);
    }
    await clickAll('[data-action="next-step"]', 4);
    await page.waitForTimeout(600);
    const algebra = await page.evaluate(() => ({
      cancelled: [...document.querySelectorAll('[data-readout="expansion-row"] [data-term]')].map((el) => el.getAttribute('data-cancelled')),
      survivors: document.querySelectorAll('[data-readout="survivors"] [data-term]').length,
      left: Number(document.querySelector('[data-readout="algebra-left"]')?.textContent),
      right: Number(document.querySelector('[data-readout="algebra-right"]')?.textContent),
      widths: [...document.querySelectorAll('[data-slot]')].map((el) => el.getBoundingClientRect().width),
    }));
    if (algebra.cancelled.join(',') !== 'no,yes,yes,no') note(`[${tag}] cancellation marks are ${algebra.cancelled.join(',')}`);
    if (algebra.survivors !== 2) note(`[${tag}] ${algebra.survivors} terms survived, expected 2`);
    if (algebra.left !== algebra.right) note(`[${tag}] algebra check reads ${algebra.left} vs ${algebra.right}`);
    // ⭐ 抵消的两项**真的塌掉了**(宽度归零),不只是被打了个标记
    const collapsed = algebra.widths.filter((w) => w < 1).length;
    if (collapsed !== 2) note(`[${tag}] ${collapsed} terms actually collapsed to zero width, expected 2`);
    await page.screenshot({ path: join(OUT, 'alg-squares-algebra.png'), fullPage: true });
    await page.locator('[data-action="back-geometry"]').click();
    await page.waitForTimeout(120);
  }

  /* 认形状 */
  await page.locator('[data-pattern="9x2-16"]').click();
  await clickAll('[data-action="next-step"]', 4);
  {
    const factored = await page.locator('[data-readout="factored"]').innerText();
    if (!/3x/.test(factored) || !/4/.test(factored)) note(`[${tag}] 9x²−16 factored as "${factored}"`);
  }
  await hygiene(tag);
}

/* ══════════════════ ② 立方差 ══════════════════════════════════════ */
{
  const tag = 'difference-of-cubes';
  await page.goto(BASE + tag, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-panel="volumes"]');

  for (const [a, b] of [[5, 2], [4, 1], [9, 8], [3, 2]]) {
    await setSlider('a', a);
    await setSlider('b', b);
    await page.waitForTimeout(70);
    const read = await page.evaluate(() => ({
      a: Number(document.querySelector('[data-readout="a"]')?.textContent),
      b: Number(document.querySelector('[data-readout="b"]')?.textContent),
      big: Number(document.querySelector('[data-readout="big"]')?.textContent),
      small: Number(document.querySelector('[data-readout="small"]')?.textContent),
      remaining: Number(document.querySelector('[data-readout="remaining"]')?.textContent),
      sum: Number(document.querySelector('[data-panel="boxes"]')?.getAttribute('data-sum')),
      volumes: [...document.querySelectorAll('[data-box-volume]')].map((el) => Number(el.textContent)),
      // ⚠️ 从属性读数字,不从文字里剥 —— KaTeX 渲染出的 "a2" 会被一起剥走。
      terms: [...document.querySelectorAll('[data-box-term]')].map((el) => Number(el.getAttribute('data-section'))),
    }));
    const { a: A, b: B } = read;
    if (read.big !== A ** 3) note(`[${tag}] a³ reads ${read.big}`);
    if (read.small !== B ** 3) note(`[${tag}] b³ reads ${read.small}`);
    if (read.remaining !== A ** 3 - B ** 3) note(`[${tag}] remaining reads ${read.remaining}`);
    if (read.sum !== read.remaining) note(`[${tag}] three boxes sum to ${read.sum}, not ${read.remaining}`);
    // ⭐ 三块的体积正好是 (a−b)·a²、(a−b)·ab、(a−b)·b²
    const want = [(A - B) * A * A, (A - B) * A * B, (A - B) * B * B];
    if (read.volumes.join(',') !== want.join(',')) note(`[${tag}] box volumes ${read.volumes.join(',')} ≠ ${want.join(',')}`);
    // ⭐ 三块的截面读数就是第二个因子的三项
    const wantSections = [A * A, A * B, B * B];
    if (read.terms.join(',') !== wantSections.join(',')) {
      note(`[${tag}] cross-sections read ${read.terms.join(',')} ≠ ${wantSections.join(',')}`);
    }
  }

  // 拆开
  await setSlider('a', 5);
  await setSlider('b', 2);
  await page.locator('[data-action="explode"]').click();
  await page.waitForTimeout(2200);
  const labels = await page.locator('[data-box-label]').count();
  if (labels !== 3) note(`[${tag}] ${labels} boxes are labelled after exploding, expected 3`);
  await page.screenshot({ path: join(OUT, 'alg-cubes.png'), fullPage: true });

  // ⭐⭐ 少一项就对不上 —— 那正是「第二个因子不怪」的证据
  {
    const start = await page.locator('[data-readout="drop-verdict"]').getAttribute('data-right');
    if (start !== 'yes') note(`[${tag}] the untouched second factor is reported wrong`);
    let brokeAtLeastOnce = 0;
    for (const term of ['a^2', 'ab', 'b^2']) {
      await page.locator(`[data-drop="${term}"]`).click();
      await page.waitForTimeout(60);
      const state = await page.evaluate(() => ({
        right: document.querySelector('[data-readout="drop-verdict"]')?.getAttribute('data-right'),
        product: Number(document.querySelector('[data-readout="drop-product"]')?.textContent),
        target: Number(document.querySelector('[data-readout="drop-target"]')?.textContent),
      }));
      if (state.right !== 'no') note(`[${tag}] dropping ${term} still reports a match`);
      if (state.product === state.target) note(`[${tag}] dropping ${term} did not change the product`);
      brokeAtLeastOnce += 1;
      await page.locator(`[data-drop="${term}"]`).click();
      await page.waitForTimeout(50);
    }
    if (brokeAtLeastOnce !== 3) note(`[${tag}] only tried ${brokeAtLeastOnce} drops`);
  }

  // 展开与抵消
  await clickAll('[data-action="next-step"]', 6);
  const expansion = await page.evaluate(() => ({
    cancelled: [...document.querySelectorAll('[data-panel="expansion"] [data-term]')].map((el) => el.getAttribute('data-cancelled')),
    left: Number(document.querySelector('[data-readout="check-left"]')?.textContent),
    right: Number(document.querySelector('[data-readout="check-right"]')?.textContent),
    survivors: document.querySelectorAll('[data-readout="survivors"] [data-term]').length,
  }));
  const cancelledCount = expansion.cancelled.filter((c) => c === 'yes').length;
  if (cancelledCount !== 4) note(`[${tag}] ${cancelledCount} terms cancelled, expected 4`);
  if (expansion.survivors !== 2) note(`[${tag}] ${expansion.survivors} terms survived, expected 2`);
  if (expansion.left !== expansion.right) note(`[${tag}] expansion check ${expansion.left} vs ${expansion.right}`);

  // 立方和
  await page.locator('[data-toggle="sign"] [data-option="sum"]').click();
  await page.waitForTimeout(80);
  const sumValue = Number(await page.locator('[data-readout="sign-value"]').textContent());
  if (sumValue !== 5 ** 3 + 2 ** 3) note(`[${tag}] sum of cubes reads ${sumValue}, expected 133`);
  await hygiene(tag);
}

/* ══════════════════ ③ 二项式 ══════════════════════════════════════ */
{
  const tag = 'binomial-theorem';
  await page.goto(BASE + tag, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-panel="pascal"]');

  // 独立重算的帕斯卡三角
  const ROWS = [[1], [1, 1], [1, 2, 1], [1, 3, 3, 1], [1, 4, 6, 4, 1], [1, 5, 10, 10, 5, 1], [1, 6, 15, 20, 15, 6, 1]];

  for (const n of [0, 1, 2, 3, 4, 5, 6]) {
    await setSlider('n', n);
    await page.waitForTimeout(70);
    const read = await page.evaluate(() => ({
      n: Number(document.querySelector('[data-readout="n"]')?.textContent),
      row: document.querySelector('[data-readout="row"]')?.textContent?.trim(),
      active: [...document.querySelectorAll('[data-pascal-row]')].filter((el) => el.getAttribute('data-active') === 'yes').length,
      aPowers: [...document.querySelectorAll('[data-a-power]')].map((el) => Number(el.textContent)),
      bPowers: [...document.querySelectorAll('[data-b-power]')].map((el) => Number(el.textContent)),
      sums: [...document.querySelectorAll('[data-power-sum]')].map((el) => Number(el.textContent)),
    }));
    if (read.n !== n) note(`[${tag}] slider says ${read.n}, asked for ${n}`);
    if (read.row !== ROWS[n].join(' ')) note(`[${tag}] row ${n} reads "${read.row}", expected "${ROWS[n].join(' ')}"`);
    if (read.active !== 1) note(`[${tag}] ${read.active} Pascal rows are highlighted at n = ${n}`);
    // ⭐ 指数永远加到 n
    if (read.sums.some((s) => s !== n)) note(`[${tag}] exponents do not add to ${n}: ${read.sums.join(',')}`);
    if (read.aPowers.join(',') !== Array.from({ length: n + 1 }, (_, i) => n - i).join(',')) {
      note(`[${tag}] a exponents at n = ${n} read ${read.aPowers.join(',')}`);
    }
    if (read.bPowers.join(',') !== Array.from({ length: n + 1 }, (_, i) => i).join(',')) {
      note(`[${tag}] b exponents at n = ${n} read ${read.bPowers.join(',')}`);
    }
  }

  // ⭐⭐ 屏幕上画出来的方案个数 = 系数
  let selectionsChecked = 0;
  for (const [n, k, want] of [[4, 2, 6], [4, 1, 4], [5, 2, 10], [6, 3, 20], [3, 0, 1], [6, 6, 1]]) {
    await setSlider('n', n);
    await page.waitForTimeout(50);
    await setSlider('k', k);
    await page.waitForTimeout(70);
    const drawn = await page.evaluate(() => ({
      rows: [...document.querySelectorAll('[data-selection]')].map((el) =>
        [...el.querySelectorAll('[data-slot]')].map((s) => s.getAttribute('data-slot')).join('')),
      ways: Number(document.querySelector('[data-readout="ways"]')?.textContent),
      coefficient: Number(document.querySelector('[data-readout="gt-coefficient"]')?.textContent),
      aPower: Number(document.querySelector('[data-readout="gt-a"]')?.textContent),
      bPower: Number(document.querySelector('[data-readout="gt-b"]')?.textContent),
    }));
    if (drawn.rows.length !== want) note(`[${tag}] C(${n},${k}) drew ${drawn.rows.length} selections, expected ${want}`);
    if (drawn.ways !== want) note(`[${tag}] C(${n},${k}) reads ${drawn.ways}, expected ${want}`);
    if (drawn.coefficient !== want) note(`[${tag}] the general term coefficient reads ${drawn.coefficient}`);
    if (drawn.aPower !== n - k || drawn.bPower !== k) note(`[${tag}] exponents read ${drawn.aPower},${drawn.bPower}`);
    // 每个方案里 b 的个数正好是 k,而且方案两两不同
    for (const row of drawn.rows) {
      if (row.length !== n) note(`[${tag}] a selection has ${row.length} slots at n = ${n}`);
      if ([...row].filter((c) => c === 'b').length !== k) note(`[${tag}] a selection has the wrong number of b's: ${row}`);
    }
    if (new Set(drawn.rows).size !== drawn.rows.length) note(`[${tag}] duplicate selections drawn for C(${n},${k})`);
    selectionsChecked += 1;
  }
  if (selectionsChecked !== 6) note(`[${tag}] only checked ${selectionsChecked} selection cases`);

  // 展开式一项一项长出来
  await setSlider('n', 4);
  await page.waitForTimeout(60);
  if (Number(await page.locator('[data-panel="expansion"]').getAttribute('data-revealed')) !== 0) {
    note(`[${tag}] the expansion did not start empty`);
  }
  await clickAll('[data-action="next-step"]', 8);
  const revealed = await page.locator('[data-panel="expansion"]').getAttribute('data-revealed');
  if (Number(revealed) !== 5) note(`[${tag}] the expansion stopped at ${revealed} of 5 terms`);

  // 定理默认收起
  if (await page.locator('[data-panel="theorem"]').getAttribute('data-shown') !== 'no') {
    note(`[${tag}] the theorem was shown before the student worked through it`);
  }
  const bodyBefore = await page.evaluate(() => document.body.innerText);
  if (/∑|\\sum/.test(bodyBefore)) note(`[${tag}] sigma notation appeared before the reveal`);
  await page.locator('[data-action="show-theorem"]').click();
  await page.waitForTimeout(120);
  if (await page.locator('[data-panel="theorem"]').getAttribute('data-shown') !== 'yes') {
    note(`[${tag}] the theorem did not open`);
  }
  const check = await page.evaluate(() => ({
    byPower: Number(document.querySelector('[data-readout="by-power"]')?.textContent),
    byTerms: Number(document.querySelector('[data-readout="by-terms"]')?.textContent),
    total: Number(document.querySelector('[data-readout="row-total"]')?.textContent),
  }));
  if (check.byPower !== 5 ** 4) note(`[${tag}] (2+3)^4 reads ${check.byPower}, expected 625`);
  if (check.byTerms !== check.byPower) note(`[${tag}] expanding gives ${check.byTerms} but the power gives ${check.byPower}`);
  if (check.total !== 16) note(`[${tag}] the row total reads ${check.total}, expected 16`);
  await page.screenshot({ path: join(OUT, 'alg-binomial.png'), fullPage: true });
  await hygiene(tag);
}

/* ══════════════════ ④ 等比级数 ════════════════════════════════════ */
{
  const tag = 'geometric-series';
  await page.goto(BASE + tag, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-panel="shift"]');

  // 提示词点名的那组
  await setSlider('a', 3);
  await setSlider('r', 2);
  await setSlider('n', 5);
  await page.waitForTimeout(90);
  const worked = await page.evaluate(() => ({
    adding: Number(document.querySelector('[data-readout="by-adding"]')?.textContent),
    formula: Number(document.querySelector('[data-readout="by-formula"]')?.textContent),
    agree: document.querySelector('[data-panel="check"]')?.getAttribute('data-agree'),
    bars: [...document.querySelectorAll('[data-bar]')].map((el) => Number(el.getAttribute('data-value'))),
  }));
  if (worked.adding !== 93) note(`[${tag}] adding gives ${worked.adding}, expected 93`);
  if (worked.formula !== 93) note(`[${tag}] the formula gives ${worked.formula}, expected 93`);
  if (worked.agree !== 'yes') note(`[${tag}] the two methods are reported as disagreeing`);
  if (worked.bars.join(',') !== '3,6,12,24,48') note(`[${tag}] the bars read ${worked.bars.join(',')}`);

  // ⭐⭐ 移位相减:中间每一列被划掉,只剩头尾两列
  {
    if (await page.locator('[data-panel="shift"]').getAttribute('data-struck') !== 'no') {
      note(`[${tag}] terms were struck out before subtracting`);
    }
    if (await page.locator('[data-readout="formula"]').count() !== 0) {
      note(`[${tag}] the formula was on screen before the derivation`);
    }
    await clickAll('[data-panel="shift"] [data-action="next-step"]', 6);
    await page.waitForTimeout(300);
    const struck = await page.evaluate(() => {
      const tops = [...document.querySelectorAll('[data-cell-top]')].map((el) => el.getAttribute('data-cancelled'));
      const bottoms = [...document.querySelectorAll('[data-cell-bottom]')].map((el) => el.getAttribute('data-cancelled'));
      return { tops, bottoms, shifted: document.querySelector('[data-row="bottom"]')?.getAttribute('data-shifted') };
    });
    // n = 5 → 6 列,只有第 0 列和第 5 列不抵消
    const wantMarks = ['no', 'yes', 'yes', 'yes', 'yes', 'no'];
    if (struck.tops.join(',') !== wantMarks.join(',')) note(`[${tag}] top row marks ${struck.tops.join(',')}`);
    if (struck.bottoms.join(',') !== wantMarks.join(',')) note(`[${tag}] bottom row marks ${struck.bottoms.join(',')}`);
    if (struck.shifted !== 'yes') note(`[${tag}] the second row never shifted`);
    if (await page.locator('[data-readout="formula"]').count() !== 1) note(`[${tag}] the formula never appeared`);
  }
  await page.screenshot({ path: join(OUT, 'alg-series.png'), fullPage: true });

  // ⚠️ r = 1:闭形式是 0/0,页面必须自己说清楚
  await setSlider('r', 1);
  await page.waitForTimeout(90);
  const atOne = await page.evaluate(() => ({
    formula: document.querySelector('[data-readout="by-formula"]')?.textContent?.trim(),
    adding: document.querySelector('[data-readout="by-adding"]')?.textContent?.trim(),
    note: document.querySelector('[data-readout="r-one"]')?.textContent ?? '',
    body: document.body.innerText,
  }));
  if (/NaN/.test(atOne.body)) note(`[${tag}] NaN reached the screen at r = 1`);
  if (Number(atOne.formula) !== 15) note(`[${tag}] at r=1 the formula reads ${atOne.formula}, expected 15`);
  if (Number(atOne.adding) !== 15) note(`[${tag}] at r=1 adding reads ${atOne.adding}`);
  if (!/divide by zero/i.test(atOne.note)) note(`[${tag}] the page never explains the r = 1 case`);

  // 无穷模式:五种脾气
  await page.locator('[data-toggle="mode"] [data-option="infinite"]').click();
  await page.waitForTimeout(150);
  const WANT = {
    '0.5': { behaviour: 'converges', converges: 'yes' },
    '-0.5': { behaviour: 'alternates', converges: 'yes' },
    '1': { behaviour: 'constant', converges: 'no' },
    '1.2': { behaviour: 'grows', converges: 'no' },
    '-1': { behaviour: 'oscillates', converges: 'no' },
  };
  const seen = new Set();
  for (const [r, want] of Object.entries(WANT)) {
    await setSlider('r', r);
    await page.waitForTimeout(90);
    const state = await page.evaluate(() => ({
      behaviour: document.querySelector('[data-panel="regime"]')?.getAttribute('data-behaviour'),
      converges: document.querySelector('[data-panel="fill"]')?.getAttribute('data-converges'),
      limit: document.querySelector('[data-readout="limit"]')?.textContent?.trim(),
      words: document.querySelector('[data-readout="behaviour-words"]')?.textContent?.trim(),
      result: document.querySelector('[data-panel="infinite-result"]')?.getAttribute('data-limit'),
    }));
    if (state.behaviour !== want.behaviour) note(`[${tag}] r=${r} classified as ${state.behaviour}, expected ${want.behaviour}`);
    if (state.converges !== want.converges) note(`[${tag}] r=${r} convergence reads ${state.converges}`);
    if (want.converges === 'no' && state.limit !== 'no limit') note(`[${tag}] r=${r} shows a limit of "${state.limit}"`);
    if (want.converges === 'yes' && state.limit === 'no limit') note(`[${tag}] r=${r} shows no limit but should converge`);
    if (!state.words || state.words.length < 15) note(`[${tag}] r=${r} has no explanation`);
    seen.add(state.behaviour);
  }
  // ⚠️ 防空跑:五种脾气必须都出现过
  if (seen.size !== 5) note(`[${tag}] the sweep only observed ${seen.size} regimes: ${[...seen].join(',')}`);

  // r = 0.5、a = 1 时极限是 2
  await setSlider('r', 0.5);
  await setSlider('a', 1);
  await page.waitForTimeout(90);
  const limit = await page.locator('[data-readout="limit"]').textContent();
  if (Math.abs(Number(limit) - 2) > 1e-6) note(`[${tag}] a=1 r=0.5 limit reads ${limit}, expected 2`);
  await hygiene(tag);
}

/* 窄屏 */
for (const route of ['difference-of-squares', 'difference-of-cubes', 'binomial-theorem', 'geometric-series']) {
  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  await page.setViewportSize({ width: 430, height: 1600 });
  await page.waitForTimeout(350);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 2) note(`[${route}] scrolls sideways on a 430px screen by ${overflow}px`);
  await page.setViewportSize({ width: 1500, height: 1400 });
}

await browser.close();
server.close();
if (errors.length) { console.error('✗\n' + errors.slice(0, 30).map((e) => '  ' + e).join('\n')); process.exit(1); }
console.log('✓ all four algebra lessons clean');
