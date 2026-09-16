/**
 * 「Parametric Motion」的浏览器专项检查。
 *
 * ⚠️ 期望值在本文件里手推一遍:椭圆 `x = 3cos t, y = 2sin t` ⇒
 *   `dy/dx = −(2/3)cot t`,`|v| = √(9sin²t + 4cos²t)`,`d²y/dx² = −2/(9 sin³t)`。
 *
 * ⭐⭐ 核心三问:
 *   · `dx/dt = 0` 那一刻,屏幕说斜率不存在、而速度**不是**零吗?
 *   · 尖点那一刻,屏幕说粒子停了吗?
 *   · 二阶导那两栏并排放着,差别看得出来吗?
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SHOT_DIR ?? join(HERE, 'screenshots');
const DIST = join(HERE, '..', '..', 'dist');
const PORT = Number(process.env.SHOT_PORT ?? 4209);
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
const URL = `http://localhost:${PORT}/#/parametric`;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 1020 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(URL, { waitUntil: 'networkidle' });

const fail = [];
const read = (k) => page.$eval(`[data-readout="${k}"]`, (el) => el.textContent.trim()).catch(() => undefined);
const num = async (k) => Number(await read(k));
const near = (label, got, want, tol) => {
  const tt = tol ?? Math.max(2e-3, Math.abs(want) * 5e-3);
  if (!Number.isFinite(got) || Math.abs(got - want) > tt) fail.push(`${label}: 页面 ${got},手推 ${want}`);
};
const setT = async (v) => {
  await page.$eval('input[type=range]', (el, val) => {
    const st = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    st.call(el, String(val));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, v);
  await page.waitForTimeout(80);
};

/* ① 椭圆上普通的一点:三个数都要对,而且割线那条独立路径也要对上 */
await setT(Math.PI / 4);
{
  const t = Math.PI / 4;
  near('dx/dt', await num('dxdt'), -3 * Math.sin(t));
  near('dy/dt', await num('dydt'), 2 * Math.cos(t));
  near('dy/dx', await num('slope'), -(2 / 3) / Math.tan(t));
  near('速度', await num('speed'), Math.hypot(3 * Math.sin(t), 2 * Math.cos(t)));
  // ⭐ 页面自己那条独立路径
  near('割线量出来的斜率', await num('secant'), -(2 / 3) / Math.tan(t), 1e-2);
  // ⭐ 速度不等于 |dy/dt| —— 这一条专门盯着"速度只看一个分量"那种错
  const v = await num('speed');
  if (Math.abs(v - Math.abs(2 * Math.cos(t))) < 1e-3) fail.push('速度看上去只算了 dy/dt');
}

/* ② ⭐⭐ 竖直切线:斜率不存在,而速度不是零 */
await setT(0);
{
  if ((await page.$eval('[data-readout="slope"]', (el) => el.dataset.defined)) !== 'no') {
    fail.push('t = 0 处应当没有斜率');
  }
  if ((await read('slope')) !== 'undefined') fail.push(`竖直切线处斜率该写 undefined,得到 ${await read('slope')}`);
  const v = await num('speed');
  if (!(v > 1.5)) fail.push(`竖直切线处速度应当不小(手推是 2),得到 ${v}`);
  near('竖直切线处的速度', v, 2);
  if (!(await page.$('[data-readout="vertical-note"]'))) fail.push('没有说明为什么没有斜率');
  if (!(await page.$('[data-tangent][data-vertical="yes"]'))) fail.push('切线没有画成竖直的');
  // ⚠️ 速度向量仍然要画出来 —— "还在动"是这一幕的全部意义
  if (!(await page.$('[data-velocity]'))) fail.push('竖直切线处没画速度向量');
}
await page.screenshot({ path: join(OUT, 'parametric-vertical.png') });

/* ③ ⭐⭐ 二阶导两栏:椭圆在 t = π/4 处连符号都相反 */
await setT(Math.PI / 4);
{
  const t = Math.PI / 4;
  near('正确的二阶导', await num('second'), -2 / (9 * Math.sin(t) ** 3), 2e-2);
  near('想当然的写法', await num('second-naive'), (2 / 3) * Math.tan(t), 1e-2);
  const sign = await page.$eval('[data-readout="gap"]', (el) => el.dataset.sign);
  if (sign !== 'opposite') fail.push('t = π/4 处两栏应当符号相反,页面却说不是');
}

/* ④ ⭐⭐ 尖点:粒子停住 */
await page.click('[data-curve="cycloid"]');
await page.waitForTimeout(140);
{
  const marks = await page.$$('[data-mark]');
  if (marks.length < 2) fail.push('旋轮线没给出可跳转的标记点');
  await marks[0].click();                       // 第一个标记就是 t = 2π 的尖点
  await page.waitForTimeout(140);
  const v = await num('speed');
  if (!(v < 1e-2)) fail.push(`尖点处速度应当接近 0,得到 ${v}`);
  if (!(await page.$('[data-readout="stopped-note"]'))) fail.push('尖点处没有说明粒子停了');
  if (!(await page.$('[data-stopped]'))) fail.push('图上没标出"停住"');
  if ((await read('slope')) !== 'undefined') fail.push('尖点处不该给出斜率');
}
await page.screenshot({ path: join(OUT, 'parametric-cusp.png') });

/* ⑤ ⭐ 三条曲线的标记点都跳得到,而且跳过去之后状态确实变了 */
for (const cid of ['ellipse', 'cycloid', 'cusp']) {
  await page.click(`[data-curve="${cid}"]`);
  await page.waitForTimeout(120);
  const marks = await page.$$('[data-mark]');
  if (marks.length === 0) fail.push(`${cid} 没有标记点`);
  for (const mk of marks) {
    await mk.click();
    await page.waitForTimeout(90);
    const slopeTxt = await read('slope');
    const v = await num('speed');
    // 每个标记点都该是个"特殊时刻":要么没斜率,要么斜率是 0,要么停住
    const special = slopeTxt === 'undefined' || Math.abs(Number(slopeTxt)) < 1e-2 || v < 1e-2;
    if (!special) fail.push(`${cid} 的某个标记点跳过去之后什么特别的也没有(slope=${slopeTxt}, v=${v})`);
  }
}

/* ⑥ 速度向量的两个分量画出来了 —— 商的两半要看得见 */
await page.click('[data-curve="ellipse"]');
await page.waitForTimeout(120);
await setT(1.0);
if (!(await page.$('[data-components]'))) fail.push('没把速度的两个分量画出来');
await page.screenshot({ path: join(OUT, 'parametric-ellipse.png') });

/* ⑦ 溢出与手机 */
const over = async () => page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
const wide = await over();
await page.setViewportSize({ width: 390, height: 900 });
await page.waitForTimeout(200);
const narrow = await over();
await page.screenshot({ path: join(OUT, 'parametric-390.png'), fullPage: true });
if (wide > 0 || narrow > 0) fail.push(`横向溢出 桌面 ${wide} / 390 ${narrow}`);
if (errors.length) fail.push(`控制台报错:${errors.join(' | ')}`);

await browser.close(); server.close();
console.log(fail.length ? '✗\n  ' + fail.join('\n  ') : '✓ parametric:竖直切线处有速度无斜率、尖点处停住、二阶导两栏符号相反,无溢出无报错');
process.exit(fail.length ? 1 : 0);
