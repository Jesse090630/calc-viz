/**
 * 「Grade Console」的浏览器专项检查。
 *
 * ⭐⭐⭐ 核心一问:**页面上那个"差多少"是总评的分,还是期末卷面的分?**
 *   原稿在这里算错了:它印的是 `need − 100`(卷面),却说成总评。
 *   期末占 25% 时夸大四倍 —— 只差 9 分的人会被告知差 36 分,足以让人直接放弃。
 *   这一条把修好的行为钉死在**浏览器里**,而不只是单元测试里。
 *
 * ⭐⭐ 第二问:拖动一条推子,所有读数是不是真的跟着联动、而且仍然自洽?
 *   均分、期末要求、结论三者必须始终满足那一条加权平均式。
 *
 * ⚠️ 期望值全部**在这个文件里独立手算**,不从页面上抄。
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
const page = await browser.newPage({ viewport: { width: 1280, height: 1250 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });

const fail = [];
const note = (m) => fail.push(m);
const count = (sel) => page.$$eval(sel, (els) => els.length);
/** ⚠️ 读 `data-value` 上的原始数,不读渲染出来的字符串。 */
const val = (k) => page.$eval(`[data-read="${k}"]`, (el) => {
  const v = el.dataset.value;
  return v === '' ? null : Number(v);
});
const text = (sel) => page.$eval(sel, (el) => el.textContent.replace(/\s+/g, ' ').trim()).catch(() => null);
const attr = (sel, name) => page.$eval(sel, (el, n) => el.getAttribute(n), name);

/** 在设置面板里写一个数。 */
async function setField(key, value) {
  await page.$eval(`[data-field="${key}"]`, (el, v) => {
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(el, String(v));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
  await page.waitForTimeout(110);
}
/** 把一条推子的**得分**设成某个值(走数字框,和键盘通路等价)。 */
async function setScore(i, value) {
  await page.$eval(`[data-earned="${i}"]`, (el, v) => {
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(el, String(v));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
  await page.waitForTimeout(110);
}

/**
 * 把一条推子设成某个**百分比**。
 *
 * ⚠️ 分值不再统一之后,"把每一条都设成 70" 和 "把每一条都设成 70%" 是两回事:
 *   project 是 50 分制,写 70 会被夹到 50,也就是 **100%** —— 均分反而被推高。
 *   凡是意图为"全部 X%"的检查,都必须走这个函数,而不是直接写分数。
 */
async function setPercent(i, pct) {
  const possible = await page.$eval(`[data-possible="${i}"]`, (el) => Number(el.value));
  await setScore(i, (pct / 100) * possible);
}
async function fresh() {
  // ⚠️ 每一组都从干净状态开始:localStorage 会把上一组的输入带过来。
  await page.goto(`http://localhost:${PORT}/#/grade-console`, { waitUntil: 'networkidle' });
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(350);
}

await fresh();

/* ── ① 默认数据:手算一遍 ────────────────────────────────── */
/**
 * 未静音的七条:83, 91, 85, 88, 92, 88, 88。丢掉最低的 83。
 * 剩六条和 = 532,均分 = 532/6 = 88.666…
 * 期末 = (89.5 − 0.10×100 − 0.65×(532/6)) / 0.25 = 87.4666…
 */
const SEED_MEAN = 88; // 440 / 500
const SEED_NEED = (89.5 - 10 - 0.65 * SEED_MEAN) / 0.25;

if ((await count('[data-strip]')) !== 8) note(`expected 7 channels + master, got ${await count('[data-strip]')}`);
{
  const mean = await val('mean');
  const need = await val('need');
  if (Math.abs(mean - SEED_MEAN) > 1e-9) note(`seed mean is ${mean}, hand-computed ${SEED_MEAN}`);
  if (Math.abs(need - SEED_NEED) > 1e-9) note(`seed need is ${need}, hand-computed ${SEED_NEED}`);
  const dropped = await count('[data-strip][data-state="dropped"]');
  if (dropped !== 1) note(`expected exactly one dropped channel, got ${dropped}`);
  const muted = await count('[data-strip][data-state="muted"]');
  if (muted !== 1) note(`expected exactly one muted channel, got ${muted}`);
}

/* ── ①c 分值与加分 ──────────────────────────────────────── */
/**
 * ⭐⭐⭐ 加分**只加分子**。连分母一起加的话它就只是一道普通的 50 分测验。
 *   这一段把那件事钉死在浏览器里,期望值全部在这里手算。
 */
{
  // 去掉 Project 之后:七条通道(第七条静音),全部百分制
  const possible = await page.$$eval('[data-possible]', (els) => els.map((e) => Number(e.value)));
  if (possible.length !== 7) note(`expected 7 assessment channels, got ${possible.length}`);
  if (!possible.every((p) => p === 100)) note(`every seeded assessment should be out of 100, got [${possible}]`);
  const names = await page.$$eval('[data-name]', (els) => els.map((e) => e.value));
  if (names.some((n) => /project/i.test(n))) note(`the Project channel should be gone, found [${names}]`);

  // 丢的是 83% 那条
  const dropped = await page.$$eval('[data-strip][data-state="dropped"]', (els) => els.map((e) => e.dataset.strip));
  if (dropped.join(',') !== '0') note(`expected Assess 1 (83%) to be dropped, got [${dropped}]`);

  // 手算:440 / 500 = 88.0% → 期末 (89.5 − 10 − 0.65×88)/0.25 = 89.2
  const needFor = (m) => (89.5 - 0.10 * 100 - 0.65 * m) / 0.25;
  {
    const mean = await val('mean');
    const need = await val('need');
    if (Math.abs(mean - 88) > 1e-9) note(`baseline mean is ${mean}, hand-computed 88`);
    if (Math.abs(need - needFor(88)) > 1e-9) note(`baseline final is ${need}, hand-computed ${needFor(88)}`);
    if (Math.abs(need - 89.2) > 1e-9) note(`baseline final should be 89.2, got ${need}`);
  }

  // ⭐⭐⭐ 填 46 分加分:(440 + 46) / 500 = 97.2%,分母**不变**
  await setField('ecEarned', 46);
  await page.waitForTimeout(160);
  {
    const mean = await val('mean');
    const need = await val('need');
    if (Math.abs(mean - 97.2) > 1e-9) note(`with 46 EC the mean should be 97.2, got ${mean}`);
    if (Math.abs(need - needFor(97.2)) > 1e-9) note(`with 46 EC the final should be ${needFor(97.2)}, got ${need}`);
    if (Math.abs(need - 65.28) > 1e-8) note(`with 46 EC the final should be 65.28, got ${need}`);

    // 那一行账必须自洽地写着 440 + 46 / 500
    const line = (await text('[data-points]')) ?? '';
    for (const want of ['440', '46', '500', '97.2']) {
      if (!line.includes(want)) note(`the points line is missing "${want}": "${line}"`);
    }
    // ⚠️ 分母绝不能变成 550
    if (line.includes('550')) note(`the EC points are being added to the denominator too: "${line}"`);
  }

  // 加分单调:填得越多,期末要求越低
  let last = Infinity;
  for (const ec of [0, 10, 25, 46, 50]) {
    await setField('ecEarned', ec);
    await page.waitForTimeout(140);
    const need = await val('need');
    if (!(need < last)) note(`EC ${ec} should lower the final needed (was ${last}, now ${need})`);
    last = need;
  }

  // 加分夹在 0..满分
  await setField('ecEarned', 999);
  await page.waitForTimeout(140);
  {
    const got = await page.$eval('[data-field="ecEarned"]', (el) => Number(el.value));
    if (got !== 50) note(`EC should clamp to its 50-point maximum, got ${got}`);
  }
  // 加分满分可改,得分跟着夹住
  await setField('ecPossible', 20);
  await page.waitForTimeout(160);
  {
    const got = await page.$eval('[data-field="ecEarned"]', (el) => Number(el.value));
    if (got !== 20) note(`lowering the EC maximum should clamp the earned value, got ${got}`);
  }
  await fresh();

  // 加分为 0 时,那一项不出现在账上(死界面自查的反面:它只在该出现时出现)
  {
    const line = (await text('[data-points]')) ?? '';
    if (/\+/.test(line)) note(`with no extra credit the points line should not show a "+": "${line}"`);
  }
}

/* ── ①d 一排表要真的对齐 ────────────────────────────────── */
/**
 * ⭐ 这是台"调音台",一排推子没对齐就是坏的。
 *   第一版用了 `items-end`:各列按整列底边对齐,而测验列轨道下面还有
 *   名字 / 状态 / Mute 三样,主表下面只有 "Final" —— 主表轨道整整沉了 50px。
 *   眼睛能看出来,但量一下才确定是 50 不是 5。
 */
{
  const tracks = await page.$$eval('[data-strip]', (els) => els.map((st) => {
    const r = st.querySelector('.fader-track').getBoundingClientRect();
    return { id: st.dataset.strip, top: Math.round(r.top), h: Math.round(r.height) };
  }));
  if (tracks.length < 2) note('could not find the fader tracks');
  const tops = [...new Set(tracks.map((t) => t.top))];
  const heights = [...new Set(tracks.map((t) => t.h))];
  if (tops.length !== 1) note(`the fader tracks do not line up — tops at ${tops.join(', ')}px`);
  if (heights.length !== 1) note(`the fader tracks are different heights — ${heights.join(', ')}px`);
}

/* ── ①b 三档目标 ────────────────────────────────────────── */
/**
 * ⭐⭐ 三个按钮 A / B / C,分数线 89.5 / 79.5 / 69.5。
 *   并且切到 C 之后,**结论必须真的变**(默认数据下 A 是 Doable、C 是 Comfortable)——
 *   加一个选项却看不出任何区别,等于没加。
 */
{
  const goals = await page.$$eval('[data-goal]', (els) => els.map((e) => e.dataset.goal));
  if (goals.join(',') !== 'A,B,C') note(`expected goal buttons A,B,C — got ${goals.join(',')}`);

  const CUTOFF = { A: 89.5, B: 79.5, C: 69.5 };
  for (const g of ['A', 'B', 'C']) {
    await page.click(`[data-goal="${g}"]`);
    await page.waitForTimeout(140);
    if ((await attr(`[data-goal="${g}"]`, 'data-active')) !== 'yes') note(`[${g}] clicking the goal did not select it`);
    // 手算同一条式子,用这一档的分数线
    const want = (CUTOFF[g] - 0.1 * 100 - 0.65 * SEED_MEAN) / 0.25;
    const got = await val('need');
    if (Math.abs(got - want) > 1e-9) note(`[goal ${g}] the page says ${got}, hand-computed ${want}`);
  }
  // 三档严格递减
  const needs = [];
  for (const g of ['A', 'B', 'C']) {
    await page.click(`[data-goal="${g}"]`);
    await page.waitForTimeout(130);
    needs.push(await val('need'));
  }
  if (!(needs[0] > needs[1] && needs[1] > needs[2])) note(`the three targets do not decrease: ${needs.join(' > ')}`);

  // ⭐ C 档确实走到了另一个结论
  await page.click('[data-goal="C"]');
  await page.waitForTimeout(150);
  const cVerdict = await page.$eval('[data-panel="verdict"]', (el) => el.dataset.verdict);
  await page.click('[data-goal="A"]');
  await page.waitForTimeout(150);
  const aVerdict = await page.$eval('[data-panel="verdict"]', (el) => el.dataset.verdict);
  if (cVerdict === aVerdict) note(`switching to C changes nothing visible (both read "${aVerdict}")`);

  // C 的分数线自己也能改
  await setField('targetC', 65);
  const afterEdit = await val('need');
  if (Math.abs(afterEdit - (89.5 - 10 - 0.65 * SEED_MEAN) / 0.25) > 1e-9) {
    note('editing the C cutoff changed the A result');
  }
  await page.click('[data-goal="C"]');
  await page.waitForTimeout(140);
  const cAfter = await val('need');
  if (Math.abs(cAfter - (65 - 10 - 0.65 * SEED_MEAN) / 0.25) > 1e-9) note(`the edited C cutoff is not being used (got ${cAfter})`);
  await fresh();
}

/* ── ②⭐⭐⭐ 够不到时,"差多少"必须是总评的分 ──────────────── */
/**
 * 把所有未静音的分数都设成 70,关掉丢最低:
 *   均分 70 ⇒ 期末要 (89.5 − 10 − 45.5)/0.25 = 136(卷面)
 *   期末满分时总评 = 10 + 45.5 + 25 = 80.5 ⇒ 差 89.5 − 80.5 = **9.0**
 * 原稿会印 36.0(= 136 − 100)。两个数必须分得清楚。
 */
await setField('dropLowest', false).catch(() => {});
await page.$eval('[data-field="dropLowest"]', (el) => { if (el.checked) el.click(); });
await page.waitForTimeout(120);
for (let i = 0; i < 7; i += 1) await setPercent(i, 70);
// 第 8 条是静音的,取消静音让它也算进去,保证均分干干净净是 70
await page.$eval('[data-mute="6"]', (el) => { if (el.getAttribute('aria-pressed') === 'true') el.click(); });
await page.waitForTimeout(150);

{
  const mean = await val('mean');
  const need = await val('need');
  if (Math.abs(mean - 70) > 1e-9) note(`expected a mean of exactly 70, got ${mean}`);
  if (Math.abs(need - 136) > 1e-9) note(`expected the final to need 136, got ${need}`);

  const verdict = await page.$eval('[data-panel="verdict"]', (el) => el.dataset.verdict);
  if (verdict !== 'unreachable') note(`expected the verdict "unreachable", got "${verdict}"`);

  const said = await text('[data-panel="verdict"]');
  // ⭐⭐⭐ 必须出现 9.0(总评差距),绝不能出现 36(卷面差距冒充总评差距)
  if (!said || !/\b9\.0\b/.test(said)) {
    note(`the out-of-reach sentence does not state the 9.0-point shortfall: "${said}"`);
  }
  if (said && /short of [^.]*\b36(\.0)?\b/.test(said)) {
    note(`REGRESSION: the shortfall is being reported in final-exam points (36) not course points (9): "${said}"`);
  }
  // 它也该把 80.5 这个"考满分能到哪"说出来 —— 那是 9.0 的来历
  if (!said || !/\b80\.5\b/.test(said)) {
    note(`the sentence never says what a perfect final would actually give: "${said}"`);
  }
}

/* ── ③ 联动自洽:三个读数随时满足那条式子 ────────────────── */
{
  let probed = 0;
  for (const score of [95, 88, 60, 40]) {
    for (let i = 0; i < 7; i += 1) await setPercent(i, score);
    await page.waitForTimeout(140);
    const mean = await val('mean');
    const need = await val('need');
    if (Math.abs(mean - score) > 1e-9) { note(`all channels at ${score} should mean exactly ${score}, got ${mean}`); continue; }
    if (need === null) { note(`no final needed shown at mean ${score}`); continue; }
    // 手算同一条式子
    const want = (89.5 - 0.1 * 100 - 0.65 * score) / 0.25;
    if (Math.abs(need - want) > 1e-9) note(`at mean ${score} the page says ${need}, hand-computed ${want}`);
    // 代回去必须落在目标上
    const back = 0.1 * 100 + 0.65 * mean + 0.25 * need;
    if (Math.abs(back - 89.5) > 1e-9) note(`substituting back at mean ${score} gives ${back}, not 89.5`);
    probed += 1;
  }
  if (probed !== 4) note(`only ${probed} of 4 linkage probes ran`);
}

/* ── ④ 七种结论都够得着,而且该出现的句子才出现 ──────────── */
const SEEN = new Set();
async function readVerdict() {
  const v = await page.$eval('[data-panel="verdict"]', (el) => el.dataset.verdict);
  SEEN.add(v);
  return v;
}
// unreachable / tight / doable / comfortable:靠均分扫一遍
for (const score of [40, 84, 88, 97]) {
  for (let i = 0; i < 7; i += 1) await setPercent(i, score);
  await page.waitForTimeout(140);
  await readVerdict();
}
// locked:目标调低
await setField('targetA', 50);
await page.waitForTimeout(140);
if ((await readVerdict()) !== 'locked') note('a very low target should read as locked in');
{
  const said = await text('[data-panel="verdict"]');
  if (!said || !/spare/i.test(said)) note(`the locked-in sentence does not say how much is to spare: "${said}"`);
}
await setField('targetA', 89.5);
// final-does-not-count:期末 0 权重
await setField('wFinal', 0);
await page.waitForTimeout(140);
if ((await readVerdict()) !== 'final-does-not-count') note('a zero-weight final should say the final cannot change anything');
if ((await val('need')) !== null) note('with a zero-weight final there is no "final needed" to show');
await setField('wFinal', 25);
// no-data:全部静音
for (let i = 0; i < 7; i += 1) {
  await page.$eval(`[data-mute="${i}"]`, (el) => { if (el.getAttribute('aria-pressed') !== 'true') el.click(); });
}
await page.waitForTimeout(200);
if ((await readVerdict()) !== 'no-data') note('muting everything should say nothing is counted');
if ((await val('mean')) !== null) note('with nothing counted the mean must be blank, not 0');

const WANT = ['comfortable', 'doable', 'final-does-not-count', 'locked', 'no-data', 'tight', 'unreachable'];
for (const v of WANT) if (!SEEN.has(v)) note(`the verdict "${v}" is never reachable from the interface — dead UI`);

/* ── ⑤ 权重警告只在真不平的时候出现 ─────────────────────── */
await fresh();
if ((await count('[data-weightwarn]')) !== 0) note('the weight warning shows even when the weights are balanced');
await setField('wAssess', 60);
if ((await count('[data-weightwarn]')) !== 1) note('weights summing to 95% should raise a warning');
{
  const said = await text('[data-weightwarn]');
  if (!said || !/95/.test(said)) note(`the weight warning does not say what they add up to: "${said}"`);
}
await setField('wAssess', 65);
if ((await count('[data-weightwarn]')) !== 0) note('the weight warning does not clear once the weights balance');

/* ── ⑥ 丢最低:标记只落在真被丢掉的那条上 ───────────────── */
await fresh();
{
  await setScore(0, 40);
  await page.waitForTimeout(150);
  const dropped = await page.$$eval('[data-strip][data-state="dropped"]', (els) => els.map((e) => e.dataset.strip));
  if (dropped.length !== 1 || dropped[0] !== '0') note(`the lowest channel should be the dropped one, got [${dropped}]`);
  const beforeMean = await val('mean');
  // 关掉丢最低 ⇒ 40 分被算进去 ⇒ 均分必须下降
  await page.$eval('[data-field="dropLowest"]', (el) => el.click());
  await page.waitForTimeout(160);
  const afterMean = await val('mean');
  if (!(afterMean < beforeMean)) note(`counting the dropped 40 should lower the mean (${beforeMean} → ${afterMean})`);
  if ((await count('[data-strip][data-state="dropped"]')) !== 0) note('nothing should be marked dropped once the rule is off');
}

/* ── ⑦ 存得住 ───────────────────────────────────────────── */
await fresh();
await setScore(0, 42);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(400);
{
  const back = await page.$eval('[data-earned="0"]', (el) => Number(el.value));
  if (back !== 42) note(`a typed score did not survive a reload (got ${back})`);
}

/* ── ⑧ 键盘能调推子 ─────────────────────────────────────── */
await fresh();
{
  const before = await page.$eval('[data-earned="0"]', (el) => Number(el.value));
  await page.focus('[data-strip="0"] input[type="range"]');
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(120);
  const after = await page.$eval('[data-earned="0"]', (el) => Number(el.value));
  if (after === before) note('the arrow keys do not move a fader — keyboard users are shut out');
}

/* ── ⑨ 用户看到的字里不许有中日韩字符 ───────────────────── */
{
  const cjk = await page.evaluate(() => {
    // ⚠️ innerText 而不是 textContent:KaTeX 把原始 TeX 藏在 <annotation> 里。
    const m = document.body.innerText.match(/[　-〿぀-ヿ㐀-䶿一-鿿豈-﫿]/g);
    return m ? [...new Set(m)].join('') : '';
  });
  if (cjk) note(`Chinese or Japanese characters are visible to the user: ${cjk}`);
}

/* ── ⑩ 首页进得来 ───────────────────────────────────────── */
await page.goto(`http://localhost:${PORT}/#/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
{
  const card = await page.$('a[href="#/grade-console"]');
  if (!card) note('there is no card linking to the grade console from the home page');
  else {
    await card.hover();
    await page.waitForTimeout(200);
    if ((await page.$eval('#root', (el) => el.children.length)) === 0) note('hovering the card empties the page');
    await card.click();
    await page.waitForTimeout(450);
    if (!page.url().includes('grade-console')) note('clicking the card did not navigate');
    if ((await count('[data-panel="strips"]')) !== 1) note('the tool did not render after clicking the card');
  }
}

/* ── 截图 ───────────────────────────────────────────────── */
await fresh();
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(250);
await page.screenshot({ path: join(OUT, 'grade-console-top.png'), clip: { x: 0, y: 0, width: 1280, height: 1000 } });
for (let i = 0; i < 7; i += 1) await setPercent(i, 70);
await page.$eval('[data-field="dropLowest"]', (el) => { if (el.checked) el.click(); });
await page.$eval('[data-mute="6"]', (el) => { if (el.getAttribute('aria-pressed') === 'true') el.click(); });
await page.waitForTimeout(250);
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: join(OUT, 'grade-console-unreachable.png'), clip: { x: 0, y: 0, width: 1280, height: 1000 } });
await page.evaluate(() => window.scrollTo(0, 700));
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
console.log('✓ grade-console:440/500 = 88.0% 与期末 89.2 手算一致、加分只进分子(+46 → 97.2%、期末 65.28、分母仍是 500)、丢的是 83% 那条、A/B/C 三档手算一致且结论真的不同、够不到时报的是总评差距(9.0 而非 36)、七种结论都可达、权重警告只在该出现时出现、存得住、键盘可调、无 CJK');
