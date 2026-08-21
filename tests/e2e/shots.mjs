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
  {
    route: 'trig-rates',
    stages: [
      ['moving-point', 2200], ['two-positions', 2200], ['divide-by-time', 2200],
      ['shrink-gap', 6500], ['tangent-vector', 2200], ['sine-rate', 2200],
      ['cosine-rate', 2200], ['reverse-arrows', 2200],
    ],
  },
];

const RECOMMENDED_NEXT = {
  limits: '#/derivative',
  derivative: '#/riemann-sum',
  'riemann-sum': '#/shell-method',
  'shell-method': '#/disk-method',
  'disk-method': '#/unit-circle',
  'unit-circle': '#/trig-rates',
  'trig-rates': '#/limits',
};

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

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

async function auditKeyboardFocus(label) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  const visibleCount = await page.locator(FOCUSABLE).evaluateAll((elements) =>
    elements.filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    }).length,
  );
  const failures = [];
  const seen = [];
  for (let index = 0; index < visibleCount; index += 1) {
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => {
      const element = document.activeElement;
      if (!(element instanceof HTMLElement)) return null;
      const style = getComputedStyle(element);
      return {
        name: element.getAttribute('aria-label') ?? element.textContent?.trim().slice(0, 60) ?? element.tagName,
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        outlineColor: style.outlineColor,
      };
    });
    seen.push(focus?.name ?? 'none');
    if (!focus || focus.outlineStyle === 'none' || Number.parseFloat(focus.outlineWidth) < 3) {
      failures.push(`${focus?.name ?? 'no active element'} (${focus?.outlineStyle ?? 'none'} ${focus?.outlineWidth ?? '0'})`);
    }
  }
  if (failures.length > 0) errors.push(`[${label}/focus] ${failures.join(', ')}`);
  console.log(`  ${label} focus → "${visibleCount} tab stops · ${new Set(seen).size} identified · 3px rings"`);
}

// 首页
currentShot = 'home';
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.waitForSelector('[data-home-hero] canvas', { timeout: 20000 });
const hero = page.locator('[data-home-hero]');
const heroSliders = hero.locator('input[type="range"]');
if (await heroSliders.count() !== 1) errors.push(`[home/hero] expected exactly one slider, got ${await heroSliders.count()}`);
const heroNumbersAt4 = await hero.locator('[aria-live="polite"]').innerText();
if (!heroNumbersAt4.includes('4.250000') || !heroNumbersAt4.includes('5.333333') || !heroNumbersAt4.includes('6.250000')) {
  errors.push('[home/hero] n=4 must show 4.250000 ≤ 5.333333 ≤ 6.250000');
}
await page.waitForTimeout(1800);
if (await heroSliders.inputValue() !== '4') errors.push('[home/hero] the static demo must not autoplay');
await heroSliders.fill('8');
const heroNumbersAt8 = await hero.locator('[aria-live="polite"]').innerText();
if (!heroNumbersAt8.includes('4.812500') || !heroNumbersAt8.includes('5.333333') || !heroNumbersAt8.includes('5.812500')) {
  errors.push('[home/hero] n=8 must show 4.812500 ≤ 5.333333 ≤ 5.812500');
}
await heroSliders.fill('4');

const homeTitles = await page.locator('[data-concept-card] h3').allInnerTexts();
const expectedHomeTitles = [
  'Left and Right Limits',
  'Secant → Tangent',
  'Riemann Sums → the Integral',
  'The Shell Method',
  'The Disk Method',
  'The Unit Circle and sin / cos',
  'Trig Derivatives ↔ Integrals',
];
if (homeTitles.join('|') !== expectedHomeTitles.join('|')) {
  errors.push(`[home/order] expected ${expectedHomeTitles.join(' → ')}, got ${homeTitles.join(' → ')}`);
}
const trackTitles = await page.locator('section[aria-labelledby^="track-"] h2').allInnerTexts();
if (trackTitles.map((title) => title.toLowerCase()).join('|') !== 'foundations|integration|3d volume|trigonometry') {
  errors.push(`[home/tracks] unexpected track order: ${trackTitles.join(' → ')}`);
}
const thumbnails = page.locator('[data-concept-card] img');
if (await thumbnails.count() !== 7) errors.push(`[home/thumbnails] expected 7 static images, got ${await thumbnails.count()}`);
for (let index = 0; index < await thumbnails.count(); index += 1) {
  const thumbnail = thumbnails.nth(index);
  await thumbnail.scrollIntoViewIfNeeded();
  await thumbnail.evaluate((image) => image.decode());
  const loaded = await thumbnail.evaluate((image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
  if (!loaded) errors.push(`[home/thumbnails] image ${index + 1} did not load`);
}
await page.screenshot({ path: join(OUT, 'home-tracks.png'), fullPage: true });
// range.fill() 会把焦点留在滑块；重新载入后从文档第一个停靠点开始审计完整 Tab 顺序。
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-home-hero] canvas', { timeout: 20000 });
await auditKeyboardFocus('home');
await page.evaluate(() => scrollTo(0, 0));
await page.screenshot({ path: join(OUT, '00-home.png') });
console.log(`  00 home      → "interactive squeeze · 7 static thumbnails · 4 dependency tracks"`);

currentShot = 'home/mobile';
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-home-hero] canvas', { timeout: 20000 });
const homeMobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
if (homeMobileOverflow > 1) errors.push(`[home/mobile] horizontal overflow ${homeMobileOverflow}px`);
if (!(await page.getByRole('heading', { name: 'Drag the picture. Watch the formula tighten.' }).isVisible())) {
  errors.push('[home/mobile] hero thesis is not visible');
}
await page.screenshot({ path: join(OUT, 'home-mobile.png') });
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(URL, { waitUntil: 'networkidle' });
console.log('  home mobile  → "390×844 · live scene + thesis · no horizontal overflow"');

// Calc Type Board:独立路由、符号/名称/读法搜索、分类和 Why 跳转都走真实浏览器路径。
currentShot = 'notation-board/desktop';
const typeBoardEntry = page.getByRole('link', { name: 'Open calc type board' });
if (!(await typeBoardEntry.isVisible())) errors.push('[notation-board/entry] global toolbar link is not visible');
await typeBoardEntry.click();
await page.getByRole('heading', { name: 'Learn to read calculus before you calculate it.' }).waitFor();
if (!page.url().endsWith('#/notation')) errors.push('[notation-board/route] toolbar did not open #/notation');
const notationDialog = page.getByRole('dialog', { name: 'Learn to read calculus before you calculate it.' });
const notationClose = page.getByRole('button', { name: 'Close calc type board' });
const notationInitialFocus = await page.evaluate(() => document.activeElement?.getAttribute('placeholder'));
if (notationInitialFocus !== 'Search ∫, integral, dee ex, stretched S…') {
  errors.push(`[notation-board/focus] search was not initially focused, got ${notationInitialFocus}`);
}
if (!(await page.locator('#root').getAttribute('inert') === '')) {
  errors.push('[notation-board/inert] app background is not inert while the dialog is open');
}
await notationClose.press('Shift+Tab');
const notationWrappedBackward = await notationDialog.evaluate((dialog) => dialog.contains(document.activeElement));
if (!notationWrappedBackward) errors.push('[notation-board/focus] Shift+Tab escaped the dialog');
await page.keyboard.press('Tab');
const notationWrappedForward = await notationDialog.evaluate((dialog) => dialog.contains(document.activeElement));
if (!notationWrappedForward) errors.push('[notation-board/focus] Tab escaped the dialog');
await page.keyboard.press('Escape');
await notationDialog.waitFor({ state: 'hidden', timeout: 1000 });
await page.waitForTimeout(50);
if (await notationDialog.isVisible().catch(() => false)) errors.push('[notation-board/escape] Escape did not close the dialog');
if (await page.locator('#root').getAttribute('inert') !== null) errors.push('[notation-board/inert] background remained inert after close');
if ((await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))) !== 'Open calc type board') {
  errors.push('[notation-board/focus] close did not return focus to the Type Board trigger');
}
await typeBoardEntry.click();
await notationDialog.waitFor();
const notationStatus = await page.getByRole('status').innerText();
if (!notationStatus.toLowerCase().includes('31 symbols')) errors.push(`[notation-board/count] expected 31 symbols, got ${notationStatus}`);
await page.screenshot({ path: join(OUT, 'notation-board-desktop.png') });

const notationSearch = page.getByPlaceholder('Search ∫, integral, dee ex, stretched S…');
await notationSearch.fill('dee ex');
const dxCard = page.locator('[data-notation-card="dx"]');
if (!(await dxCard.isVisible())) errors.push('[notation-board/search-say] “dee ex” did not find dx');
const dxText = (await dxCard.innerText()).toLowerCase();
if (!dxText.includes('dee ex') || !dxText.includes('not decoration') || !dxText.includes('times x')) {
  errors.push('[notation-board/dx] pronunciation or substantive misconception is missing');
}
await notationSearch.fill('stretched S');
const integralCard = page.locator('[data-notation-card="integral"]');
if (!(await integralCard.isVisible())) errors.push('[notation-board/search-description] “stretched S” did not find integral');
await notationSearch.fill('');
await page.getByRole('button', { name: 'Relations & logic' }).click();
if (await page.locator('[data-notation-card]').count() !== 8) {
  errors.push('[notation-board/category] Relations & logic must contain exactly 8 cards');
}
await page.getByRole('button', { name: 'All', exact: true }).click();
await notationSearch.fill('stretched S');
await integralCard.getByRole('link', { name: /watch the derivation/i }).click();
await page.waitForSelector('canvas', { timeout: 20000 });
if (!page.url().endsWith('#/riemann-sum')) errors.push('[notation-board/why] integral Why link did not open riemann-sum');
console.log('  type board   → "31 symbols · search by say/shape · 8 relation cards · Why opens Riemann"');

currentShot = 'notation-board/mobile';
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${URL}#/notation`, { waitUntil: 'networkidle' });
const notationMobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
if (notationMobileOverflow > 1) errors.push(`[notation-board/mobile] horizontal overflow ${notationMobileOverflow}px`);
await page.getByPlaceholder('Search ∫, integral, dee ex, stretched S…').fill('dee ex');
await page.locator('[data-notation-card="dx"]').scrollIntoViewIfNeeded();
await page.screenshot({ path: join(OUT, 'notation-board-mobile.png') });
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(URL, { waitUntil: 'networkidle' });
console.log('  type mobile  → "390×844 · dx pronunciation + misconception · no horizontal overflow"');

// 全站公式抽屉:桌面打开、搜索与 Why 跳转,再检查手机宽度。
currentShot = 'formula-deck/desktop';
await page.getByRole('button', { name: 'Open formula deck' }).click();
const formulaDialog = page.getByRole('dialog', { name: 'Formula deck' });
await formulaDialog.waitFor();
const formulaInitialFocus = await page.evaluate(() => document.activeElement?.getAttribute('placeholder'));
if (formulaInitialFocus !== 'Search sin, product rule, area…') {
  errors.push(`[formula-deck/focus] search was not initially focused, got ${formulaInitialFocus}`);
}
if (!(await page.locator('#root').getAttribute('inert') === '')) {
  errors.push('[formula-deck/inert] app background is not inert while the dialog is open');
}
await page.getByRole('button', { name: 'Close formula deck' }).press('Shift+Tab');
if (!(await formulaDialog.evaluate((dialog) => dialog.contains(document.activeElement)))) {
  errors.push('[formula-deck/focus] Shift+Tab escaped the dialog');
}
await page.keyboard.press('Tab');
if (!(await formulaDialog.evaluate((dialog) => dialog.contains(document.activeElement)))) {
  errors.push('[formula-deck/focus] Tab escaped the dialog');
}
await page.keyboard.press('Escape');
await formulaDialog.waitFor({ state: 'hidden', timeout: 1000 });
await page.waitForTimeout(50);
if (await page.locator('#root').getAttribute('inert') !== null) {
  errors.push('[formula-deck/inert] background remained inert after close');
}
if ((await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))) !== 'Open formula deck') {
  errors.push('[formula-deck/focus] close did not return focus to the Formula Deck trigger');
}
await page.getByRole('button', { name: 'Open formula deck' }).click();
await formulaDialog.waitFor();
await page.screenshot({ path: join(OUT, 'formula-deck-desktop.png') });
await page.getByPlaceholder('Search sin, product rule, area…').fill('Sine');
const sineCard = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Sine', exact: true }) }).first();
if (!(await sineCard.isVisible())) errors.push('[formula-deck/search] derivative Sine card is missing');
await sineCard.getByRole('link', { name: /watch the derivation/i }).click();
await page.waitForSelector('canvas', { timeout: 20000 });
if (!page.url().endsWith('#/trig-rates')) errors.push('[formula-deck/why] Sine Why link did not open trig-rates');
console.log('  formula deck → "search Sine · Why opens trig-rates"');

currentShot = 'formula-deck/mobile';
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Open formula deck' }).click();
await page.getByRole('dialog', { name: 'Formula deck' }).waitFor();
const deckOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
if (deckOverflow > 1) errors.push(`[formula-deck/mobile] horizontal overflow ${deckOverflow}px`);
const categoryMetrics = await page.getByRole('navigation', { name: 'Formula categories' }).evaluate((element) => ({
  clientWidth: element.clientWidth,
  scrollWidth: element.scrollWidth,
}));
if (categoryMetrics.scrollWidth <= categoryMetrics.clientWidth) {
  errors.push('[formula-deck/mobile] category row does not expose a horizontal scroll affordance');
}
if (!(await page.locator('[data-category-scroll-hint]').isVisible())) {
  errors.push('[formula-deck/mobile] category scroll hint is not visible');
}
await page.screenshot({ path: join(OUT, 'formula-deck-mobile.png') });
await page.keyboard.press('Escape');
if (await page.getByRole('dialog', { name: 'Formula deck' }).isVisible().catch(() => false)) {
  errors.push('[formula-deck/mobile] Escape did not close the drawer');
}
await page.setViewportSize({ width: 1440, height: 900 });
console.log('  formula mobile → "390×844 · right fade/arrow · no page overflow · Escape closes"');

for (const { route, stages } of CHAINS) {
  console.log(`\n  ── ${route} ──`);
  currentShot = `${route}/loading`;
  await page.goto(`${URL}#/${route}`, { waitUntil: 'networkidle' });
  await page.reload({ waitUntil: 'domcontentloaded' }); // WebGL 帧循环不保证 networkidle;这里只需确保从第 1 步开始
  await page.waitForSelector('canvas', { timeout: 20000 });
  await page.waitForTimeout(1800);

  const sceneDescription = page.getByRole('img').first();
  const sceneLabel = await sceneDescription.getAttribute('aria-label');
  if (!sceneLabel || sceneLabel.length < 56) errors.push(`[${route}/alt-text] missing substantive scene description`);
  const liveAnnouncement = await page.locator('.sr-only[aria-live="polite"]').first().innerText();
  if (!liveAnnouncement.toLowerCase().includes('step 1 of')) errors.push(`[${route}/aria-live] current step is not announced`);

  for (const [index, [id, wait]] of stages.entries()) {
    currentShot = `${route}/${id}`;
    if (index > 0) await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(wait);
    const n = String(index + 1).padStart(2, '0');
    await page.screenshot({ path: join(OUT, `${route}-${n}-${id}.png`) });
    const title = await page.locator('aside h1').first().innerText();
    console.log(`  ${n} ${id.padEnd(12)} → "${title}"`);
  }

  const recommendation = page.locator('[data-recommended-next]');
  if (!(await recommendation.isVisible().catch(() => false))) {
    errors.push(`[${route}/recommended-next] final stage has no visible recommendation`);
  } else {
    const href = await recommendation.getAttribute('href');
    if (href !== RECOMMENDED_NEXT[route]) {
      errors.push(`[${route}/recommended-next] expected ${RECOMMENDED_NEXT[route]}, got ${href}`);
    }
  }
}

// Unit Circle 手机末幕:现有 wide 相机必须同时装下圆与完整 2π 时间轴。
currentShot = 'unit-circle/mobile';
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${URL}#/unit-circle`, { waitUntil: 'networkidle' });
await page.waitForSelector('canvas', { timeout: 20000 });
for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight');
await page.waitForTimeout(9000);
const unitMobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
if (unitMobileOverflow > 1) errors.push(`[unit-circle/mobile] horizontal overflow ${unitMobileOverflow}px`);
const unitMobilePanel = await page.locator('aside').innerText();
if (!unitMobilePanel.toLowerCase().includes('step 7 of 7') || !unitMobilePanel.includes('A second lap draws the same wave')) {
  errors.push('[unit-circle/mobile] final stage content is not visible');
}
const unitNavBounds = await page.getByRole('button', { name: 'Previous step' }).evaluate((button) => {
  const element = button.parentElement;
  if (!element) throw new Error('Previous step button has no navigation parent');
  const rect = element.getBoundingClientRect();
  return { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left, position: getComputedStyle(element).position };
});
if (unitNavBounds.position !== 'fixed' || unitNavBounds.left < -1 || unitNavBounds.right > 391 || unitNavBounds.bottom > 845) {
  errors.push(`[unit-circle/mobile] bottom navigation escaped viewport: ${JSON.stringify(unitNavBounds)}`);
}
await auditKeyboardFocus('unit-circle/mobile');
await page.screenshot({ path: join(OUT, 'unit-circle-mobile.png') });
console.log('\n  unit mobile → "390×844 final circle + 2π axis · fixed nav · keyboard focus rings"');
await page.setViewportSize({ width: 1440, height: 900 });

// 新链手机末幕:画布、两条反向公式与底部导航必须同时可达。
currentShot = 'trig-rates/mobile';
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${URL}#/trig-rates`, { waitUntil: 'networkidle' });
await page.waitForSelector('canvas', { timeout: 20000 });
for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight');
await page.waitForTimeout(2200);
const trigMobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
if (trigMobileOverflow > 1) errors.push(`[trig-rates/mobile] horizontal overflow ${trigMobileOverflow}px`);
const trigMobilePanel = await page.locator('aside').innerText();
if (!trigMobilePanel.includes('Reverse the derivative arrows') || !trigMobilePanel.includes('+C')) {
  errors.push('[trig-rates/mobile] final derivative/integral formulas are not visible');
}
await page.screenshot({ path: join(OUT, 'trig-rates-mobile.png') });
console.log('\n  trig mobile → "390×844 final formulas · no horizontal overflow"');
await page.setViewportSize({ width: 1440, height: 900 });

// v2.0:真实输入一条不同曲线，确认防抖验证、应用与动态公式都进入浏览器路径。
currentShot = 'riemann-sum/custom-input';
await page.goto(`${URL}#/riemann-sum`, { waitUntil: 'networkidle' });
const customInputEnabled = await page.locator('summary').filter({ hasText: 'Try your own function' }).count() > 0;
if (customInputEnabled) {
await page.locator('summary').filter({ hasText: 'Try your own function' }).click();
await page.locator('#riemann-expression').fill('x^2');
await page.getByLabel('riemann interval a').fill('0');
await page.getByLabel('riemann interval b').fill('2');
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
const mobileDetails = page.locator('details').filter({ hasText: 'Try your own function' });
if (!(await mobileDetails.evaluate((element) => element.open))) {
  await page.locator('summary').filter({ hasText: 'Try your own function' }).click();
}
await page.waitForTimeout(500);
const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
if (mobileOverflow > 1) errors.push(`[riemann-sum/mobile] horizontal overflow ${mobileOverflow}px`);
if (!(await page.getByLabel('riemann preset').isVisible())) {
  errors.push('[riemann-sum/mobile] expanded preset picker is not visible');
}
await page.screenshot({ path: join(OUT, 'riemann-custom-mobile.png') });
console.log('  custom mobile → "390×844 input panel fits without horizontal overflow"');

await page.setViewportSize({ width: 1440, height: 900 });
currentShot = 'riemann-sum/preset-sine';
await page.goto(`${URL}#/riemann-sum`, { waitUntil: 'networkidle' });
const sineDetails = page.locator('details').filter({ hasText: 'Try your own function' });
if (!(await sineDetails.evaluate((element) => element.open))) {
  await page.locator('summary').filter({ hasText: 'Try your own function' }).click();
}
await page.getByLabel('riemann preset').selectOption('riemann-sine');
await page.getByRole('button', { name: 'Build the derivation' }).click();
for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
await page.waitForTimeout(1800);
const sinePanel = await page.locator('aside').innerText();
if (!sinePanel.includes('2.052344') || !sinePanel.includes('2.000000')) {
  errors.push(`[${currentShot}] expected sine M4=2.052344 and integral=2.000000`);
}
await page.screenshot({ path: join(OUT, 'riemann-preset-sine.png') });
console.log('  preset sine  → "M4 2.052344 · integral 2.000000"');

for (const custom of [
  {
    route: 'shell-method', prefix: 'shell', title: 'Try your own shell region',
    tryLabel: 'Cone side', steps: 6, sum: '8.639380', exact: '8.377580', shot: 'shell-custom-linear.png',
  },
  {
    route: 'disk-method', prefix: 'disk', title: 'Try your own disk radius',
    presetId: 'disk-cone', steps: 4, sum: '8.246681', exact: '8.377580', shot: 'disk-custom-linear.png',
  },
]) {
  currentShot = `${custom.route}/custom-input`;
  await page.goto(`${URL}#/${custom.route}`, { waitUntil: 'networkidle' });
  await page.locator('summary').filter({ hasText: custom.title }).click();
  if (custom.tryLabel) await page.getByLabel(`${custom.prefix} try ${custom.tryLabel}`).click();
  if (custom.presetId) await page.getByLabel(`${custom.prefix} preset`).selectOption(custom.presetId);
  await page.getByRole('button', { name: 'Build the derivation' }).click();
  for (let i = 0; i < custom.steps; i++) await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(2200);
  const panel = await page.locator('aside').innerText();
  if (!panel.includes(custom.sum) || !panel.includes(custom.exact)) {
    errors.push(`[${currentShot}] expected ${custom.sum} and ${custom.exact}`);
  }
  await page.screenshot({ path: join(OUT, custom.shot) });
  console.log(`  custom ${custom.prefix.padEnd(5)} → "sum ${custom.sum} · volume ${custom.exact}"`);
}
} else {
  for (const [route, title] of [
    ['riemann-sum', 'Try your own function'],
    ['shell-method', 'Try your own shell region'],
    ['disk-method', 'Try your own disk radius'],
  ]) {
    currentShot = `${route}/custom-input-disabled`;
    await page.goto(`${URL}#/${route}`, { waitUntil: 'networkidle' });
    if (await page.locator('summary').filter({ hasText: title }).count() > 0) {
      errors.push(`[${currentShot}] custom input entry must not render while the feature flag is off`);
    }
  }
  console.log('\n  custom input → "feature flag off · all three UI entries absent"');
}

// W5:系统要求减弱动态效果时,autoplay 数据直接以终态进入画面,不等待延迟或补间。
currentShot = 'reduced-motion';
const reducedPage = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
reducedPage.on('console', (m) => {
  if (m.type() === 'error') errors.push(`[${currentShot}] ${m.text()}`);
});
reducedPage.on('pageerror', (e) => errors.push(`PAGEERROR [${currentShot}]: ${e.stack ?? e.message}`));
await reducedPage.goto(`${URL}#/unit-circle`, { waitUntil: 'networkidle' });
await reducedPage.waitForSelector('canvas', { timeout: 20000 });
if (!(await reducedPage.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches))) {
  errors.push('[reduced-motion] browser did not expose the reduced-motion media preference');
}
await reducedPage.keyboard.press('ArrowRight');
await reducedPage.waitForTimeout(50);
const reducedPanel = await reducedPage.locator('aside').innerText();
if (!reducedPanel.includes('1.047198')) {
  errors.push('[reduced-motion] autoplay did not land at theta = 1.047198 immediately');
}
await reducedPage.close();
console.log('  reduced motion → "autoplay lands immediately at θ = 1.047198 · no tween delay"');

await browser.close();
server?.close();

console.log(errors.length === 0 ? '\n✅ 无 console 错误' : `\n❌ ${errors.length} 个错误:`);
for (const e of [...new Set(errors)].slice(0, 10)) console.log('   ', e.slice(0, 1200));
process.exit(errors.length === 0 ? 0 : 1);
