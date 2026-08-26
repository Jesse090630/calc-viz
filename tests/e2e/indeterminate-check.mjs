/**
 * 「0/0 Tells You Nothing Yet」的浏览器专项检查。
 *
 * ⭐⭐ 这一页的全部说服力压在一件事上,而这件事**必须从 DOM 里读出来**:
 *   四张卡的「direct substitution」文字**完全相同**,而四张卡的结论**两两不同**。
 * 断言写在**显示出来的字符串**上,不是在模块的返回值上 ——
 * 模块对不代表屏幕上对(这个项目已经被这条坑过好几次)。
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SHOT_DIR ?? join(HERE, 'screenshots');
const DIST = join(HERE, '..', '..', 'dist');
const PORT = 4211;
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
const URL = `http://localhost:${PORT}/#/indeterminate`;

mkdirSync(OUT, { recursive: true });
const errors = [];
const note = (m) => errors.push(m);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1400 }, deviceScaleFactor: 2 });
page.on('console', (m) => { if (m.type() === 'error') note(`console: ${m.text()}`); });
page.on('pageerror', (e) => note(`pageerror: ${e.message}`));
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-case]');

/* ══ ⭐⭐ 同一个代入,四个不同的结局 ══════════════════════════════ */
const cards = await page.evaluate(() =>
  [...document.querySelectorAll('[data-case]')].map((el) => ({
    id: el.getAttribute('data-case'),
    verdict: el.getAttribute('data-verdict'),
    substitutionAttr: el.getAttribute('data-substitution'),
    // ⚠️ 读的是**屏幕上那行字**,不是属性
    substitutionText: el.querySelector('[data-readout="substitution"]')?.textContent?.trim(),
    answer: el.querySelector('[data-readout="answer"]')?.textContent?.replace(/\s+/g, ' ').trim(),
    left: el.querySelector('[data-readout="left"]')?.textContent?.trim(),
    right: el.querySelector('[data-readout="right"]')?.textContent?.trim(),
    // 洞必须是**空心**的
    holes: [...el.querySelectorAll('svg circle')].map((c) => c.getAttribute('fill')),
  })),
);

if (cards.length !== 4) note(`expected 4 case panels, got ${cards.length}`);

const shownForms = new Set(cards.map((c) => c.substitutionText));
if (shownForms.size !== 1) note(`the four panels do not show the same substitution: ${[...shownForms].join(' | ')}`);
if (![...shownForms][0]?.includes('0/0')) note(`the shown substitution is "${[...shownForms][0]}", expected it to contain 0/0`);

const shownAnswers = new Set(cards.map((c) => c.answer));
if (shownAnswers.size !== 4) note(`the four answers are not all different: ${[...shownAnswers].join(' | ')}`);

// 独立重算:A → 1,B → 0,C 两侧无界,D 左 −1 右 +1
const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
if (byId['same']?.verdict !== 'value') note(`A verdict is ${byId['same']?.verdict}`);
if (byId['faster-top']?.verdict !== 'value') note(`B verdict is ${byId['faster-top']?.verdict}`);
if (byId['faster-bottom']?.verdict !== 'unbounded') note(`C verdict is ${byId['faster-bottom']?.verdict}`);
if (byId['sign-jump']?.verdict !== 'jump') note(`D verdict is ${byId['sign-jump']?.verdict}`);
if (Number(byId['same']?.left) !== 1 || Number(byId['same']?.right) !== 1) note(`A sides read ${byId['same']?.left} / ${byId['same']?.right}`);
if (Number(byId['faster-top']?.left) !== 0 || Number(byId['faster-top']?.right) !== 0) note(`B sides read ${byId['faster-top']?.left} / ${byId['faster-top']?.right}`);
// ⚠️ C 不许在屏幕上写出一个数,更不许写 "= ∞"
for (const side of ['left', 'right']) {
  const text = byId['faster-bottom']?.[side] ?? '';
  if (!/without bound/.test(text)) note(`C ${side} reads "${text}", expected "without bound"`);
  if (/[0-9]/.test(text)) note(`C ${side} put a number on screen: "${text}"`);
}
if (Number(byId['sign-jump']?.left) !== -1 || Number(byId['sign-jump']?.right) !== 1) note(`D sides read ${byId['sign-jump']?.left} / ${byId['sign-jump']?.right}`);
// 洞是空心的:填充色是背景色。
// ⚠️ 只有**有值可标**的那三条才该画洞;C 是无界的,画一个洞等于说那里有个高度。
for (const card of cards) {
  if (card.id === 'faster-bottom') {
    if (card.holes.length !== 0) note('C draws a hole marker, but there is no value to mark');
    continue;
  }
  if (card.holes.length === 0) note(`${card.id} draws no hole marker`);
  if (card.holes.some((f) => f !== '#0b1020')) note(`${card.id} draws a filled hole — that says the value exists`);
}

/* ══ ① 冻结 → INDETERMINATE ═════════════════════════════════════ */
{
  const before = await page.locator('[data-panel="substitution"]').getAttribute('data-frozen');
  if (before !== 'no') note(`the substitution panel started frozen (${before})`);
  if (await page.locator('[data-panel="substitution"] [data-readout="verdict"]').count() !== 0) {
    note('INDETERMINATE was on screen before freezing');
  }
  await page.locator('[data-action="freeze"]').click();
  await page.waitForTimeout(120);
  const text = await page.locator('[data-panel="substitution"]').innerText();
  if (!/INDETERMINATE/i.test(text)) note('freezing did not produce INDETERMINATE');
  if (!/Not enough information yet/i.test(text)) note('the "not enough information" line is missing');
  const nos = await page.locator('[data-panel="substitution"] [data-readout="no"]').count();
  if (nos !== 2) note(`expected two NO answers, got ${nos}`);
  if (!/undefined/i.test(text)) note('the page never says 0/0 is undefined as plain arithmetic');
  await page.screenshot({ path: join(OUT, 'ind-1-substitution.png'), clip: { x: 0, y: 0, width: 1440, height: 900 } });
}

/* ══ ③ 划掉箭头 ═════════════════════════════════════════════════ */
{
  const panel = page.locator('[data-panel="cross-out"]');
  if (await panel.getAttribute('data-crossed') !== 'no') note('the arrows started crossed out');
  if (await page.locator('[data-readout="conclusion"]').count() !== 0) note('the conclusion was visible before crossing out');
  const strikesBefore = await page.evaluate(() =>
    [...document.querySelectorAll('[data-strike]')].map((el) => el.getAttribute('data-strike')));
  if (strikesBefore.length !== 4) note(`expected 4 arrows, got ${strikesBefore.length}`);
  if (strikesBefore.some((s) => s !== 'off')) note('an arrow was already struck through');

  await page.locator('[data-action="cross-out"]').click();
  await page.waitForTimeout(650);
  const after = await page.evaluate(() => ({
    crossed: document.querySelector('[data-panel="cross-out"]')?.getAttribute('data-crossed'),
    strikes: [...document.querySelectorAll('[data-strike]')].map((el) => el.getAttribute('data-strike')),
    // ⚠️ 划线要**真的有宽度**。只翻属性不改样式的话,屏幕上什么都没发生。
    widths: [...document.querySelectorAll('[data-strike]')].map((el) => el.getBoundingClientRect().width),
    conclusion: document.querySelector('[data-readout="conclusion"]')?.innerText?.replace(/\s+/g, ' ').trim(),
    implied: [...document.querySelectorAll('[data-readout="implied"]')].map((el) => el.textContent.trim()),
  }));
  if (after.crossed !== 'yes') note(`data-crossed is ${after.crossed}`);
  if (after.strikes.some((s) => s !== 'on')) note('not every arrow got struck through');
  if (after.widths.some((w) => w < 4)) note(`a strike line has no width: ${after.widths.map((w) => w.toFixed(1)).join(', ')}`);
  if (!/WE NEED MORE INFORMATION/.test(after.conclusion ?? '')) note(`the conclusion reads "${after.conclusion}"`);
  if (new Set(after.implied).size !== 4) note(`the four implied answers are not distinct: ${after.implied.join(' | ')}`);
  await page.screenshot({ path: join(OUT, 'ind-2-crossed.png'), fullPage: true });
}

/* ══ ④ 竞速 ═════════════════════════════════════════════════════ */
{
  const setX = (log10) => page.evaluate((v) => {
    const el = document.querySelector('input[aria-label="race x"]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, String(v));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, log10);

  const read = () => page.evaluate(() =>
    [...document.querySelectorAll('[data-racer]')].map((el) => ({
      id: el.getAttribute('data-racer'),
      race: el.getAttribute('data-race'),
      ratio: el.querySelector('[data-readout="race-ratio"]')?.textContent?.trim(),
      bars: [...el.querySelectorAll('[data-bar]')].map((b) => ({
        which: b.getAttribute('data-bar'),
        fraction: Number(b.getAttribute('data-fraction')),
        // ⚠️ 按 data-* 找元素。第一版用 `div > div` 猜结构,选中的是标签行,
        //    三根条量出来都是 312px —— 断言全绿,什么也没验。
        width: b.querySelector('[data-bar-fill]')?.getBoundingClientRect().width ?? 0,
        track: b.querySelector('[data-bar-track]')?.getBoundingClientRect().width ?? 1,
      })),
    })));

  const seen = new Set();
  let previous = null;
  for (const log10 of [0, -0.5, -1, -1.6, -2.4]) {
    await setX(log10);
    await page.waitForTimeout(90);
    const racers = await read();
    if (racers.length !== 3) note(`expected 3 racers, got ${racers.length}`);
    for (const racer of racers) {
      seen.add(racer.race);
      const top = racer.bars.find((b) => b.which === 'top');
      const bottom = racer.bars.find((b) => b.which === 'bottom');
      if (!top || !bottom) { note(`${racer.id} is missing a bar`); continue; }
      // ⚠️ x = 1 时两根条**本来就一样长**(两个 fraction 都是 1)——
      //    胜负只在 x < 1 之后才看得出来。在起点上要求严格不等是错的断言。
      if (log10 === 0) {
        for (const bar of [top, bottom]) {
          if (bar.width < bar.track - 2) note(`${racer.id} ${bar.which} bar is not full at x = 1 (${bar.width.toFixed(1)}/${bar.track.toFixed(1)})`);
        }
        continue;
      }
      // ⭐ 声明的胜负必须与**条长**一致
      if (racer.race === 'top-faster' && !(top.width < bottom.width - 2)) {
        note(`${racer.id} says the numerator shrinks faster but its bar is not shorter (${top.width.toFixed(1)} vs ${bottom.width.toFixed(1)}) at 10^${log10}`);
      }
      if (racer.race === 'bottom-faster' && !(bottom.width < top.width - 2)) {
        note(`${racer.id} says the denominator shrinks faster but its bar is not shorter at 10^${log10}`);
      }
      if (racer.race === 'same-rate' && Math.abs(top.width - bottom.width) > 1.5) {
        note(`${racer.id} says both shrink alike but the bars differ by ${Math.abs(top.width - bottom.width).toFixed(1)}px`);
      }
      // 条长不许超出轨道
      if (top.width > top.track + 1) note(`${racer.id} top bar overflows its track`);
    }
    if (previous) {
      for (const racer of racers) {
        const before = previous.find((p) => p.id === racer.id);
        for (const which of ['top', 'bottom']) {
          const a = before.bars.find((b) => b.which === which).width;
          const b = racer.bars.find((bb) => bb.which === which).width;
          if (b > a + 0.6) note(`${racer.id} ${which} bar grew when x shrank (${a.toFixed(1)} → ${b.toFixed(1)})`);
        }
      }
    }
    previous = racers;
  }
  // ⚠️ 防空跑:三种胜负关系必须**都**在扫描里出现过
  for (const want of ['top-faster', 'bottom-faster', 'same-rate']) {
    if (!seen.has(want)) note(`the sweep never observed a "${want}" racer — the assertions above ran on nothing`);
  }
  await page.screenshot({ path: join(OUT, 'ind-3-race.png'), fullPage: true });
}

/* ══ ⑤ 别的不定式 ═══════════════════════════════════════════════ */
{
  if (await page.locator('[data-panel="other-forms"]').getAttribute('data-open') !== 'no') {
    note('the other-forms panel started open');
  }
  await page.locator('[data-action="open-other-forms"]').click();
  await page.waitForTimeout(120);
  const chips = await page.locator('[data-other-form]').count();
  if (chips !== 7) note(`expected 7 indeterminate forms, got ${chips}`);
  const panelText = await page.locator('[data-panel="other-forms"]').innerText();
  // ⭐ 结构上就不该出现「某个不定式 = 某个数」
  if (/=\s*-?\d/.test(panelText)) note(`the other-forms panel assigns a value: "${panelText.replace(/\s+/g, ' ').slice(0, 120)}"`);
  if (!/determines? an answer by itself/i.test(panelText)) note(`the panel never says these forms determine nothing: "${panelText.replace(/\s+/g, ' ').slice(0, 140)}"`);
}

/* ══ 没有假值,文字不出框、不重叠 ═══════════════════════════════ */
{
  const body = await page.evaluate(() => document.body.innerText);
  if (/NaN|Infinity/.test(body)) note('NaN or Infinity reached the screen');
  // ⚠️ 「= ∞」是这一节明确禁止的说法
  if (/=\s*[+-]?\s*∞/.test(body)) note('the page writes "= ∞" as if infinity were a value');

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
}

/* 窄屏也要能读 */
{
  await page.setViewportSize({ width: 430, height: 1600 });
  await page.waitForTimeout(300);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 2) note(`the page scrolls sideways on a 430px screen by ${overflow}px`);
  await page.screenshot({ path: join(OUT, 'ind-4-mobile.png'), fullPage: true });
}

await browser.close();
server.close();
if (errors.length) { console.error('✗\n' + errors.slice(0, 25).map((e) => '  ' + e).join('\n')); process.exit(1); }
console.log('✓ 0/0 lesson clean — one substitution, four different answers, arrows struck out');
