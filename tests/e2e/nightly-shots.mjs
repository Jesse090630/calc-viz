/**
 * 夜巡截图工具(不是回归测试)。
 * 用法:LESSONS=a,b,c node tests/e2e/nightly-shots.mjs
 * 每页出 1280 桌面 + 390 手机两张,存到 tests/e2e/screenshots/nightly/。
 * 存在的理由:自动化断言证明"东西在那儿",证明不了"画对了"。
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = join(HERE, '..', '..', 'dist');
const OUT = join(HERE, 'screenshots', 'nightly');
const PORT = Number(process.env.SHOT_PORT ?? 4199);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.pdf': 'application/pdf' };

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
const lessons = (process.env.LESSONS ?? '').split(',').filter(Boolean);
const browser = await chromium.launch();
const errors = [];

for (const id of lessons) {
  for (const [tag, width, height] of [['desktop', 1280, 900], ['mobile', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${id}/${tag}] ${m.text()}`); });
    page.on('pageerror', (e) => errors.push(`[${id}/${tag}] pageerror ${e.message}`));
    await page.goto(`http://localhost:${PORT}/#/${id}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (overflow) errors.push(`[${id}/${tag}] horizontal overflow`);
    await page.screenshot({ path: join(OUT, `${id}-${tag}.png`), fullPage: true });
    await page.close();
  }
}

await browser.close();
server.close();
console.log(errors.length ? errors.join('\n') : `✓ ${lessons.length} lessons shot, no console errors, no overflow`);
