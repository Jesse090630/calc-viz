/**
 * 「Related Rates」的浏览器专项检查。
 *
 * ⚠️ 期望值**在本文件里重写一遍**,不从 `src/math/relatedRates.ts` 拿。
 *   梯子:x = 1 + 0.6t, x² + y² = 25 ⇒ y = √(25 − x²), dy/dt = −(x/y)·0.6。
 *   气球:V = (4/3)πr³, dV/dt = 12 ⇒ dr/dt = 12 / (4πr²)。
 *   这两条都用**关系式的解析解**从头写,和页面上那两条路径不共享代码。
 *
 * ⭐⭐ 这个脚本的核心一问:**失效那一屏点得到吗?**
 *   第一版 tRange 的上界 6.6 < 失效点 6.667,滑块永远够不着,
 *   于是"the model has run out"那段成了死界面 —— 单元测试全绿也看不出来。
 *   所以这里必须把滑块**真的拖过去**,再确认 [data-collapsed] 出现。
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SHOT_DIR ?? join(HERE, 'screenshots');
const DIST = join(HERE, '..', '..', 'dist');
const PORT = Number(process.env.SHOT_PORT ?? 4198);
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
const URL = `http://localhost:${PORT}/#/related-rates`;

/* ── 独立重写的期望 ──────────────────────────────────────────────── */
const ladderY = (t) => { const x = 1 + 0.6 * t; const i = 25 - x * x; return i <= 0 ? null : Math.sqrt(i); };
const ladderRate = (t) => { const y = ladderY(t); return y === null ? null : -((1 + 0.6 * t) / y) * 0.6; };
const LADDER_BREAK = (5 - 1) / 0.6;                         // = 6.666…
// 气球:V = (4/3)πr³,r₀ = 1,dV/dt = 3 ⇒ r(t) = ((3V)/(4π))^{1/3},dr/dt = 3/(4πr²)
const balloonV = (t) => (4 / 3) * Math.PI + 3 * t;
const balloonR = (t) => Math.cbrt((3 * balloonV(t)) / (4 * Math.PI));

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(URL, { waitUntil: 'networkidle' });

const read = (k) => page.$eval(`[data-readout="${k}"]`, (el) => el.textContent.trim()).catch(() => undefined);
const setT = async (v) => {
  await page.$eval('input[type=range]', (el, val) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, String(val));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, v);
  await page.waitForTimeout(60);
};
const fail = [];
const near = (label, got, want, tol = 5e-3) => {
  const g = Number(got);
  if (!Number.isFinite(g) || Math.abs(g - want) > tol) fail.push(`${label}: 页面 ${got},独立算 ${want.toFixed(4)}`);
};

/* ① 滑块上界必须越过失效点 —— 否则后面那一屏根本到不了 */
const max = await page.$eval('input[type=range]', (el) => Number(el.max));
if (!(max > LADDER_BREAK)) fail.push(`滑块上界 ${max} 够不着失效点 ${LADDER_BREAK.toFixed(3)} —— 死界面`);

/* ② 有效区:两条路径与独立重写的第三条都要对上 */
await setT(3);
near('梯子 y(3)', await read('tracked'), ladderY(3));
near('梯子 dy/dt(3)', await read('exact'), ladderRate(3));
if ((await read('agree')) !== '✓ the two agree') fail.push('t=3 时页面自己的两条路径没对上');
const collapsedEarly = await page.$('[data-collapsed]');
if (collapsedEarly) fail.push('t=3 明明还有效,却显示了失效画面');
await page.screenshot({ path: join(OUT, 'related-rates-valid.png') });

/* ③ ⭐ 越过失效点 —— 这一屏必须真的出现 */
await setT(7.2);
const collapsed = await page.$('[data-collapsed]');
if (!collapsed) fail.push('拖过失效点了,却没显示"the model has run out" —— 死界面');
const note = await page.$('[data-readout="break-note"]');
if (!note) fail.push('失效说明没出现');
if ((await read('tracked')) !== 'undefined') fail.push(`失效处 tracked 应为 undefined,得到 ${await read('tracked')}`);
if ((await read('exact')) !== 'undefined') fail.push(`失效处 rate 应为 undefined,得到 ${await read('exact')}`);
await page.screenshot({ path: join(OUT, 'related-rates-broken.png') });

/* ④ 「跳到率超过 1000」的按钮:跳完必须仍然有效,而且率确实很大 */
await page.click('[data-action="go-wild"]');
await page.waitForTimeout(80);
// ⚠️ 读未取整的 data-t-exact。文字读数只有两位(6.67),而滑块 step=0.01
//    也会把自己的 value 吸附到 6.67 —— 两者都在失效点之后,照着比会误判。
const wildT = await page.$eval('[data-t-exact]', (el) => Number(el.dataset.tExact));
const wildRate = Math.abs(Number(await read('exact')));
if (!(wildT < LADDER_BREAK)) fail.push(`跳过头了:t=${wildT} 已越过失效点,应停在失效之前`);
if (!(wildRate > 1000)) fail.push(`按钮说率会超过 1000,实际 ${wildRate}`);
near('跳过去那一刻', await read('exact'), ladderRate(wildT), Math.abs(ladderRate(wildT)) * 0.02);
// ⭐ 巨大的率必须和微小的剩余时间并排出现 —— 否则爆炸没有来路
const left = Number(await read('left'));
if (!(left > 0 && left < 1e-4)) fail.push(`剩余时间读数不对:${left}`);
if (!(Math.abs(wildRate * left) > 1e-5)) fail.push('率与剩余时间不成反比,其中一个是错的');
await page.screenshot({ path: join(OUT, 'related-rates-wild.png') });

/* ⑤ 气球:换一个情景,期望仍旧独立重写 */
await page.click('[data-scenario="balloon"]');
await page.waitForTimeout(80);
const bt = await page.$eval('[data-t-exact]', (el) => Number(el.dataset.tExact));
near('气球 r', await read('tracked'), balloonR(bt));
near('气球 V', await read('driver'), balloonV(bt));
near('气球 dr/dt', await read('exact'), 3 / (4 * Math.PI * balloonR(bt) ** 2));
// ⭐ r₀ 必须**恰好**是 1 —— 课文是这么说的
await setT(0);
near('气球 r(0) 必须恰好是 1', await read('tracked'), 1, 1e-6);
await setT(bt);
if (await page.$('[data-collapsed]')) fail.push('气球没有失效点,却显示了失效画面');

/* ⑥ 溢出与手机 */
const over = async () => page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
const wide = await over();
await page.setViewportSize({ width: 390, height: 850 });
await page.waitForTimeout(120);
const narrow = await over();
await page.screenshot({ path: join(OUT, 'related-rates-390.png'), fullPage: true });
if (wide > 0 || narrow > 0) fail.push(`横向溢出 桌面 ${wide} / 390 ${narrow}`);
if (errors.length) fail.push(`控制台报错:${errors.join(' | ')}`);

await browser.close(); server.close();
console.log(fail.length ? '✗\n  ' + fail.join('\n  ') : '✓ related-rates:失效那一屏点得到,三条路径一致,无溢出无报错');
process.exit(fail.length ? 1 : 0);
