/**
 * 「Cut It in Half Through P」的浏览器专项检查。
 *
 * ⚠️ 期望值在本文件里**另算一遍**,用的是和页面无关的判据:
 *   · 椭圆总面积 `πab`;
 *   · 椭圆的平分线**必过中心** —— 中心对称,几何结论,不是公式;
 *   · 转过 π 之后两块面积之和恒为整块 —— 这是页面要证的那条恒等式本身。
 *
 * ⭐⭐ 这个脚本真正要问的是:**论证的三步在屏幕上都看得见吗?**
 *   两端异号、中间连续、必然穿零 —— 少一步这一页就白做了。
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SHOT_DIR ?? join(HERE, 'screenshots');
const DIST = join(HERE, '..', '..', 'dist');
const PORT = Number(process.env.SHOT_PORT ?? 4203);
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
const URL = `http://localhost:${PORT}/#/bisect-line`;

const A = 3.4, B = 2.2;
const T_ELLIPSE = Math.PI * A * B;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 1120 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(URL, { waitUntil: 'networkidle' });

const fail = [];
const read = (k) => page.$eval(`[data-readout="${k}"]`, (el) => el.textContent.trim()).catch(() => undefined);
const num = async (k) => Number(await read(k));
const near = (label, got, want, tol) => {
  const t = tol ?? Math.max(1e-3, Math.abs(want) * 3e-3);
  if (!Number.isFinite(got) || Math.abs(got - want) > t) fail.push(`${label}: 页面 ${got},独立算 ${want}`);
};
const setTheta = async (v) => {
  await page.$eval('input[type=range]', (el, val) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, String(val));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, v);
  await page.waitForTimeout(90);
};

/* ① 总面积就是 πab */
near('椭圆总面积', await num('total'), T_ELLIPSE, 0.02);

/* ② 左 + 右 = 整块,在好几个角度上都要成立 */
for (const t of [0.2, 0.9, 1.6, 2.4, 3.0]) {
  await setTheta(t);
  const L = await num('left');
  const R = await num('right');
  near(`θ=${t} 左+右`, L + R, await num('total'), 0.02);
  // ⭐ 转过 π 的那一对,和也必须是整块 —— 这就是那条恒等式
  near(`θ=${t} 翻转和`, await num('flip-sum'), await num('total'), 0.02);
  const g = await num('g');
  near(`θ=${t} 的 g`, g, L - R, 0.02);
}

/* ⭐⭐ 涂的那一块,必须真的是**数学上的左侧**。
   ⚠️ 颜色涂反了,DOM 里一切正常,截图上也看不出来 —— 只有拿几何去验才抓得到。
   做法:取填充多边形的形心,代进 `cross(u, X − P)`,必须为正。
   (SVG 的 y 轴朝下,所以要把 y 取反再算。) */
await setTheta(0.7);
const sideCheck = await page.evaluate(() => {
  const g = document.querySelector('[data-left]');
  const pts = g.getAttribute('points').split(' ').map((s) => s.split(',').map(Number));
  let cx = 0, cy = 0;
  for (const q of pts) { cx += q[0]; cy += q[1]; }
  const P = document.querySelector('[data-p]');
  return {
    cx: cx / pts.length, cy: cy / pts.length,
    px: Number(P.getAttribute('cx')), py: Number(P.getAttribute('cy')),
    theta: Number(document.querySelector('[data-theta-exact]').dataset.thetaExact),
    state: document.querySelector('[data-readout="hit"]').dataset.state,
  };
});
if (sideCheck.state !== 'crosses') fail.push('θ=0.7 本该切到图形,却没有 —— 这条检查会空转');
{
  const dx = sideCheck.cx - sideCheck.px;
  const dy = -(sideCheck.cy - sideCheck.py);
  const cross = Math.cos(sideCheck.theta) * dy - Math.sin(sideCheck.theta) * dx;
  if (!(cross > 0)) fail.push(`涂色涂到右边去了(cross = ${cross.toFixed(2)})`);
}

/* ③ ⭐⭐ 两个端点必须异号 —— IVT 的前提,屏幕上要能读出来 */
const g0 = await page.$eval('[data-endpoint="0"] text', (el) => Number(el.textContent.split('=')[1]));
const gPi = await page.$eval('[data-endpoint="1"] text', (el) => Number(el.textContent.split('=')[1]));
if (!(g0 * gPi < 0)) fail.push(`两个端点没有异号:g(0)=${g0}, g(π)=${gPi}`);
near('g(π) = −g(0)', gPi, -g0, 0.02);

/* ④ ⭐ 平台确实画得出来 —— "P 在外面"的唯一痕迹 */
let sawMiss = false;
for (let t = 0; t <= Math.PI; t += 0.1) {
  await setTheta(t);
  if ((await page.$eval('[data-readout="hit"]', (el) => el.dataset.state)) !== 'crosses') sawMiss = true;
}
if (!sawMiss) fail.push('整整一圈都没出现"碰不到"的角度 —— 平台没画出来');

/* ⑤ ⭐⭐ 按下二分,答案必须真的平分 */
await page.click('[data-action="solve"]');
await page.waitForTimeout(150);
const L = await num('left');
const R = await num('right');
near('平分之后左右相等', L, R, 0.01);
near('而且各是一半', L, T_ELLIPSE / 2, 0.02);
if (!(await page.$('[data-readout="solved"]'))) fail.push('平分了却没给出确认');
const steps = await num('steps');
if (!(steps > 5 && steps < 60)) fail.push(`二分步数不合理:${steps}`);

/* ⑥ ⭐ 椭圆:答案正是过中心那条线 —— 几何结论,独立于页面 */
const shortcut = await num('shortcut');
const answer = await num('answer');
near('过中心的那条线就是答案', answer, shortcut, 1e-3);
await page.screenshot({ path: join(OUT, 'bisect-ellipse.png') });

/* ⑦ ⭐⭐ 换成不对称的煎饼:捷径必须消失,而形心线要给出一个**非零**的差 */
await page.click('[data-shape="blob"]');
await page.waitForTimeout(200);
if (await page.$('[data-readout="shortcut"]')) fail.push('煎饼不该有"过中心"这个捷径');
if (!(await page.$('[data-readout="centroid-angle"]'))) fail.push('煎饼上没给出形心那条线');
const off = await num('centroid-off');
if (!(off > 0.1)) fail.push(`形心线差得太小(${off}),这个反例立不住`);
// ⭐ 但也不能差得离谱 —— 凸图形上过形心的线不会比 5:4 更偏。诚实比夸张重要。
const share = await num('centroid-share');
// ⭐ 偏了,但仍在凸体那个 5:4 的界之内(44.4% ~ 55.6%)—— 诚实比夸张重要
if (!(Math.abs(share - 50) > 1 && Math.abs(share - 50) < 5.6)) fail.push(`形心线的比例 ${share}% 不对劲`);
// 而二分照样找得到
await page.click('[data-action="solve"]');
await page.waitForTimeout(150);
near('煎饼上也平分了', await num('left'), await num('right'), 0.01);
await page.screenshot({ path: join(OUT, 'bisect-blob.png') });

/* ⑧ 拖动 P:落到图形里面时必须被推回外面 */
const box = await page.$eval('[data-panel="stage"] svg', (el) => {
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
await page.mouse.move(box.x + box.w / 2, box.y + box.h / 2);
await page.mouse.down();
await page.mouse.move(box.x + box.w / 2 + 2, box.y + box.h / 2 + 2);
await page.mouse.up();
await page.waitForTimeout(150);
const inside = await page.$eval('[data-p]', (el) => ({ cx: Number(el.getAttribute('cx')), cy: Number(el.getAttribute('cy')) }));
const outlineBox = await page.$eval('[data-outline]', (el) => el.getBBox());
const insideOutline =
  inside.cx > outlineBox.x + 4 && inside.cx < outlineBox.x + outlineBox.width - 4 &&
  inside.cy > outlineBox.y + 4 && inside.cy < outlineBox.y + outlineBox.height - 4;
if (insideOutline) fail.push('把 P 拖到图形正中央,它没有被推回外面');

/* ⑨ 溢出与手机 */
const over = async () => page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
const wide = await over();
await page.setViewportSize({ width: 390, height: 900 });
await page.waitForTimeout(200);
const narrow = await over();
await page.screenshot({ path: join(OUT, 'bisect-390.png'), fullPage: true });
if (wide > 0 || narrow > 0) fail.push(`横向溢出 桌面 ${wide} / 390 ${narrow}`);
if (errors.length) fail.push(`控制台报错:${errors.join(' | ')}`);

await browser.close(); server.close();
console.log(fail.length ? '✗\n  ' + fail.join('\n  ') : '✓ bisect:两端异号、平台可见、二分真的平分,煎饼上捷径消失,无溢出无报错');
process.exit(fail.length ? 1 : 0);
