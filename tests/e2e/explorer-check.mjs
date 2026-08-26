/**
 * 「Special Limit Explorer」+ 参考卡的浏览器专项检查。
 *
 * ⭐⭐ 三件事:
 *   ① 九道题的答案与**手算**吻合,而且写成分数不是浮点;
 *   ② 认错模板要说清楚「为什么不是」,认对了才放行到下一步;
 *   ③ 参考卡**默认收起**,而且展开后每条都能看到:图、解读、由哪条推出、一道例题。
 *
 * ⚠️ 期望答案在这个文件里**手写**一遍,不 import 被测模块。
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SHOT_DIR ?? join(HERE, 'screenshots');
const DIST = join(HERE, '..', '..', 'dist');
const PORT = 4213;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
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
const URL = `http://localhost:${PORT}/#/special-limits`;

/**
 * ⚠️ 手算一遍。规则:题 = (k^d / c) × 模板极限,d 是模板分母上 u 的次数。
 *   sin 5x / x        : 5¹/1 × 1   = 5
 *   sin 3x / 7x       : 3¹/7 × 1   = 3/7
 *   (e^{4x}−1)/x      : 4¹/1 × 1   = 4
 *   tan 2x / 5x       : 2¹/5 × 1   = 2/5
 *   (1−cos 3x)/x²     : 3²/1 × ½   = 9/2
 *   (1−cos 5x)/2x     : 5¹/2 × 0   = 0
 *   ln(1+2x)/3x       : 2¹/3 × 1   = 2/3
 *   sin(x²)/x²        : 1¹/1 × 1   = 1
 *   (1−cos 4x)/3x²    : 4²/3 × ½   = 8/3
 */
const EXPECTED = {
  'sin-5x': { tex: '5', value: 5, template: 'sin-over-x' },
  'sin-3x-7x': { tex: '\\frac{3}{7}', value: 3 / 7, template: 'sin-over-x' },
  'exp-4x': { tex: '4', value: 4, template: 'exp-over-x' },
  'tan-2x': { tex: '\\frac{2}{5}', value: 2 / 5, template: 'tan-over-x' },
  'cos-3x': { tex: '\\frac{9}{2}', value: 4.5, template: 'cos-over-x2' },
  'cos-5x-2x': { tex: '0', value: 0, template: 'cos-over-x' },
  'log-2x': { tex: '\\frac{2}{3}', value: 2 / 3, template: 'log-over-x' },
  'sin-x2': { tex: '1', value: 1, template: 'sin-over-x' },
  'cos-4x-3x2': { tex: '\\frac{8}{3}', value: 8 / 3, template: 'cos-over-x2' },
};

mkdirSync(OUT, { recursive: true });
const errors = [];
const note = (m) => errors.push(m);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1300 }, deviceScaleFactor: 2 });
page.on('console', (m) => { if (m.type() === 'error') note(`console: ${m.text()}`); });
page.on('pageerror', (e) => note(`pageerror: ${e.message}`));
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-panel="problems"]');

/* ══ 题目齐不齐 ═══════════════════════════════════════════════════ */
const ids = await page.evaluate(() => [...document.querySelectorAll('[data-problem]')].map((el) => el.getAttribute('data-problem')));
if (ids.length !== 9) note(`expected 9 problems, got ${ids.length}`);
for (const want of Object.keys(EXPECTED)) {
  if (!ids.includes(want)) note(`problem ${want} is missing`);
}

let templatesExercised = new Set();
let wrongGuessesMade = 0;

for (const id of ids) {
  const want = EXPECTED[id];
  if (!want) { note(`unexpected problem ${id}`); continue; }

  await page.locator(`[data-problem="${id}"]`).click();
  await page.waitForTimeout(80);

  // 换题之后必须**回到未作答**,而且答案不能还挂在上面
  const state = await page.locator('[data-panel="match"]').getAttribute('data-state');
  if (state !== 'unanswered') note(`[${id}] switching problems left the match panel at "${state}"`);
  if (await page.locator('[data-panel="answer"]').count() !== 0) note(`[${id}] the answer was showing before any work`);
  if (Number(await page.locator('[data-panel="steps"]').getAttribute('data-revealed')) !== 0) {
    note(`[${id}] the transformation steps were already open`);
  }

  /* ② 先故意认错一次 —— 必须说清楚为什么不是 */
  {
    const chips = await page.evaluate(() => [...document.querySelectorAll('[data-template-chip]')].map((el) => el.getAttribute('data-template-chip')));
    if (chips.length !== 6) note(`[${id}] expected 6 template chips, got ${chips.length}`);
    const wrong = chips.find((c) => c !== want.template);
    await page.locator(`[data-template-chip="${wrong}"]`).click();
    await page.waitForTimeout(80);
    const after = await page.evaluate(() => ({
      state: document.querySelector('[data-panel="match"]')?.getAttribute('data-state'),
      chip: document.querySelector(`[data-template-chip="${document.querySelector('[data-panel="match"]').getAttribute('data-picked')}"]`)?.getAttribute('data-state'),
      why: document.querySelector('[data-readout="why-not"]')?.innerText?.trim(),
      answerShown: document.querySelectorAll('[data-panel="answer"]').length,
      revealed: Number(document.querySelector('[data-panel="steps"]')?.getAttribute('data-revealed')),
    }));
    if (after.state !== 'wrong') note(`[${id}] a wrong template was accepted (state ${after.state})`);
    if (after.chip !== 'wrong') note(`[${id}] the wrong chip is not marked`);
    if (!after.why || after.why.length < 10) note(`[${id}] no explanation of why the wrong template does not fit`);
    // ⚠️ 认错之后**不许**把答案漏出来
    if (after.answerShown !== 0) note(`[${id}] the answer appeared after a wrong guess`);
    if (after.revealed !== 0) note(`[${id}] the steps opened after a wrong guess`);
    wrongGuessesMade += 1;
  }

  /* 认对 */
  await page.locator(`[data-template-chip="${want.template}"]`).click();
  await page.waitForTimeout(80);
  {
    const state = await page.locator('[data-panel="match"]').getAttribute('data-state');
    if (state !== 'right') note(`[${id}] the correct template ${want.template} was rejected`);
    if (await page.locator('[data-panel="need"]').count() === 0) note(`[${id}] the repair panel did not appear`);
    templatesExercised.add(want.template);
  }

  /* ③ 一路露完变形步骤 */
  const total = Number(await page.locator('[data-panel="steps"]').getAttribute('data-total'));
  for (let i = 0; i < total + 1; i += 1) {
    const button = page.locator('[data-action="next-step"]').first();
    if (await button.count() === 0) break;
    await button.click();
    await page.waitForTimeout(35);
  }
  const revealed = Number(await page.locator('[data-panel="steps"]').getAttribute('data-revealed'));
  if (revealed !== total) note(`[${id}] the steps stopped at ${revealed} of ${total}`);

  /* ① 答案:分数写法 + 数值 + 阶梯验证 */
  {
    if (await page.locator('[data-panel="answer"]').count() === 0) {
      note(`[${id}] no answer panel after finishing the steps`);
      continue;
    }
    const answer = await page.evaluate(() => ({
      tex: document.querySelector('[data-panel="answer"]')?.getAttribute('data-tex'),
      value: Number(document.querySelector('[data-panel="answer"]')?.getAttribute('data-value')),
      ladder: document.querySelector('[data-readout="ladder-check"]')?.textContent?.trim(),
      text: document.querySelector('[data-panel="answer"]')?.innerText ?? '',
    }));
    if (answer.tex !== want.tex) note(`[${id}] answer reads ${answer.tex}, expected ${want.tex}`);
    if (Math.abs(answer.value - want.value) > 1e-12) note(`[${id}] answer value ${answer.value}, expected ${want.value}`);
    // ⚠️ 屏幕上不许出现浮点长尾(`2.6666666666666665` 那种)。
    //    阈值是 **9 位以上**小数,不是 6 位 —— 底下那行数值验证本来就写 6 位
    //    ("reads 5.000000"),按 6 位判会把一个正确的读数当成长尾报错。
    //    第一版就是这么写的,九道题全报了假失败。
    if (/\d\.\d{9,}/.test(answer.text)) note(`[${id}] a float tail leaked into the answer: "${answer.text.replace(/\s+/g, ' ').slice(0, 90)}"`);
    // 分数写法必须**真的**出现在盒子里,不是只在属性里
    if (want.tex.includes('frac') && !/\d\s*\d/.test(answer.text.replace(/\s+/g, ' '))) {
      note(`[${id}] the boxed answer does not render as a fraction`);
    }
    // 数值验证那一行确实收敛到同一个数
    const reading = Number((answer.ladder ?? '').match(/-?\d+\.?\d*/g)?.pop());
    if (!Number.isFinite(reading)) note(`[${id}] the numeric check reads "${answer.ladder}"`);
    else if (Math.abs(reading - want.value) / Math.max(1, Math.abs(want.value)) > 1e-4) {
      note(`[${id}] the numeric check reads ${reading} but the answer is ${want.value}`);
    }
  }

  /* 数值表一路走向答案 */
  {
    const rows = await page.evaluate(() =>
      [...document.querySelectorAll('[data-number-row]')].map((el) => ({ x: Number(el.getAttribute('data-number-row')), v: Number(el.textContent.trim()) })));
    if (rows.length < 5) note(`[${id}] the numeric table only has ${rows.length} rows`);
    let previous = Infinity;
    for (const row of rows) {
      if (!Number.isFinite(row.v)) { note(`[${id}] the numeric table reads "${row.v}" at x = ${row.x}`); continue; }
      const gap = Math.abs(row.v - want.value);
      if (gap > previous + 1e-9) note(`[${id}] the numeric table moved away from ${want.value} at x = ${row.x}`);
      previous = gap;
    }
  }
}

// ⚠️ 防空跑:六条模板每一条都得被真的做过一遍
if (templatesExercised.size !== 6) note(`only ${templatesExercised.size} of 6 templates were exercised: ${[...templatesExercised].join(', ')}`);
if (wrongGuessesMade !== ids.length) note(`the wrong-guess path ran ${wrongGuessesMade} times, expected ${ids.length}`);

await page.screenshot({ path: join(OUT, 'sl-explorer.png'), fullPage: true });

/* ══ 参考卡 ═══════════════════════════════════════════════════════ */
{
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-panel="reference"]');
  // ⭐ 默认收起 —— 提示词点名:它不是主教学体验
  if (await page.locator('[data-panel="reference"]').getAttribute('data-shown') !== 'no') {
    note('the reference card is open by default');
  }
  if (await page.locator('[data-reference-entry]').count() !== 0) note('reference entries are visible before opening the card');

  await page.locator('[data-action="show-reference"]').click();
  await page.waitForTimeout(120);

  const families = await page.evaluate(() => [...document.querySelectorAll('[data-family]')].map((el) => el.getAttribute('data-family')));
  if (families.length !== 3) note(`expected 3 families, got ${families.join(', ')}`);
  for (const want of ['trigonometric', 'exponential', 'logarithmic']) {
    if (!families.includes(want)) note(`family ${want} is missing`);
  }

  const entries = await page.evaluate(() => [...document.querySelectorAll('[data-reference-entry]')].map((el) => el.getAttribute('data-reference-entry')));
  if (entries.length !== 6) note(`expected 6 reference entries, got ${entries.length}`);

  // ⭐ 每条点开都必须有:图、解读、由哪条推出、一道例题
  for (const entry of entries) {
    await page.locator(`[data-action="reference-${entry}"]`).click();
    await page.waitForTimeout(90);
    const open = await page.evaluate((entry) => {
      const el = document.querySelector(`[data-reference-entry="${entry}"]`);
      return {
        open: el?.getAttribute('data-open'),
        curves: el?.querySelectorAll('svg path').length ?? 0,
        reading: el?.querySelector('[data-readout="reading"]')?.textContent?.trim() ?? '',
        provenance: el?.querySelector('[data-readout="provenance"]')?.textContent?.trim() ?? '',
        example: el?.querySelector('[data-readout="example-answer"]')?.textContent?.trim() ?? '',
      };
    }, entry);
    if (open.open !== 'yes') note(`[reference/${entry}] did not open`);
    if (open.curves < 2) note(`[reference/${entry}] draws ${open.curves} curves, expected at least 2`);
    if (open.reading.length < 15) note(`[reference/${entry}] has no visual interpretation`);
    if (!/Proved from|Rests on/i.test(open.provenance)) note(`[reference/${entry}] never says what proves it: "${open.provenance}"`);
    if (open.example.length === 0) note(`[reference/${entry}] shows no transformed example`);
    // 一次只开一条
    const openCount = await page.evaluate(() => [...document.querySelectorAll('[data-reference-entry]')].filter((el) => el.getAttribute('data-open') === 'yes').length);
    if (openCount !== 1) note(`[reference/${entry}] ${openCount} entries are open at once`);
  }
  await page.screenshot({ path: join(OUT, 'sl-reference.png'), fullPage: true });
}

/* ══ 没有假值,文字不出框、不重叠,窄屏不横向滚动 ═════════════════ */
{
  const body = await page.evaluate(() => document.body.innerText);
  if (/NaN|Infinity/.test(body)) note('NaN or Infinity reached the screen');
  const half = body.match(/×10-?\d/);
  if (half) note(`a half-rendered exponent is on screen: "${half[0]}"`);

  const bad = await page.evaluate(() => {
    const out = [];
    for (const svg of document.querySelectorAll('main svg')) {
      const vb = svg.viewBox.baseVal;
      const boxes = [...svg.querySelectorAll('text')].map((t) => ({ t: t.textContent.trim(), b: t.getBBox() }));
      for (const { t, b } of boxes) {
        if (b.x < vb.x - 0.5 || b.x + b.width > vb.x + vb.width + 0.5 || b.y < vb.y - 0.5 || b.y + b.height > vb.y + vb.height + 0.5) out.push(`outside: "${t}"`);
      }
      for (let a = 0; a < boxes.length; a += 1) for (let c = a + 1; c < boxes.length; c += 1) {
        const A = boxes[a].b, B = boxes[c].b;
        const w = Math.min(A.x + A.width, B.x + B.width) - Math.max(A.x, B.x);
        const h = Math.min(A.y + A.height, B.y + B.height) - Math.max(A.y, B.y);
        if (w > 0 && h > 0 && w * h > Math.min(A.width * A.height, B.width * B.height) * 0.2) out.push(`collide: "${boxes[a].t}" × "${boxes[c].t}"`);
      }
    }
    return out;
  });
  for (const b of [...new Set(bad)]) note(b);

  await page.setViewportSize({ width: 430, height: 1500 });
  await page.waitForTimeout(300);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 2) note(`the page scrolls sideways on a 430px screen by ${overflow}px`);
}

await browser.close();
server.close();
console.log(`worked ${ids.length} problems · ${templatesExercised.size} templates · ${wrongGuessesMade} wrong guesses rejected`);
if (errors.length) { console.error('✗\n' + errors.slice(0, 25).map((e) => '  ' + e).join('\n')); process.exit(1); }
console.log('✓ explorer + reference card clean');
