/**
 * 「Optimization」的浏览器专项检查。
 *
 * ⚠️ 期望值在本文件里**用不含微积分的办法**另算一遍:
 *   栅栏用抛物线顶点公式,切角与易拉罐用均值不等式。
 *   从被测模块取期望等于自己验自己。
 *
 * ⭐⭐ 这个脚本真正要问的是:**口诀翻车的那两幕,人点得到吗?**
 *   一幕是"交白卷"(窄地块),一幕是"自信地交出错答案"(局部峰)。
 *   两幕都必须能从情景按钮选到,并且屏幕上确实显示出失败的说法。
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SHOT_DIR ?? join(HERE, 'screenshots');
const DIST = join(HERE, '..', '..', 'dist');
const PORT = Number(process.env.SHOT_PORT ?? 4201);
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
const URL = `http://localhost:${PORT}/#/optimization`;

/* ── 独立重写的期望 ──────────────────────────────────────────────── */
const EXPECT = {
  // A = −2x² + 100x,顶点 −b/(2a) = 25,面积 25·50 = 1250
  fence: { x: 25, value: 1250, origin: 'critical', recipeWorks: true },
  // 同一个函数,[0,15] 上 A' = 100 − 4x ≥ 40 > 0,一路在涨 ⇒ 最大在右端
  narrow: { x: 15, value: 15 * 70, origin: 'endpoint', recipeWorks: false },
  // 均值不等式:2x = 10 − x ⇒ x = 10/3,V = 2(20/3)³
  box: { x: 10 / 3, value: 2 * (20 / 3) ** 3, origin: 'critical', recipeWorks: true },
  // 均值不等式:2πr² = 1000/r,S = 3(2π·10⁶)^{1/3}
  can: { x: Math.cbrt(1000 / (2 * Math.PI)), value: 3 * Math.cbrt(2 * Math.PI * 1e6), origin: 'critical', recipeWorks: true },
  // f = x(x−3)²,f(1) = 4,f(4.5) = 4.5·1.5² = 10.125 ⇒ 端点赢
  localpeak: { x: 4.5, value: 10.125, origin: 'endpoint', recipeWorks: false },
  // C = (x−4)⁴ + 5,最小值 5
  flatbottom: { x: 4, value: 5, origin: 'critical', recipeWorks: true },
};

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 980 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(URL, { waitUntil: 'networkidle' });

const fail = [];
const read = (k) => page.$eval(`[data-readout="${k}"]`, (el) => el.textContent.trim()).catch(() => undefined);
const near = (label, got, want, tol) => {
  const g = Number(got);
  const t = tol ?? Math.max(1e-3, Math.abs(want) * 2e-3);
  if (!Number.isFinite(g) || Math.abs(g - want) > t) fail.push(`${label}: 页面 ${got},独立算 ${want}`);
};

for (const [id, want] of Object.entries(EXPECT)) {
  await page.click(`[data-scenario="${id}"]`);
  await page.waitForTimeout(90);
  near(`${id} 最优点`, await read('best-x'), want.x);
  near(`${id} 最优值`, await read('best-value'), want.value);
  if ((await read('best-origin')) !== `(${want.origin})`) {
    fail.push(`${id} 来源: 页面 ${await read('best-origin')},应为 (${want.origin})`);
  }
  // ⭐ 密集扫描那条独立路径也要在屏幕上对上
  near(`${id} 扫描`, await read('scan'), want.value);
  if ((await read('agree')) !== '✓ agrees') fail.push(`${id}: 页面自己的两条路径没对上`);

  // ⭐⭐ 口诀成不成立,屏幕必须表态
  const ok = await page.$eval('[data-readout="verdict"]', (el) => el.dataset.ok);
  if (ok !== (want.recipeWorks ? 'yes' : 'no')) fail.push(`${id}: 口诀判定 ${ok},应为 ${want.recipeWorks ? 'yes' : 'no'}`);
  const flag = await page.$('[data-readout="endpoint-flag"]');
  if (want.origin === 'endpoint' && !flag) fail.push(`${id}: 答案在端点,却没打出端点提示`);
  if (want.origin === 'critical' && flag) fail.push(`${id}: 答案不在端点,却打出了端点提示`);

  // 候选名单里两个端点一个都不能少
  const rows = await page.$$eval('[data-row]', (els) => els.map((e) => e.dataset.row));
  if (rows.filter((r) => r === 'endpoint').length < 2) fail.push(`${id}: 候选表里端点不足两个`);
  if (!rows.includes('endpoint')) fail.push(`${id}: 候选表里根本没有端点`);
}

/* ⭐ 窄地块:界外那个够不着的峰必须画出来 */
await page.click('[data-scenario="narrow"]');
await page.waitForTimeout(90);
if (!(await page.$('[data-unreachable]'))) fail.push('窄地块:界外那个零点没画出来 —— 这一课的主视觉没了');
if (!(await page.$('[data-beyond]'))) fail.push('窄地块:界外那一段虚线没画');
if (!(await page.$('[data-readout="same-function"]'))) fail.push('窄地块:没说明这是同一个函数');
if ((await read('inside')) !== 'none') fail.push(`窄地块:界内零点应为 none,得到 ${await read('inside')}`);
if ((await read('recipe')) !== 'nothing at all') fail.push('窄地块:口诀应当交白卷');
await page.screenshot({ path: join(OUT, 'optimization-narrow.png') });

/* ⭐ 局部峰:口诀给出了答案,而且是错的 —— 差额必须显示 */
await page.click('[data-scenario="localpeak"]');
await page.waitForTimeout(90);
near('局部峰 口诀答案', await read('recipe'), 1);
near('局部峰 差额', await read('shortfall'), 10.125 - 4);
if (await page.$('[data-readout="same-function"]')) fail.push('局部峰:不该出现"同一个函数"那段话');
await page.screenshot({ path: join(OUT, 'optimization-localpeak.png') });

/* ⭐ 二阶导沉默的那一幕,屏幕要说出来 */
await page.click('[data-scenario="flatbottom"]');
await page.waitForTimeout(90);
const saysNothing = await page.$$eval('[data-row]', (els) =>
  els.some((e) => e.textContent.includes('second derivative says nothing')));
if (!saysNothing) fail.push('flatbottom:二阶导沉默这件事没写在候选表里');
await page.screenshot({ path: join(OUT, 'optimization-flat.png') });

/* 溢出与手机 */
await page.click('[data-scenario="fence"]');
await page.waitForTimeout(90);
await page.screenshot({ path: join(OUT, 'optimization-fence.png') });
const over = async () => page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
const wide = await over();
await page.setViewportSize({ width: 390, height: 850 });
await page.waitForTimeout(140);
const narrowOver = await over();
await page.screenshot({ path: join(OUT, 'optimization-390.png'), fullPage: true });
if (wide > 0 || narrowOver > 0) fail.push(`横向溢出 桌面 ${wide} / 390 ${narrowOver}`);
if (errors.length) fail.push(`控制台报错:${errors.join(' | ')}`);

await browser.close(); server.close();
console.log(fail.length ? '✗\n  ' + fail.join('\n  ') : '✓ optimization:六个情景三条路径一致,两种翻车都点得到,无溢出无报错');
process.exit(fail.length ? 1 : 0);
