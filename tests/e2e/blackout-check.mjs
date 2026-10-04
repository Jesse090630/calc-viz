/**
 * 「换版黑屏」的回归检查。
 *
 * ⭐⭐⭐ 事故原话:「whenever i click on the theorem page, i will black out,
 *   or nothing changes」。病因不是哪一课写错了 ——
 *   **用全新浏览器打开线上站点,每一条路由都是好的。**
 *   挨打的是"页面一直开着、跨过了一次部署"的人:
 *   旧 `index.html` 配新 chunk(或者反过来),某个组件解析成 `undefined`,
 *   React 抛 #130,而全站**没有任何 error boundary** ——
 *   React 19 于是把整棵树卸载,`#root` 空掉,屏幕上只剩背景色。
 *
 * ⚠️ 这里用**拦掉课页 chunk** 来复现那一刻(等价于旧文件名已经不在服务器上)。
 *   验的是两件事:
 *     ① 绝不许留下一块空白的 `#root` —— 黑屏是这次事故的全部内容;
 *     ② 自动重载**最多一次**,然后必须显示一条看得懂的消息。
 *   ⭐ 把 `RouteErrorBoundary` 摘掉,这个脚本必须变红;摘掉之前我验过。
 */
import { chromium } from 'playwright-core';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = join(HERE, '..', '..', 'dist');
const PORT = Number(process.env.SHOT_PORT ?? 4218);
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

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const fail = [];

/** 记录一次干净加载里请求过的所有 js。 */
async function jsOf(hash) {
  const page = await browser.newPage();
  const seen = new Set();
  page.on('request', (r) => { if (r.url().endsWith('.js')) seen.add(r.url()); });
  await page.goto(`http://localhost:${PORT}/#/${hash}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.close();
  return seen;
}

/**
 * ⚠️ 只能拦**这条路由自己的** chunk。
 *   把入口静态依赖的那些(Tex / theme / katex)也拦掉的话,React 压根挂载不起来,
 *   boundary 还没出生就没机会了 —— 那测的就不是这次要修的东西。
 *   办法:拿首页加载过的 js 做底,差集里属于课页的那几个才是目标。
 */
const homeJs = await jsOf('');

for (const route of ['theorems', 'mvt']) {
  const routeJs = await jsOf(route);
  const lesson = [...routeJs].filter((u) => !homeJs.has(u) && /\/assets\/page-/.test(u));
  if (lesson.length === 0) { fail.push(`${route}:没找到这条路由自己的 chunk`); continue; }

  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  let reloads = 0;
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) reloads += 1; });
  // ⚠️ 拦掉课页依赖的 chunk,等价于"旧文件名已经不在服务器上了"
  await page.route('**/assets/**', (r) => {
    const u = r.request().url();
    if (lesson.includes(u)) return r.abort();
    return r.continue();
  });
  await page.goto(`http://localhost:${PORT}/#/${route}`, { waitUntil: 'domcontentloaded' });
  // ⚠️ 这里会发生自动重载,执行上下文会被销毁。
  //   所以不能直接 evaluate,要先等恢复提示出现(等不到再去读当时的状态)。
  await page.waitForSelector('[data-route-error]', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(800);

  const state = await page.evaluate(() => ({
    rootEmpty: document.getElementById('root').innerHTML.trim().length === 0,
    hasRecovery: document.querySelectorAll('[data-route-error]').length,
    hasButton: document.querySelectorAll('[data-route-error-reload]').length,
    text: document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 160),
  }));

  // ① 最要紧的一条:绝不许是一块空白
  if (state.rootEmpty) fail.push(`${route}:chunk 取不到时 #root 是空的 —— 黑屏还在`);
  // ② 必须给出看得见的、能操作的出路
  if (state.hasRecovery !== 1) fail.push(`${route}:没有显示恢复提示`);
  if (state.hasButton !== 1) fail.push(`${route}:恢复提示上没有重新加载按钮`);
  if (!/reload/i.test(state.text)) fail.push(`${route}:提示里没告诉用户该怎么办:「${state.text}」`);
  // ③ 自动重载不许失控
  if (reloads > 3) fail.push(`${route}:自动重载了 ${reloads} 次,有打转的风险`);
  await page.close();
}

/* ④ 正常情况下不许出现这块提示 —— 上面那些不是恒真 */
{
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/#/theorems`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const n = await page.locator('[data-route-error]').count();
  const btns = await page.locator('[data-theorem]').count();
  if (n !== 0) fail.push('一切正常时竟然显示了恢复提示');
  if (btns !== 9) fail.push(`一切正常时页面没正常渲染(${btns} 个按钮)`);
  await page.close();
}

await browser.close(); server.close();
console.log(fail.length ? '✗\n  ' + fail.join('\n  ') : '✓ blackout:chunk 取不到时不再是空白,给出看得懂的提示和重新加载按钮,且不会反复重载');
process.exit(fail.length ? 1 : 0);
