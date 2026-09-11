/**
 * 「Taylor Series」的浏览器专项检查。
 *
 * ⚠️ 期望值在本文件里**手算**一遍:`1/(1−x)` 在 x = 2 的部分和是 2ⁿ⁺¹ − 1,
 *   真值是 −1;e = 2.71828…;ln 2 = 0.69314…。不从被测模块取。
 *
 * ⭐⭐ 核心一问:**那个反例,一打开页面就看得见吗?**
 *   项数越多越远这件事,如果要拖三下滑块才撞见,这一课就白做了。
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SHOT_DIR ?? join(HERE, 'screenshots');
const DIST = join(HERE, '..', '..', 'dist');
const PORT = Number(process.env.SHOT_PORT ?? 4205);
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
const URL = `http://localhost:${PORT}/#/taylor`;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 1050 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(URL, { waitUntil: 'networkidle' });

const fail = [];
const read = (k) => page.$eval(`[data-readout="${k}"]`, (el) => el.textContent.trim()).catch(() => undefined);
const num = async (k) => Number(await read(k));
const near = (label, got, want, tol) => {
  const t = tol ?? Math.max(1e-3, Math.abs(want) * 3e-3);
  if (!Number.isFinite(got) || Math.abs(got - want) > t) fail.push(`${label}: 页面 ${got},手算 ${want}`);
};
const setRange = async (idx, v) => {
  await page.$$eval('input[type=range]', (els, [i, val]) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(els[i], String(val));
    els[i].dispatchEvent(new Event('input', { bubbles: true }));
  }, [idx, v]);
  await page.waitForTimeout(80);
};

/* ⭐⭐ 一打开就该停在反例上:默认 x 在半径外面 */
{
  const v = await page.$eval('[data-readout="verdict"]', (el) => el.dataset.state);
  if (v !== 'outside') fail.push(`默认落点不在半径外(${v})—— 反例藏起来了`);
  if (!(await page.$('[data-readout="diverge-note"]'))) fail.push('默认没显示发散说明');
}

/* ① 手算对照:1/(1−x) 在 x = 2,Sₙ = 2ⁿ⁺¹ − 1,f = −1 */
await setRange(0, 2);
near('f(2)', await num('fx'), -1);
for (const n of [0, 1, 2, 5, 9]) {
  await setRange(1, n);
  near(`S${n}(2)`, await num('sn'), 2 ** (n + 1) - 1);
  near(`误差 n=${n}`, await num('err'), Math.abs(-1 - (2 ** (n + 1) - 1)));
}

/* ⭐ 误差随 n **变大** —— 这一课的全部论点 */
{
  await setRange(1, 3);
  const e3 = await num('err');
  await setRange(1, 8);
  const e8 = await num('err');
  if (!(e8 > e3)) fail.push(`半径外误差没有随项数变大(${e3} → ${e8})`);
  if (Math.abs(e8 / e3 - 32) > 1) fail.push(`每加一项该翻倍,实际 ${(e8 / e3).toFixed(2)}× over 5 terms`);
}

/* ② 半径以内:同一个级数,误差反过来变小 */
await setRange(0, 0.5);
{
  const v = await page.$eval('[data-readout="verdict"]', (el) => el.dataset.state);
  if (v !== 'inside') fail.push(`x = 0.5 应该在半径内,得到 ${v}`);
  near('f(0.5)', await num('fx'), 2);
  await setRange(1, 3);
  const e3 = await num('err');
  await setRange(1, 12);
  const e12 = await num('err');
  if (!(e12 < e3)) fail.push('半径内误差没有随项数变小');
}
await page.screenshot({ path: join(OUT, 'taylor-inside.png') });

/* ⭐⭐ 定理不适用的地方,页面必须**说不适用**,而不是报一个碰巧相等的数。
   ⚠️ 1/(1−x) 在 x = 2 处,旧版算出的"上界"是 32,而真实误差也是 32 ——
      屏幕上于是写着"上界成立",看起来毫无破绽。可 x = 1 处函数根本没定义,
      Taylor 定理压根不适用。这条断言就是为了挡住它。 */
await setRange(0, 2); await setRange(1, 4);
{
  const applies = await page.$eval('[data-readout="lagrange"]', (el) => el.dataset.applies);
  if (applies !== 'no') fail.push('x = 2 处 Taylor 定理不适用,页面却给了上界');
  const txt = await read('lagrange');
  if (!txt || !txt.includes('does not apply')) fail.push(`x = 2 处应说明定理不适用,得到「${txt}」`);
  if (txt && txt.includes('32')) fail.push('还在显示那个碰巧等于误差的 32');
  const holds = await page.$eval('[data-readout="holds"]', (el) => el.textContent);
  if (holds.includes('the bound holds')) fail.push('定理不适用,却声称"上界成立"');
}

/* ③ ⭐ Lagrange 上界必须罩得住,而且页面自己要表态 */
for (const [x, n] of [[0.5, 2], [0.8, 5], [0.3, 8]]) {   // 这些 x 都在奇点这一侧,定理适用
  await setRange(0, x); await setRange(1, n);
  const e = await num('err');
  const b = await num('lagrange');
  if (Number.isFinite(b) && !(b >= e - 1e-9)) fail.push(`x=${x} n=${n} 上界被穿了:${b} < ${e}`);
  const ok = await page.$eval('[data-readout="holds"]', (el) => el.dataset.ok);
  if (ok !== 'yes') fail.push(`x=${x} n=${n} 页面说上界没罩住`);
}

/* ④ 换到 eˣ:手算 e 与 Lagrange 的确切值 */
await page.click('[data-series="exp"]');
await page.waitForTimeout(120);
await setRange(0, 1); await setRange(1, 3);
near('e', await num('fx'), Math.E);
near('S₃(1)', await num('sn'), 1 + 1 + 0.5 + 1 / 6);
near('Lagrange e/24', await num('lagrange'), Math.E / 24);
if ((await read('alternating')) !== 'does not apply here') {
  fail.push('eˣ 不是交错级数,不该给交错上界');
}

/* ⑤ ⭐⭐ ln(1+x):两个端点一个收敛一个发散 —— 这一条最容易被想当然 */
await page.click('[data-series="ln1p"]');
await page.waitForTimeout(120);
await setRange(0, 1);
if ((await page.$eval('[data-readout="verdict"]', (el) => el.dataset.state)) !== 'endpoint-converges') {
  fail.push('ln(1+x) 在 x = 1 应当是"端点收敛"');
}
near('ln 2', await num('fx'), Math.LN2);
await setRange(0, -1);
if ((await page.$eval('[data-readout="verdict"]', (el) => el.dataset.state)) !== 'endpoint-diverges') {
  fail.push('ln(1+x) 在 x = −1 应当是"端点发散"');
}
await page.screenshot({ path: join(OUT, 'taylor-endpoint.png') });

/* ⑥ sin:交错上界必须给得出,而且是**下一个非零项** */
await page.click('[data-series="sin"]');
await page.waitForTimeout(120);
await setRange(0, 1); await setRange(1, 3);
// ⚠️ 读数只保留 4 位(0.0083),容差不能比页面能显示的精度还紧。
//    确切值 1/120 由单元测试钉住,这里只需确认页面**取的是下一个非零项**
//    ——如果错取了当前项(3 次,1/6 ≈ 0.1667),这个容差照样抓得到。
near('sin 的交错上界 ≈ 1/120', await num('alternating'), 1 / 120, 1e-4);
await setRange(1, 4);
near('n=4 时跳过 0 次项,还是 1/120', await num('alternating'), 1 / 120, 1e-4);

/* ⑦ 四个级数都要有半径的理由 */
for (const id of ['geometric', 'exp', 'sin', 'ln1p']) {
  await page.click(`[data-series="${id}"]`);
  await page.waitForTimeout(100);
  const why = await read('why');
  if (!why || why.length < 40) fail.push(`${id} 没讲清半径的来历`);
}

/* ⑧ 溢出与手机 */
await page.click('[data-series="geometric"]');
await page.waitForTimeout(100);
await page.screenshot({ path: join(OUT, 'taylor-diverge.png') });
const over = async () => page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
const wide = await over();
await page.setViewportSize({ width: 390, height: 900 });
await page.waitForTimeout(200);
const narrow = await over();
await page.screenshot({ path: join(OUT, 'taylor-390.png'), fullPage: true });
if (wide > 0 || narrow > 0) fail.push(`横向溢出 桌面 ${wide} / 390 ${narrow}`);
if (errors.length) fail.push(`控制台报错:${errors.join(' | ')}`);

await browser.close(); server.close();
console.log(fail.length ? '✗\n  ' + fail.join('\n  ') : '✓ taylor:反例默认可见、误差随项数变大、上界罩得住、端点两边分开判,无溢出无报错');
process.exit(fail.length ? 1 : 0);
