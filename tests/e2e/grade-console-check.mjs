/**
 * 「Grade Console」的浏览器专项检查 —— 对着**真实课程**的数。
 *
 * ⭐⭐⭐ 这一页会被拿来做真决定(要不要做项目、期末要拼到什么程度),
 *   所以每个期望值都在这个文件里**独立手算**,一个都不从页面上抄。
 *
 * ⚠️ 交接文档里那张规划表的中间几行是错的(斜率用成了 0.26/分,
 *   四项计分时真实斜率是 0.65/分)。这里钉的是**算对之后**的数。
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SHOT_DIR ?? join(HERE, 'screenshots');
const DIST = join(HERE, '..', '..', 'dist');
const PORT = Number(process.env.SHOT_PORT ?? 4244);
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

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 1500 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });

const fail = [];
const note = (m) => fail.push(m);
const count = (sel) => page.$$eval(sel, (els) => els.length);
/** ⚠️ 读 `data-value` 上的原始数,不读渲染出来的字符串。 */
const val = (k) => page.$eval(`[data-read="${k}"]`, (el) => (el.dataset.value === '' ? null : Number(el.dataset.value)));
const attr = (sel, n) => page.$eval(sel, (el, a) => el.getAttribute(a), n);
const text = (sel) => page.$eval(sel, (el) => el.textContent.replace(/\s+/g, ' ').trim()).catch(() => null);
const has = async (sel) => (await count(sel)) > 0;

async function setField(key, value) {
  await page.$eval(`[data-field="${key}"]`, (el, v) => {
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(el, String(v));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
  await page.waitForTimeout(120);
}
async function setEarned(i, value) {
  await page.$eval(`[data-earned="${i}"]`, (el, v) => {
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(el, String(v));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
  await page.waitForTimeout(120);
}

/** 三个分项现在是自由数字框,不再是离散按钮。 */
async function setComponent(key, value) {
  await page.$eval(`[data-component="${key}"]`, (el, v) => {
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(el, String(v));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
  await page.waitForTimeout(150);
}
async function toggle(sel, want) {
  const on = await page.$eval(sel, (el) => el.checked ?? el.getAttribute('aria-pressed') === 'true');
  if (on !== want) { await page.click(sel); await page.waitForTimeout(140); }
}
async function fresh() {
  await page.goto(`http://localhost:${PORT}/#/grade-console`, { waitUntil: 'networkidle' });
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
}

/* ── 手算的参照值,全部写在这里 ─────────────────────────────── */
const ASSIGN = 100;
const A = 89.5;
const needFor = (m) => (A - 0.10 * ASSIGN - 0.65 * m) / 0.25;
const shownFor = (m) => (0.10 * ASSIGN + 0.65 * m) / 0.75;

await fresh();

/* ── ① 当前真实处境 ──────────────────────────────────────── */
{
  if ((await count('[data-strip]')) !== 5) note(`expected 4 assessments + master, got ${await count('[data-strip]')}`);
  const earned = await page.$$eval('[data-earned]', (els) => els.map((e) => Number(e.value)));
  if (JSON.stringify(earned) !== JSON.stringify([83, 91, 85, 90])) {
    note(`the strips should hold only the four graded assessments — got [${earned}]`);
  }
  if ((await count('[data-strip][data-state="muted"]')) !== 0) {
    note('nothing should start muted — upcoming tests live in the scenario panel now');
  }

  // ⭐⭐⭐ PowerSchool **今天**显示的必须是没丢最低的 88.95 → 89 (B)
  const shownNow = await val('shown');
  if (Math.abs(shownNow - 88.95) > 1e-9) note(`today's PowerSchool figure should be 88.95, got ${shownNow}`);
  if ((await text('[data-read="shown"]')) !== '89') note('today should display 89');
  // 丢完之后是 90 (A),但必须单独标成"after the drop"
  const after = await page.$eval('[data-after-drop]', (el) => Number(el.dataset.value)).catch(() => null);
  if (after === null) note('the after-the-drop projection is missing');
  else if (Math.abs(after - 90.18) > 0.01) note(`after the drop it should read 90.18, got ${after}`);
  const afterText = (await text('[data-after-drop]')) ?? '';
  if (!/after the drop/.test(afterText)) note(`the projection must be labelled: "${afterText}"`);

  // 丢最低成立 → 丢 83 → (91+85+90)/3 = 88.6667
  const mean = await val('mean');
  if (Math.abs(mean - 266 / 3) > 1e-9) note(`assessments mean is ${mean}, hand-computed ${266 / 3}`);
  const dropped = await page.$$eval('[data-strip][data-state="dropped"]', (e) => e.map((x) => x.dataset.strip));
  if (dropped.join(',') !== '0') note(`should drop the 83 (strip 0), got [${dropped}]`);

  const need = await val('need');
  if (Math.abs(need - needFor(266 / 3)) > 1e-9) note(`final needed is ${need}, hand-computed ${needFor(266 / 3)}`);
  if (Math.abs(need - 87.4667) > 1e-3) note(`final needed should be 87.47, got ${need}`);
}

/* ── ②⭐⭐⭐ 还剩几场:丢最低只能保一场 ──────────────────── */
{
  const needFor2 = (m) => (89.5 - 10 - 0.65 * m) / 0.25;
  const scNeed = (n) => page.$eval(`[data-scenario-need="${n}"]`, (el) => Number(el.dataset.value));

  if ((await count('[data-scenario]')) !== 2) note(`expected two scenarios, got ${await count('[data-scenario]')}`);
  // 默认预估 90,项目还没打开 → 只剩一场 {83,91,85,90,90} 丢 83 → 356/4 = 89
  if ((await page.$eval('[data-field="projected"]', (el) => Number(el.value))) !== 90) {
    note('the projected score should default to 90');
  }
  const one = await scNeed(1);
  if (Math.abs(one - needFor2(356 / 4)) > 1e-9) note(`scenario 1 is ${one}, hand-computed ${needFor2(356 / 4)}`);

  // ⭐ 地板:只剩一场时,那场考多差都一样
  await setField('projected', 60);
  const floorA = await scNeed(1);
  await setField('projected', 20);
  const floorB = await scNeed(1);
  if (Math.abs(floorA - floorB) > 1e-9) note(`with one test left the final needed should stop moving (${floorA} vs ${floorB})`);
  // ⭐⭐ 而两场时地板没了
  await setField('projected', 60);
  const twoA = await scNeed(2);
  await setField('projected', 20);
  const twoB = await scNeed(2);
  if (!(twoB > twoA + 1)) note(`with two tests left a worse score must cost more (${twoA} -> ${twoB})`);
  await setField('projected', 90);
}

/* ── ③ 项目:准则是乘积,一条不合格就 −50 ─────────────────── */
{
  await toggle('[data-field="doing"]', true);
  if ((await count('[data-guideline]')) !== 5) note(`expected 5 guideline checkboxes, got ${await count('[data-guideline]')}`);

  // 种子是 SCORE 15(8 + 5 + 2)→ +25。⚠️ 15 是奇数,这正是"可以拿部分分"的后果。
  const comps = await page.$$eval('[data-component]', (els) => els.map((e) => Number(e.value)));
  if (JSON.stringify(comps) !== JSON.stringify([8, 5, 2])) note(`seeded components should be 8/5/2, got [${comps}]`);
  const pts = await page.$eval('[data-project-points]', (el) => Number(el.dataset.value));
  if (pts !== 25) note(`the seeded project should be worth +25, got ${pts}`);

  // ⚠️ 五条准则现在是**清单**,不是开关 —— 违规那条路不建模了,
  //   但页面必须把这个假设**写出来**,而不是让它看起来像"违规也没事"。
  if ((await count('[data-assumption]')) !== 1) note('the page does not state that all five guidelines are assumed to hold');
  const assume = (await text('[data-assumption]')) ?? '';
  // ⚠️ 页面用的是真正的减号 U+2212(−),不是 ASCII 连字符 —— 两个都认。
  if (!/[-\u2212]50/.test(assume)) note(`the assumption note should say what an unmet guideline would cost: "${assume}"`);
  if (await has('[data-guideline] input')) note('the guidelines should be a checklist, not toggles that change the maths');

  // ⭐ 小数也要能输:7.5 + 4.5 + 1.5 = 13.5 → +17.5,根本不是 10 的倍数
  await setComponent('math', 7.5);
  await setComponent('artistic', 4.5);
  await setComponent('explanation', 1.5);
  const frac = await page.$eval('[data-project-points]', (el) => Number(el.dataset.value));
  if (Math.abs(frac - 17.5) > 1e-9) note(`fractional components should give +17.5, got ${frac}`);
  // 满分
  await setComponent('math', 12);
  await setComponent('artistic', 6);
  await setComponent('explanation', 2);
  const best = await page.$eval('[data-project-points]', (el) => Number(el.dataset.value));
  if (best !== 50) note(`a perfect project should be +50, got ${best}`);
  // 夹取
  await setComponent('math', 99);
  if ((await page.$eval('[data-component="math"]', (el) => Number(el.value))) !== 12) note('Mathematics should clamp at 12');
  await setComponent('math', 8);
  await setComponent('artistic', 5);
  await setComponent('explanation', 2);
}

/* ── ④⭐⭐⭐ 饱和:+20 之后再高也一样 ────────────────────── */
{
  // ⚠️ 推子里现在只有已考的四场,所以先**加一条**当反导数那场 —— 这是规划表的基准情形
  await page.click('[data-action="add"]');
  await page.waitForTimeout(180);
  await setEarned(4, 90);

  const needAt = async (math, artistic, explanation) => {
    await setComponent('math', math);
    await setComponent('artistic', artistic);
    await setComponent('explanation', explanation);
    return val('need');
  };
  const twenty = await needAt(8, 4, 2);   // SCORE 14 → +20
  const thirty = await needAt(12, 4, 2);  // SCORE 18 → +40
  const fifty = await needAt(12, 6, 2);   // SCORE 20 → +50
  const ten = await needAt(8, 2, 2);      // SCORE 12 → +10

  if (Math.abs(twenty - thirty) > 1e-9) note(`+40 should be identical to +20 (${thirty} vs ${twenty})`);
  if (Math.abs(twenty - fifty) > 1e-9) note(`+50 should be identical to +20 (${fifty} vs ${twenty})`);
  if (!(ten > twenty + 0.5)) note(`+10 should be strictly worse than +20 (${ten} vs ${twenty}) — otherwise the saturation claim is vacuous`);

  // ⭐ 手算:+20 把 83 顶到 100,计分集 {100, 91, 90, 90} → 92.75 → 期末 76.85
  await needAt(8, 4, 2);
  const mean = await val('mean');
  const need = await val('need');
  if (Math.abs(mean - 371 / 4) > 1e-9) note(`with +20 and T=90 the mean should be ${371 / 4}, got ${mean}`);
  if (Math.abs(need - needFor(371 / 4)) > 1e-9) note(`final needed is ${need}, hand-computed ${needFor(371 / 4)}`);
  if (Math.abs(need - 76.85) > 0.01) note(`with +20 and T=90 the final should need 76.85, got ${need}`);
  // ⚠️ 交接文档这一格写的是 72.9 —— 钉死它不会被写回去
  if (Math.abs(need - 72.9) < 0.5) note('REGRESSION: the optimistic 72.9 figure is back');
}

/* ── ⑤⭐⭐⭐ 加在哪一场:三种情形三种答案 ───────────────── */
{
  const appliedName = async () => {
    const t = await text('[data-applied]');
    return t ?? '';
  };
  // T = 90,+20:83 和 85 封顶后一样 → 必须报出并列
  const tied = await appliedName();
  if (!/identical if applied to/.test(tied)) {
    note(`with +20 the tie between the 83 and the 85 is not reported: "${tied}"`);
  }

  // +10:加在 85 上严格更好
  await setComponent('artistic', 2);
  const atTen = await appliedName();
  // ⚠️ 这里**确实有并列**,而且是对的:+10 加在 85 上得 95,加在某个 90 上封顶到 100,
  //   两种都让计分集之和变成 366。要钉的是"不许落在 83 上",不是"没有并列"。
  if (/Precalc/.test(atTen)) note(`at +10 the points must not go on the 83 (Precalc) — got "${atTen}"`);
  const tenNeed = await val('need');
  // 手算:+10 的最优落点给出计分集 {91, 95, 90, 90} = 366 → 均分 91.5 → 期末 80.1
  if (Math.abs(tenNeed - needFor(91.5)) > 1e-9) note(`at +10 the final should need ${needFor(91.5)}, got ${tenNeed}`);
  await setComponent('artistic', 4);

  // 反导数考砸(70):它自己被丢掉,这时该加在 83 上,而且没有并列
  await setEarned(4, 70);
  const atLow = await appliedName();
  if (!/Precalc/.test(atLow)) note(`when the test is dropped the points should go on the 83 (Precalc) — got "${atLow}"`);
  if (/identical if applied to/.test(atLow)) note(`there should be no tie when the test is dropped: "${atLow}"`);
  const needLow = await val('need');
  if (Math.abs(needLow - 80.1) > 0.05) note(`with T=70 and +20 the final should need 80.1, got ${needLow}`);

  // ⭐ 曲线在 T ≤ 85 处变平,不是 70
  for (const T of [85, 80, 50, 0]) {
    await setEarned(4, T);
    const n = await val('need');
    if (Math.abs(n - 80.1) > 0.05) note(`T=${T} should still need 80.1 (the test is simply dropped), got ${n}`);
  }
  await setEarned(4, 86);
  const n86 = await val('need');
  if (!(n86 < 79.6)) note(`T=86 should already be below the flat 80.1, got ${n86}`);
  await setEarned(4, 90);
}

/* ── ⑥ 项目到底值多少 ───────────────────────────────────── */
{
  const worth = await page.$eval('[data-project-worth]', (el) => Number(el.dataset.value));
  // T=90:不做 86.6,做 +20 则 76.85 → 值 9.75
  if (Math.abs(worth - (86.6 - 76.85)) > 0.05) note(`the project should be worth about 9.75 points here, page says ${worth}`);

  // ⭐ 饱和提示:SCORE 14 之后再加码毫无意义,页面要直说
  // ⭐ 饱和线是算出来的 13,不是直觉的 13.4
  const satVal = await page.$eval('[data-saturation]', (el) => Number(el.dataset.value));
  if (Math.abs(satVal - 13) > 0.05) note(`the saturating SCORE should compute to 13, got ${satVal}`);
  const sat = (await text('[data-saturation]')) ?? '';
  if (!/worth nothing/i.test(sat)) note(`past the saturating score the page should say so: "${sat}"`);
  await setComponent('artistic', 0);
  await setComponent('math', 4);
  const below = (await text('[data-saturation]')) ?? '';
  if (!/to go/.test(below)) note(`below the saturating score the page should say how far: "${below}"`);
  await setComponent('math', 8);
  await setComponent('artistic', 4);
}

/* ── ⑦ 丢最低已确认;算法仍未确认 ───────────────────────── */
{
  await fresh();
  if (!(await has('[data-confirmed="drop"]'))) note('the drop rule should now be marked confirmed');
  if (await has('[data-unconfirmed="drop"]')) note('the drop rule is still marked unconfirmed');
  if (!(await has('[data-unconfirmed="method"]'))) note('the averaging method is not marked unconfirmed');
  // 目前两种算法必须给出完全一样的数(所有测验都是 100 分制)
  const a = await val('need');
  await page.click('[data-method="total-points"]');
  await page.waitForTimeout(160);
  const b = await val('need');
  if (Math.abs(a - b) > 1e-9) note(`while every assessment is out of 100 the two methods must agree (${a} vs ${b})`);
  // 但换一个分值之后就该分开 —— 否则那个开关是摆设
  await page.$eval('[data-possible="0"]', (el) => {
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(el, '50'); el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(200);
  const c = await val('need');
  await page.click('[data-method="mean-of-grades"]');
  await page.waitForTimeout(160);
  const d = await val('need');
  if (Math.abs(c - d) < 1e-9) note('with a 50-point assessment the two methods should differ');
  await fresh();
}

/* ── ⑧ 一排表要真的对齐 ─────────────────────────────────── */
{
  const tracks = await page.$$eval('[data-strip]', (els) => els.map((st) => {
    const r = st.querySelector('.fader-track').getBoundingClientRect();
    return { top: Math.round(r.top), h: Math.round(r.height) };
  }));
  if ([...new Set(tracks.map((t) => t.top))].length !== 1) {
    note(`the fader tracks do not line up — tops at ${[...new Set(tracks.map((t) => t.top))].join(', ')}px`);
  }
  if ([...new Set(tracks.map((t) => t.h))].length !== 1) note('the fader tracks are different heights');
}

/* ── ⑨ 存得住、键盘能用、没有 CJK ────────────────────────── */
{
  await setEarned(0, 77);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(450);
  if ((await page.$eval('[data-earned="0"]', (el) => Number(el.value))) !== 77) note('a typed score did not survive a reload');
  await fresh();

  const before = await page.$eval('[data-earned="0"]', (el) => Number(el.value));
  await page.focus('[data-strip="0"] input[type="range"]');
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(130);
  if ((await page.$eval('[data-earned="0"]', (el) => Number(el.value))) === before) {
    note('the arrow keys do not move a fader — keyboard users are shut out');
  }
  await fresh();

  const cjk = await page.evaluate(() => {
    // ⚠️ innerText,不是 textContent:KaTeX 把原始 TeX 藏在隐藏的 <annotation> 里。
    const m = document.body.innerText.match(/[　-〿぀-ヿ㐀-䶿一-鿿豈-﫿]/g);
    return m ? [...new Set(m)].join('') : '';
  });
  if (cjk) note(`Chinese or Japanese characters are visible to the user: ${cjk}`);
}

/* ── ⑩ 首页横幅进得来 ───────────────────────────────────── */
{
  await page.goto(`http://localhost:${PORT}/#/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const band = await page.$('[data-tool-band]');
  if (!band) note('the Grade Console band is gone from the home page');
  else {
    await band.click();
    await page.waitForTimeout(450);
    if (!page.url().includes('grade-console')) note('the band did not navigate');
    if (!(await has('[data-panel="strips"]'))) note('the tool did not render after clicking the band');
  }
}

/* ── 截图 ───────────────────────────────────────────────── */
await fresh();
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(250);
await page.screenshot({ path: join(OUT, 'grade-console-top.png'), clip: { x: 0, y: 0, width: 1280, height: 1000 } });
await toggle('[data-field="doing"]', true);
await page.waitForTimeout(250);
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: join(OUT, 'grade-console-project.png'), clip: { x: 0, y: 0, width: 1280, height: 1000 } });
await page.evaluate(() => window.scrollTo(0, 620));
await page.waitForTimeout(250);
await page.screenshot({ path: join(OUT, 'grade-console-lower.png') });

if (errors.length) note(`console errors: ${[...new Set(errors)].join(' | ')}`);

await browser.close();
server.close();

if (fail.length) {
  console.error('✗ grade-console:');
  for (const f of fail) console.error('  - ' + f);
  process.exit(1);
}
console.log('✓ grade-console:87.25 / 88.95 / 88.67 / 90.18 / 87.47 全部手算一致、分项可填小数(SCORE 15 → +25)、饱和线算出来是 13、'
  + '加分落点三种情形三种答案、T ≤ 85 时曲线变平(不是 70)、今天 89(B)与丢完后 90(A)分开显示、两种剩余情形、丢最低已确认、准则按清单呈现且假设写明、饱和线提示正确、无 CJK');
