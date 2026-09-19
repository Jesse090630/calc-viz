/**
 * 「Convergence Tests」的浏览器专项检查。
 *
 * ⭐⭐⭐ 核心一问:**"两个判别法说得一模一样,答案却相反"这件事,一眼看得见吗?**
 *   `Σ1/n` 和 `Σ1/n²` 必须画在**同一张图、同一个纵轴**上,
 *   而且两栏判别法输出必须字字相同、结论必须相反。
 *   各画各的轴就等于用两套刻度把这件事抹平了。
 *
 * ⚠️ 期望值手推:
 *   · `S(1024) − S(512)` 在调和级数上 ≈ ln 2 = 0.693,在 `Σ1/n²` 上 < 0.001;
 *   · 两者的 `L` 都是 1,两个判别法都"什么也没说";
 *   · `Σ(1/2)ⁿ` 的部分和到第 10 项已经在 1 的千分之一以内。
 *
 * ⚠️ 死界面自查:判别法三档输出都要有级数点得到;
 *   条件收敛那一块只该在交错调和级数上出现。
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SHOT_DIR ?? join(HERE, 'screenshots');
const DIST = join(HERE, '..', '..', 'dist');
const PORT = Number(process.env.SHOT_PORT ?? 4216);
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
await page.goto(`http://localhost:${PORT}/#/convergence`, { waitUntil: 'networkidle' });

const fail = [];
const pick = async (id) => { await page.click(`[data-series="${id}"]`); await page.waitForTimeout(150); };
const attr = (sel, n) => page.$eval(sel, (el, k) => el.getAttribute(k), n).catch(() => undefined);
const count = (sel) => page.$$eval(sel, (els) => els.length);
const text = (sel) => page.$eval(sel, (el) => el.textContent.trim()).catch(() => '');

/* ① 论点前置:三张卡片,每张都写明它证明不了什么 */
if ((await count('[data-test]')) !== 3) fail.push('判别法应该列 3 张卡片');
if ((await count('[data-cannot]')) !== 3) fail.push('每张卡片都得有"证明不了什么"那一栏');
const testsText = await text('[data-panel="tests"]');
if (!testsText.includes('never proves convergence')) {
  fail.push('第 n 项判别法那张没写明它永远证明不了收敛');
}
if (!testsText.includes('L = 1')) fail.push('比值判别法那张没提到 L = 1');

/* ② ⭐⭐⭐ 并排那一对 */
const pairRows = await page.$$eval('[data-pair-row]', (els) =>
  els.map((el) => [el.getAttribute('data-pair-row'), el.textContent.replace(/\s+/g, ' ').trim()]));
if (pairRows.length !== 2) fail.push('并排那一栏应该有两个级数');
const [hRow, pRow] = pairRows.map((r) => r[1]);
// 两个判别法的措辞必须字字相同
for (const w of ['nth-term: says nothing', 'ratio (L = 1): says nothing']) {
  if (!hRow.includes(w)) fail.push(`Σ1/n 那一栏没写「${w}」`);
  if (!pRow.includes(w)) fail.push(`Σ1/n² 那一栏没写「${w}」`);
}
// 而结论必须相反
if (!hRow.includes('it diverges')) fail.push('Σ1/n 没标成发散');
if (!pRow.includes('it converges')) fail.push('Σ1/n² 没标成收敛');

/* ⭐⭐ 两条曲线必须共用纵轴 —— 同一张 svg、同一个换算 */
const shared = await page.evaluate(() => {
  const a = document.querySelector('[data-pair="harmonic"]');
  const b = document.querySelector('[data-pair="psquare"]');
  if (!a || !b) return null;
  if (a.closest('svg') !== b.closest('svg')) return { sameSvg: false };
  const ys = (el) => el.getAttribute('points').split(' ').map((q) => +q.split(',')[1]);
  const ha = ys(a); const pb = ys(b);
  return {
    sameSvg: true,
    harmonicRise: ha[0] - ha[ha.length - 1],   // 屏幕 y 向下,爬升为正
    psquareRise: pb[0] - pb[pb.length - 1],
    harmonicEnd: ha[ha.length - 1],
    psquareEnd: pb[pb.length - 1],
  };
});
if (!shared) fail.push('并排那两条曲线没画出来');
else if (!shared.sameSvg) fail.push('两条曲线不在同一张 svg 里 —— 那就不是共用纵轴');
else {
  // 调和级数必须爬得比 1/n² 高得多,否则"一条爬个没完"就没画出来
  if (!(shared.harmonicRise > shared.psquareRise * 2)) {
    fail.push(`共用纵轴上调和级数没有明显爬得更高(${shared.harmonicRise.toFixed(1)} 对 ${shared.psquareRise.toFixed(1)})`);
  }
  if (shared.harmonicEnd >= shared.psquareEnd) {
    fail.push('调和级数的末端没有高过 Σ1/n² —— 图和结论打架');
  }
}

/* ⚠️ 图上的标签不许压在曲线上。
   第一版"Σ 1/n — still climbing"正好印在调和级数那条线的右端上,看不清。 */
const onCurve = await page.evaluate(() => {
  const svg = document.querySelector('[data-panel="pair"] svg');
  const curves = [...svg.querySelectorAll('polyline')].map((el) =>
    el.getAttribute('points').split(' ').map((q) => q.split(',').map(Number)));
  const bad = [];
  for (const t of svg.querySelectorAll('text')) {
    const tx = +t.getAttribute('x');
    const ty = +t.getAttribute('y');
    if (t.getAttribute('text-anchor') !== 'end') continue;   // 只查那两个图内标签
    for (const c of curves) {
      for (const [x, y] of c) {
        // 标签右端往左约 150px 是文字占的横向范围
        if (x > tx - 150 && x <= tx && Math.abs(y - ty) < 8) {
          bad.push(`${t.textContent.trim()} @ ${ty.toFixed(0)} vs 曲线 ${y.toFixed(0)}`);
          break;
        }
      }
    }
  }
  return [...new Set(bad)];
});
if (onCurve.length) fail.push(`图内标签压在曲线上:${onCurve.join(' | ')}`);

/* ③ ⭐⭐ 只做加法的那条路:S(1024) − S(512) */
await pick('harmonic');
const hBlock = Number(await text('[data-readout="block"]'));
if (!(hBlock > 0.69 && hBlock < 0.70)) fail.push(`调和级数的块应该 ≈ ln 2,读到 ${hBlock}`);
if ((await attr('[data-panel="block"]', 'data-shrinks')) !== 'no') fail.push('调和级数的块被标成"缩到 0"了');
await pick('psquare');
const pBlock = Number(await text('[data-readout="block"]'));
// ⚠️ 手推:Σ 1/n² 从 513 到 1024 ≈ 1/512 − 1/1024 ≈ 0.000977
if (!(pBlock > 0 && pBlock < 2e-3)) fail.push(`Σ1/n² 的块应该 ≈ 0.00098,读到 ${pBlock}`);
// ⭐ 真正的论点是**对比**:两者差了几百倍
if (!(hBlock / pBlock > 100)) fail.push(`两个块只差 ${(hBlock / pBlock).toFixed(0)} 倍,对比不够刺眼`);
// 而且读数位数要够,不能被四舍五入成 "0.001"
if (String(pBlock).length < 6) fail.push(`块读数位数不够:「${pBlock}」看不出它在归零`);
if ((await attr('[data-panel="block"]', 'data-shrinks')) !== 'yes') fail.push('Σ1/n² 的块没标成"缩到 0"');

/* ④ 判别法三档输出都要点得到 */
const seen = new Set();
for (const id of ['harmonic', 'psquare', 'geometric', 'nover', 'alternating', 'factorial', 'pmone']) {
  await pick(id);
  for (const v of await page.$$eval('[data-says]', (els) => els.map((el) => el.getAttribute('data-says')))) {
    seen.add(v);
  }
}
for (const v of ['converges', 'diverges', 'says nothing']) {
  if (!seen.has(v)) fail.push(`判别法输出「${v}」从界面上走不到`);
}

/* ⚠️ "什么也没说"不许用成功色或失败色 —— 它不是好消息也不是坏消息 */
await pick('harmonic');
const colors = await page.evaluate(() => {
  const pickColor = (el) => getComputedStyle(el).color;
  const nothing = [...document.querySelectorAll('[data-says="says nothing"]')].map(pickColor);
  const verdict = pickColor(document.querySelector('[data-panel="truth"] p'));
  return { nothing, verdict };
});
if (colors.nothing.length === 0) fail.push('调和级数上应该有"什么也没说"的行');
for (const c of colors.nothing) {
  if (c === colors.verdict) fail.push(`"什么也没说"用了和结论一样的颜色(${c})——它不是一个结论`);
}

/* ⑤ 每个级数上,判别法都不许给出和真相冲突的结论 */
for (const id of ['harmonic', 'psquare', 'geometric', 'nover', 'alternating', 'factorial', 'pmone']) {
  await pick(id);
  const truth = await attr('[data-panel="truth"]', 'data-verdict');
  const says = await page.$$eval('[data-says]', (els) => els.map((el) => el.getAttribute('data-says')));
  for (const v of says) {
    if (v !== 'says nothing' && v !== truth) {
      fail.push(`${id}:判别法说「${v}」,而真相是「${truth}」——判别法不许说错`);
    }
  }
  if ((await text('[data-note="series"]')).length < 120) fail.push(`${id} 的说明太短`);
}

/* ⑥ 条件收敛那一块 */
await pick('alternating');
if ((await count('[data-note="conditional"]')) !== 1) fail.push('交错调和级数上没标出条件收敛');
for (const id of ['psquare', 'geometric', 'factorial', 'harmonic']) {
  await pick(id);
  if ((await count('[data-note="conditional"]')) !== 0) fail.push(`${id} 上不该出现条件收敛那一句`);
}

/* ⑦ 收敛的级数要画出那条和的水平线,发散的不许画 */
for (const [id, want] of [['psquare', 1], ['geometric', 1], ['factorial', 1], ['alternating', 1],
  ['harmonic', 0], ['nover', 0], ['pmone', 0]]) {
  await pick(id);
  if ((await count('[data-limit-line]')) !== want) {
    fail.push(`${id} 上"和"那条线应该出现 ${want} 次`);
  }
}
// ⭐ 而且部分和确实停在那条线上
await pick('geometric');
const settles = await page.evaluate(() => {
  const limitY = +document.querySelector('[data-limit-line] line').getAttribute('y1');
  const ys = document.querySelector('[data-sums]').getAttribute('points')
    .split(' ').map((q) => +q.split(',')[1]);
  return Math.abs(ys[ys.length - 1] - limitY);
});
if (settles > 3) fail.push(`几何级数的部分和没停在和那条线上(差 ${settles.toFixed(1)}px)`);

/* ⑧ 画框 */
const outside = await page.evaluate(() => {
  const bad = [];
  for (const svg of document.querySelectorAll('svg')) {
    const vb = svg.getAttribute('viewBox');
    if (!vb) continue;
    const [, , w, h] = vb.split(/\s+/).map(Number);
    for (const el of svg.querySelectorAll('polyline')) {
      for (const q of el.getAttribute('points').split(' ')) {
        const [x, y] = q.split(',').map(Number);
        if (x < -1 || y < -1 || x > w + 1 || y > h + 1) bad.push(q);
      }
    }
  }
  return bad.slice(0, 3);
});
if (outside.length) fail.push(`有曲线画到画框外:${outside.join(' ')}`);

/* ⑨ 溢出与手机 */
await pick('harmonic');
const over = () => page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
await page.screenshot({ path: join(OUT, 'convergence-1280.png'), fullPage: true });
const wide = await over();
await page.setViewportSize({ width: 390, height: 900 });
await page.waitForTimeout(240);
await page.screenshot({ path: join(OUT, 'convergence-390.png'), fullPage: true });
const narrow = await over();
if (wide > 0 || narrow > 0) fail.push(`横向溢出 桌面 ${wide} / 390 ${narrow}`);
if (errors.length) fail.push(`控制台报错:${errors.join(' | ')}`);

await browser.close(); server.close();
console.log(fail.length ? '✗\n  ' + fail.join('\n  ') : '✓ convergence:并排那一对共用纵轴、两个判别法措辞相同结论相反、块读数 0.693 对 0,无溢出无报错');
process.exit(fail.length ? 1 : 0);
