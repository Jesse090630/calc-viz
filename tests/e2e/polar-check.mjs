/**
 * 「Polar Area」的浏览器专项检查。
 *
 * ⚠️ 期望值手推:圆 `r=1` 面积 `π`、错公式给 `2π`(周长);
 *   心形线 `3π/2`;四瓣玫瑰 `2π`。
 *
 * ⭐⭐ 核心一问:**那个反例一打开就看得见吗?**
 *   默认落在圆上,`π` 和 `2π` 并排摆着,还要写明 2π 是周长。
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SHOT_DIR ?? join(HERE, 'screenshots');
const DIST = join(HERE, '..', '..', 'dist');
const PORT = Number(process.env.SHOT_PORT ?? 4211);
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
const URL = `http://localhost:${PORT}/#/polar-area`;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(URL, { waitUntil: 'networkidle' });

const fail = [];
const read = (k) => page.$eval(`[data-readout="${k}"]`, (el) => el.textContent.trim()).catch(() => undefined);
const num = async (k) => Number((await read(k)).split(' ')[0]);
const near = (label, got, want, tol) => {
  const tt = tol ?? Math.max(2e-3, Math.abs(want) * 5e-3);
  if (!Number.isFinite(got) || Math.abs(got - want) > tt) fail.push(`${label}: 页面 ${got},手推 ${want}`);
};
const setRange = async (idx, v) => {
  await page.$$eval('input[type=range]', (els, [i, val]) => {
    const st = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    st.call(els[i], String(val));
    els[i].dispatchEvent(new Event('input', { bubbles: true }));
  }, [idx, v]);
  await page.waitForTimeout(90);
};

/* ⭐⭐ 一打开就该是那个反例:圆,π 对 2π,而且说明 2π 是周长 */
{
  const active = await page.$eval('[data-curve][data-active="yes"]', (el) => el.dataset.curve);
  if (active !== 'circle') fail.push(`默认该停在圆上,得到 ${active}`);
  near('圆的面积', await num('total-right'), Math.PI, 2e-2);
  near('错公式给的数', await num('total-wrong'), 2 * Math.PI, 2e-2);
  const note = await read('circumference');
  if (!note || !note.toLowerCase().includes('circumference')) {
    fail.push('没说明 2π 是这个圆的周长 —— 那这个反例就只是两个数字');
  }
  // ⭐ 两者必须差整整一倍,否则半径选错了
  const ratio = (await num('total-wrong')) / (await num('total-right'));
  if (Math.abs(ratio - 2) > 0.05) fail.push(`两条公式之比应当是 2,得到 ${ratio.toFixed(3)} —— 半径是不是设成 2 了?`);
}

/* ① 鞋带那条独立路径要和积分对上 */
near('鞋带公式', await num('shoelace'), Math.PI, 3e-2);

/* ② ⭐ 单个扇形:½r²dθ vs r dθ,比值应当是 ½r */
for (const d of [0.1, 0.35, 0.7]) {
  await setRange(1, d);
  const r = await num('r');
  near(`dθ=${d} 时扇形面积`, await num('wedge-right'), 0.5 * r * r * d, 1e-3);
  near(`dθ=${d} 时那条错的`, await num('wedge-wrong'), r * d, 1e-3);
}

/* ③ 图上那三样东西都在:扇形、单独描出来的弧、已扫过的区域 */
for (const sel of ['[data-wedge]', '[data-arc]', '[data-swept]', '[data-curve]']) {
  if (!(await page.$(sel))) fail.push(`图上缺少 ${sel}`);
}
await page.screenshot({ path: join(OUT, 'polar-circle.png') });

/* ④ 心形线:面积 3π/2,而错公式给 2π */
await page.click('[data-curve="cardioid"]');
await page.waitForTimeout(150);
near('心形线面积', await num('total-right'), (3 * Math.PI) / 2, 2e-2);
near('心形线上错公式', await num('total-wrong'), 2 * Math.PI, 2e-2);
near('心形线鞋带', await num('shoelace'), (3 * Math.PI) / 2, 3e-2);
if (await page.$('[data-readout="circumference"]')) {
  fail.push('只有圆那一课才该出现"这是周长"那句话');
}
if (await page.$('[data-readout="zero-note"]')) {
  fail.push('心形线上错公式不是 0,不该出现那段"总和为零"的说明');
}

/* ⑤ ⭐⭐ 玫瑰:面积 2π,而且要能走到 r < 0 的地方并说明 */
await page.click('[data-curve="rose"]');
await page.waitForTimeout(150);
near('玫瑰面积', await num('total-right'), 2 * Math.PI, 3e-2);
/* ⭐⭐⭐ 玫瑰上错公式总和恰好是 0 —— 比圆那个反例还狠,页面必须点出来 */
{
  near('玫瑰上错公式的总和', await num('total-wrong'), 0, 2e-2);
  const z = await read('zero-note');
  if (!z || !z.toLowerCase().includes('zero')) {
    fail.push('玫瑰上错公式算出 0,页面却没说这件事 —— 那它就只是个数字');
  }
}
{
  let sawNegative = false;
  for (let i = 0; i <= 40; i += 1) {
    await setRange(0, (2 * Math.PI * i) / 40);
    if ((await num('r')) < 0) {
      sawNegative = true;
      if (!(await page.$('[data-readout="negative-note"]'))) {
        fail.push('r 变负了,却没有说明负半径是怎么回事');
      }
      break;
    }
  }
  if (!sawNegative) fail.push('拖一整圈都没碰到 r < 0 —— 那段说明就是死界面');
}
await page.screenshot({ path: join(OUT, 'polar-rose.png') });

/* ⑥ 每条曲线都有说明 */
for (const cid of ['circle', 'cardioid', 'rose']) {
  await page.click(`[data-curve="${cid}"]`);
  await page.waitForTimeout(110);
  const n = await read('note');
  if (!n || n.length < 60) fail.push(`${cid} 没有像样的说明`);
}

/* ⑦ 溢出与手机 */
await page.click('[data-curve="circle"]');
await page.waitForTimeout(110);
const over = async () => page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
const wide = await over();
await page.setViewportSize({ width: 390, height: 900 });
await page.waitForTimeout(200);
const narrow = await over();
await page.screenshot({ path: join(OUT, 'polar-390.png'), fullPage: true });
if (wide > 0 || narrow > 0) fail.push(`横向溢出 桌面 ${wide} / 390 ${narrow}`);
if (errors.length) fail.push(`控制台报错:${errors.join(' | ')}`);

await browser.close(); server.close();
console.log(fail.length ? '✗\n  ' + fail.join('\n  ') : '✓ polar:圆上 π 对 2π 一打开就看得见、弧单独描出、负半径说得清,无溢出无报错');
process.exit(fail.length ? 1 : 0);
