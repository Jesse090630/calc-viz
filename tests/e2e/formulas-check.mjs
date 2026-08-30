/**
 * 公式表页面 + Formula Deck 的浏览器专项检查。
 *
 * ⭐⭐ 三件事:
 *   ① **一条公式都不许渲染成红字** —— KaTeX 失败不崩溃,它在页面上画一块红色错误框;
 *   ② PDF 链接带 base,在**子路径**下也拿得到(线上就是 /calc-viz/);
 *   ③ 「Why?」按钮点进去真的是那一课,不是安静地回首页。
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SHOT_DIR ?? join(HERE, 'screenshots');
const DIST = join(HERE, '..', '..', 'dist');
const PORT = 4215;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.pdf': 'application/pdf' };
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
const BASE = `http://localhost:${PORT}/`;

mkdirSync(OUT, { recursive: true });
const errors = [];
const note = (m) => errors.push(m);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1400 }, deviceScaleFactor: 2 });
page.on('console', (m) => { if (m.type() === 'error') note(`console: ${m.text()}`); });
page.on('pageerror', (e) => note(`pageerror: ${e.message}`));

/** ⭐⭐ KaTeX 渲染失败画的是 `.katex-error`,而且带一个红色的 title。 */
const katexErrors = () => page.evaluate(() =>
  [...document.querySelectorAll('.katex-error')].map((el) => el.getAttribute('title') || el.textContent || '?'));

await page.goto(`${BASE}#/formulas`, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-sheet-page]');

/* ① 每一条都渲染得出来 */
{
  const shown = await page.evaluate(() => ({
    cards: document.querySelectorAll('[data-formula]').length,
    count: Number(document.querySelector('[data-readout="count"]')?.textContent),
    pages: [...document.querySelectorAll('[data-sheet-page]')].map((el) => Number(el.getAttribute('data-sheet-page'))),
    rendered: document.querySelectorAll('[data-formula] .katex').length,
  }));
  if (shown.cards < 110) note(`only ${shown.cards} formula cards rendered`);
  if (shown.cards !== shown.count) note(`the header says ${shown.count} formulas but ${shown.cards} cards are drawn`);
  if (shown.rendered < shown.cards) note(`${shown.cards - shown.rendered} cards rendered no math at all`);
  // 八页表:每一页都得在
  for (const want of [1, 2, 3, 4, 5, 7, 8]) {
    if (!shown.pages.includes(want)) note(`page ${want} of the sheet is missing`);
  }
  const bad = await katexErrors();
  if (bad.length) note(`${bad.length} formulas failed to render — first: ${bad.slice(0, 3).join(' | ')}`);
  await page.screenshot({ path: join(OUT, 'formula-sheet.png'), fullPage: true });
}

/* 页码筛选 */
{
  await page.locator('[data-page="8"]').click();
  await page.waitForTimeout(150);
  const only = await page.evaluate(() =>
    [...document.querySelectorAll('[data-sheet-page]')].map((el) => el.getAttribute('data-sheet-page')));
  if (only.join(',') !== '8') note(`filtering to p.8 shows pages ${only.join(',')}`);
  const seriesCards = await page.locator('[data-formula]').count();
  if (seriesCards < 25) note(`page 8 only has ${seriesCards} cards — the BC material looks thin`);
  await page.locator('[data-page="all"]').click();
  await page.waitForTimeout(150);
}

/* ② PDF 链接带 base,而且真的取得到 */
{
  const href = await page.locator('[data-action="download-pdf"]').getAttribute('href');
  if (!href) note('no download link');
  const res = await page.request.get(new URL(href, BASE).toString());
  if (!res.ok()) note(`the PDF link returned ${res.status()}`);
  const body = await res.body();
  if (body.length < 100000) note(`the PDF is only ${body.length} bytes`);
  if (body.subarray(0, 5).toString() !== '%PDF-') note('the download is not a PDF');
}

/* ③ Why? 按钮点进去真的换了课 */
{
  const routes = await page.evaluate(() =>
    [...new Set([...document.querySelectorAll('[data-derive]')].map((el) => el.getAttribute('data-derive')))]);
  if (routes.length < 12) note(`only ${routes.length} distinct derivation links on the sheet`);
  let checked = 0;
  for (const route of routes.slice(0, 6)) {
    await page.goto(`${BASE}#/formulas`, { waitUntil: 'networkidle' });
    await page.waitForSelector(`[data-derive="${route}"]`);
    await page.locator(`[data-derive="${route}"]`).first().click();
    await page.waitForTimeout(700);
    const landed = await page.evaluate(() => ({
      hash: location.hash,
      h1: document.querySelector('h1')?.textContent?.trim() ?? '',
    }));
    if (landed.hash !== `#/${route}`) note(`clicking ${route} went to ${landed.hash}`);
    // ⚠️ 光看 hash 不够 —— hash 路由认不出的名字会**安静地**渲染首页
    if (landed.h1 === 'Formula Sheet' || landed.h1 === '') note(`${route} did not render a lesson (h1 "${landed.h1}")`);
    checked += 1;
  }
  if (checked !== 6) note(`only followed ${checked} derivation links`);
}

/* ⭐⭐ Formula Deck 必须在**有动画的页面上**也打得开 —— 这是一次真事故的回归测试。
 *
 * 目录扩到八页之后,弹窗在首页**再也点不开了**:没有报错、chunk 也下载成功,
 * 组件每秒被调用一百多次,Suspense 的 fallback 却一直挂着。
 * 病因是第一次渲染要跑两百多条 KaTeX(≈1 秒),而首页和动画课上有 rAF 驱动的
 * 高优先级更新在持续产生,React 把这次低优先级渲染**反复从头重启** —— 它是被饿死的。
 * 实测:静态页 749 ms 就开,首页 8 秒开不出来。
 *
 * ⚠️ 所以只在**静的**页面上测「弹窗能开」是测不出东西的,那正是当时漏掉它的原因。
 * 下面三条路线必须都在预算内打开:首页、一节动画课、以及静态的公式表页做对照。
 */
{
  const BUDGET_MS = 6000;
  for (const [route, what] of [['', 'the home page (previews animating)'], ['#/cut-the-square', 'an animated lesson'], ['#/formulas', 'the static sheet']]) {
    await page.goto(BASE + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);           // 让动画真的跑起来
    const started = Date.now();
    await page.getByRole('button', { name: 'Open formula deck' }).click();
    let opened = true;
    try { await page.waitForSelector('[data-formula-deck]', { timeout: BUDGET_MS }); } catch { opened = false; }
    if (!opened) note(`the formula deck never opened on ${what} within ${BUDGET_MS}ms`);
    else if (Date.now() - started > 3000) note(`the deck took ${Date.now() - started}ms to open on ${what}`);
    const cards = await page.locator('[data-formula-deck] article').count();
    if (opened && cards < 150) note(`the deck opened on ${what} with only ${cards} cards`);
    // ⚠️ 开着的弹窗会盖住触发按钮,下一轮点不到。顺手也验证了 Esc 真的能关。
    if (opened) {
      await page.keyboard.press('Escape');
      await page.waitForSelector('[data-formula-deck]', { state: 'detached', timeout: 4000 })
        .catch(() => note(`Escape did not close the deck on ${what}`));
    }
  }
}

/* ⭐ 纸上有八页,页码条就得列八个 —— 少一页而不作声,是页面在骗人。
 * p.6 讲的是读符号,站里由 Type board 承担,一条公式卡都没有;
 * 第一版从数据里推页码,于是它**静悄悄地消失了**。 */
{
  await page.goto(`${BASE}#/formulas`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-panel="pages"]');
  const chips = await page.locator('[data-panel="pages"] button[data-page]').evaluateAll(
    (list) => list.map((b) => b.getAttribute('data-page')),
  );
  for (const want of ['all', '1', '2', '3', '4', '5', '6', '7', '8']) {
    if (!chips.includes(want)) note(`the page bar is missing a chip for p.${want}`);
  }
  await page.locator('[data-page="6"]').click();
  await page.waitForTimeout(250);
  const empty = await page.locator('[data-empty-page="6"]').count();
  if (empty !== 1) note(`p.6 shows neither cards nor an explanation of where it went`);
  const linksToBoard = await page.locator('[data-empty-page="6"] a[href="#/notation"]').count();
  if (linksToBoard !== 1) note(`p.6 does not point at the Type board`);
}

/* Formula Deck:同一份数据,搜索能找到新条目 */
{
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Open formula deck' }).click();
  await page.waitForSelector('[data-formula-deck]', { timeout: 8000 });
  const search = page.locator('[data-formula-deck] input');
  for (const [needle, expect] of [['ratio test', 1], ['logistic', 1], ['Rolle', 1], ['Taylor', 1], ['parametric', 1]]) {
    await search.fill(needle);
    await page.waitForTimeout(140);
    const hits = await page.locator('[data-formula-deck] article').count();
    if (hits < expect) note(`searching "${needle}" in the deck found ${hits} cards`);
  }
  await search.fill('');
  await page.waitForTimeout(160);
  const deckBad = await katexErrors();
  if (deckBad.length) note(`${deckBad.length} deck formulas failed to render`);
  await page.screenshot({ path: join(OUT, 'formula-deck.png'), fullPage: false });
}

/* 窄屏 */
{
  await page.goto(`${BASE}#/formulas`, { waitUntil: 'networkidle' });
  await page.setViewportSize({ width: 430, height: 1600 });
  await page.waitForTimeout(350);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 2) note(`the sheet scrolls sideways on a 430px screen by ${overflow}px`);
}

await browser.close();
server.close();
if (errors.length) { console.error('✗\n' + errors.slice(0, 20).map((e) => '  ' + e).join('\n')); process.exit(1); }
console.log('✓ formula sheet + deck clean');
