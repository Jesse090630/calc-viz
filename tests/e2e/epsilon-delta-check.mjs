/**
 * 「The Epsilon-Delta Definition / Trap the Output」的浏览器专项检查。
 *
 * ⭐⭐ 判据在本文件里另写:`|f(x) − 5| = 2|x − 2|`,所以成功 ⟺ `2δ ≤ ε`。
 *     页面的 `data-trapped` 必须在整个 (ε, δ) 网格上与它一致。
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SHOT_DIR ?? join(HERE, 'screenshots');
const DIST = join(HERE, '..', '..', 'dist');
const PORT = Number(process.env.SHOT_PORT ?? 4199);
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
const URL = `http://localhost:${PORT}/#/epsilon-delta`;

/** 独立判据:|2x+1−5| = 2|x−2|,整段最大值在端点,所以 2δ ≤ ε。 */
const shouldTrap = (eps, delta) => 2 * delta <= eps + 1e-6;

mkdirSync(OUT, { recursive: true });
const errors = [];
const note = (m) => errors.push(m);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 2 });
page.on('console', (m) => { if (m.type() === 'error') note(`console: ${m.text()}`); });
page.on('pageerror', (e) => note(`pageerror: ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-panel="verdict"]', { timeout: 20000 });

const setSlider = async (name, value) => {
  await page.evaluate(({ name, value }) => {
    const el = document.querySelector(`input[aria-label="${name}"]`);
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, String(value));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, { name, value });
};

const read = () =>
  page.evaluate(() => {
    const v = document.querySelector('[data-panel="verdict"]');
    return {
      trapped: v?.getAttribute('data-trapped'),
      eps: Number(v?.getAttribute('data-epsilon')),
      delta: Number(v?.getAttribute('data-delta')),
      earned: document.querySelector('[data-panel="definition"]')?.getAttribute('data-earned'),
      formula: document.querySelector('[data-panel="algebra"]')?.getAttribute('data-revealed'),
      text: document.body.innerText,
    };
  });

/* ── ① (ε, δ) 网格全扫 ────────────────────────────────────────────── */
let samples = 0;
const seen = new Set();
for (const eps of [1, 0.5, 0.25, 0.1, 0.05, 0.01]) {
  await setSlider('epsilon', eps);
  for (const delta of [0.005, 0.02, 0.05, 0.1, 0.2, 0.35, 0.5, 0.8, 1.2]) {
    await setSlider('delta', delta);
    await page.waitForTimeout(35);
    const s = await read();
    samples += 1;
    const want = shouldTrap(s.eps, s.delta) ? 'yes' : 'no';
    seen.add(want);
    if (s.trapped !== want) note(`ε=${s.eps} δ=${s.delta}: page says trapped=${s.trapped}, independent rule says ${want}`);
    if (/NaN|Infinity/.test(s.text)) note(`NaN leaked at ε=${s.eps} δ=${s.delta}`);
  }
}
// 两种结论都出现过,否则上面是空跑
for (const w of ['yes', 'no']) if (!seen.has(w)) note(`the sweep never produced trapped=${w} — vacuous`);

/* ── ② 分界恰好在 δ = ε/2 ─────────────────────────────────────────── */
// ⚠️ δ 会被**吸附到 0.005 的格点**上,所以不能拿"我打算设的值"去算期望 ——
//    要读回页面**实际**的 δ 再判断。(第一版就是这么误报的:想设 0.007,
//    页面吸附成 0.005,那确实该 trapped,而我的期望还按 0.007 算。)
//    同一条老规矩:断言要针对屏幕上真实的状态。
for (const eps of [1, 0.5, 0.1, 0.01]) {
  await setSlider('epsilon', eps);
  const need = eps / 2;
  for (const delta of [need * 0.6, need * 2.4]) {
    await setSlider('delta', delta);
    await page.waitForTimeout(35);
    const s = await read();
    samples += 1;
    const want = shouldTrap(s.eps, s.delta) ? 'yes' : 'no';
    if (s.trapped !== want) note(`ε=${s.eps} δ=${s.delta}: expected ${want}, got ${s.trapped}`);
  }
}

/* ── ②b 分界两侧确实**能**分出胜负(不是被吸附抹平了) ─────────────── */
for (const eps of [1, 0.5, 0.1]) {
  await setSlider('epsilon', eps);
  const results = new Set();
  for (const delta of [eps / 2 - 0.01, eps / 2 + 0.05]) {
    await setSlider('delta', delta);
    await page.waitForTimeout(35);
    results.add((await read()).trapped);
    samples += 1;
  }
  if (results.size !== 2) note(`at ε=${eps} both sides of δ = ε/2 gave the same verdict (${[...results]}) — the boundary is not reachable`);
}

/* ── ③ 「Snap δ to the edge」按下去必须成功 ───────────────────────── */
for (const eps of [1, 0.5, 0.1, 0.01]) {
  await setSlider('epsilon', eps);
  await page.locator('[data-action="best-delta"]').click();
  await page.waitForTimeout(80);
  const s = await read();
  samples += 1;
  if (s.trapped !== 'yes') note(`snapping δ at ε=${eps} did not trap (δ=${s.delta})`);
}

/* ── ④ 形式定义**一开始不出现**,玩到最紧档才解锁 ─────────────────── */
{
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('[data-panel="verdict"]');
  const before = await read();
  if (before.earned !== 'no') note(`the definition was already unlocked on load (${before.earned})`);
  if (before.formula !== 'no') note('the delta = epsilon/2 formula was shown before it was asked for');
  await page.screenshot({ path: join(OUT, 'ed-1-start.png') });

  // 收紧到最紧,再把 δ 调够
  for (let i = 0; i < 4; i += 1) {
    await page.locator('[data-action="tighten"]').click().catch(() => {});
    await page.waitForTimeout(60);
  }
  await page.locator('[data-action="best-delta"]').click();
  await page.waitForTimeout(150);
  const after = await read();
  if (after.trapped !== 'yes') note('could not trap at the tightest epsilon');
  if (after.earned !== 'yes') note('the definition never unlocked');
  await page.screenshot({ path: join(OUT, 'ed-2-trapped.png') });

  await page.locator('[data-action="reveal-formula"]').click();
  await page.waitForTimeout(120);
  if ((await read()).formula !== 'yes') note('the formula did not reveal');
  await page.screenshot({ path: join(OUT, 'ed-3-formula.png') });
}

/* ── ⑤ 文字不重叠、不出框 ─────────────────────────────────────────── */
for (const [eps, delta] of [[1, 0.9], [0.01, 0.005], [0.5, 0.6]]) {
  await setSlider('epsilon', eps);
  await setSlider('delta', delta);
  await page.waitForTimeout(60);
  const bad = await page.evaluate(() => {
    const svg = document.querySelector('main svg');
    const vb = svg.viewBox.baseVal;
    const boxes = [...svg.querySelectorAll('text')].map((t) => ({ t: t.textContent.trim(), b: t.getBBox() }));
    const out = [];
    for (const { t, b } of boxes) {
      if (b.x < vb.x - 0.5 || b.x + b.width > vb.x + vb.width + 0.5 || b.y < vb.y - 0.5 || b.y + b.height > vb.y + vb.height + 0.5) out.push(`outside: "${t}"`);
    }
    for (let a = 0; a < boxes.length; a += 1) {
      for (let c = a + 1; c < boxes.length; c += 1) {
        const A = boxes[a].b, B = boxes[c].b;
        const w = Math.min(A.x + A.width, B.x + B.width) - Math.max(A.x, B.x);
        const h = Math.min(A.y + A.height, B.y + B.height) - Math.max(A.y, B.y);
        if (w > 0 && h > 0 && w * h > Math.min(A.width * A.height, B.width * B.height) * 0.2) out.push(`collide: "${boxes[a].t}" × "${boxes[c].t}"`);
      }
    }
    return out;
  });
  for (const b of [...new Set(bad)]) note(`[ε=${eps} δ=${delta}] ${b}`);
}

await browser.close();
server.close();
console.log(`sampled ${samples} (epsilon, delta) states`);
if (errors.length) {
  console.error('✗\n' + errors.slice(0, 20).map((e) => '  ' + e).join('\n') + (errors.length > 20 ? `\n  … and ${errors.length - 20} more` : ''));
  process.exit(1);
}
console.log('✓ epsilon-delta clean');
