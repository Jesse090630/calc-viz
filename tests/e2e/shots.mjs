/**
 * 逐 stage 截图 —— CLAUDE.md 第三层"视觉验证"的执行器。
 *
 * 用法:
 *   npm run build && npx vite preview --port 4173 &
 *   node tests/e2e/shots.mjs
 *
 * 产出 tests/e2e/screenshots/NN-<stageId>.png,供人工(或 AI)按检查清单逐条过。
 * 不做像素比对 —— 现阶段目标是"看得见",不是"防回归"。
 */
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SHOT_DIR ?? join(HERE, 'screenshots');
const DIST = join(HERE, '..', '..', 'dist');
const PORT = Number(process.env.SHOT_PORT ?? 4173);

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.svg': 'image/svg+xml',
};

/** 自带静态服务器,免得还要另开一个终端跑 vite preview */
function serveDist() {
  if (!existsSync(DIST)) {
    console.error(`找不到 ${DIST} —— 先跑 npm run build`);
    process.exit(1);
  }
  const server = createServer((req, res) => {
    const rel = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = join(DIST, rel === '/' ? 'index.html' : rel);
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

const server = process.env.SHOT_URL ? null : await serveDist();
const URL = process.env.SHOT_URL ?? `http://localhost:${PORT}/`;

// 每条链的 stage 顺序必须与 chain.ts 一致;autoplay 的步要多等
const CHAINS = [
  {
    route: 'shell-method',
    stages: [
      ['region', 2000], ['strip', 2000], ['sweep', 5000], ['dims', 2500], ['unroll', 5000],
      ['exact', 2500], ['many', 2500], ['limit', 7000], ['formula', 2500],
    ],
  },
  {
    route: 'derivative',
    stages: [
      ['two-points', 2000], ['the-line', 2000], ['slide', 4500], ['identity', 2500],
      ['both-sides', 2500], ['shrink', 7000], ['tangent', 2500], ['everywhere', 5000],
    ],
  },
  {
    route: 'limits',
    stages: [
      ['hole', 2000], ['from-left', 6000], ['from-right', 6000], ['agree', 2500],
      ['not-the-value', 2500], ['disagree', 6000], ['no-limit', 2500],
    ],
  },
  {
    route: 'disk-method',
    stages: [
      ['same-region', 2000], ['slice-flat', 2000], ['sweep', 5000], ['dims', 2500],
      ['stack', 2500], ['exact', 2500], ['why', 2500], ['formula', 2500],
    ],
  },
  {
    route: 'riemann-sum',
    stages: [
      ['area', 2000], ['rectangles', 2000], ['too-big', 2000], ['too-small', 2000],
      ['squeezed', 2200], ['gap', 2200], ['limit', 7000], ['integral', 4500],
    ],
  },
  {
    route: 'unit-circle',
    stages: [
      ['point', 2200], ['arc-length', 5200], ['drop', 4200], ['carry', 4800],
      ['trace', 9000], ['cosine', 9000], ['repeat', 9000],
    ],
  },
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
let currentShot = 'startup';
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`[${currentShot}] ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`PAGEERROR [${currentShot}]: ${e.stack ?? e.message}`));

// 首页
currentShot = 'home';
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.screenshot({ path: join(OUT, '00-home.png') });
console.log(`  00 home      → "${await page.locator('h1').first().innerText()}"`);

for (const { route, stages } of CHAINS) {
  console.log(`\n  ── ${route} ──`);
  currentShot = `${route}/loading`;
  await page.goto(`${URL}#/${route}`, { waitUntil: 'networkidle' });
  await page.reload({ waitUntil: 'networkidle' }); // 确保从第 1 步开始
  await page.waitForSelector('canvas', { timeout: 20000 });
  await page.waitForTimeout(1800);

  for (const [index, [id, wait]] of stages.entries()) {
    currentShot = `${route}/${id}`;
    if (index > 0) await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(wait);
    const n = String(index + 1).padStart(2, '0');
    await page.screenshot({ path: join(OUT, `${route}-${n}-${id}.png`) });
    const title = await page.locator('aside h1').first().innerText();
    console.log(`  ${n} ${id.padEnd(12)} → "${title}"`);
  }
}

// v2.0:真实输入一条不同曲线，确认防抖验证、应用与动态公式都进入浏览器路径。
currentShot = 'riemann-sum/custom-input';
await page.goto(`${URL}#/riemann-sum`, { waitUntil: 'networkidle' });
await page.locator('summary').filter({ hasText: 'Try your own function' }).click();
await page.locator('#riemann-expression').fill('x^2');
await page.getByLabel('interval a').fill('0');
await page.getByLabel('interval b').fill('2');
await page.waitForTimeout(600);
await page.getByRole('button', { name: 'Build the derivation' }).click();
for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
await page.waitForTimeout(1800);
const customPanel = await page.locator('aside').innerText();
if (!customPanel.includes('2.625000') || !customPanel.includes('2.666667')) {
  errors.push(`[${currentShot}] expected M4=2.625000 and integral=2.666667`);
}
await page.screenshot({ path: join(OUT, 'riemann-custom-x2.png') });
console.log('\n  custom x^2  → "M4 2.625000 · integral 2.666667"');

await page.locator('summary').filter({ hasText: 'Try your own function' }).click();
await page.locator('#riemann-expression').fill('1/x');
await page.waitForTimeout(600);
const invalidStatus = await page.getByRole('status').innerText();
if (!/endpoint|diverge/i.test(invalidStatus)) {
  errors.push(`[riemann-sum/invalid-input] expected a human endpoint-divergence message`);
}
if (!(await page.getByRole('button', { name: 'Build the derivation' }).isDisabled())) {
  errors.push(`[riemann-sum/invalid-input] invalid input must disable Build the derivation`);
}

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${URL}#/riemann-sum`, { waitUntil: 'networkidle' });
await page.locator('summary').filter({ hasText: 'Try your own function' }).click();
await page.waitForTimeout(500);
const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
if (mobileOverflow > 1) errors.push(`[riemann-sum/mobile] horizontal overflow ${mobileOverflow}px`);
await page.screenshot({ path: join(OUT, 'riemann-custom-mobile.png') });
console.log('  custom mobile → "390×844 input panel fits without horizontal overflow"');

await browser.close();
server?.close();

console.log(errors.length === 0 ? '\n✅ 无 console 错误' : `\n❌ ${errors.length} 个错误:`);
for (const e of [...new Set(errors)].slice(0, 10)) console.log('   ', e.slice(0, 1200));
process.exit(errors.length === 0 ? 0 : 1);
