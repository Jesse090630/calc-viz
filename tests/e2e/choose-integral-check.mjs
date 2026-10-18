/**
 * 「Choosing an Integration Technique」的浏览器专项检查。
 *
 * ⭐⭐⭐ 核心一问:**那张图真的在展示"求导回去对不对"吗?**
 *   正确答案那条线的读数必须和被积函数逐点一致;错答案那条必须明显不一致。
 *   十道题、每道题好几个 x,全都要查 —— 这是整页唯一的论点,只查一道等于没查。
 *
 * ⭐⭐ 第二问:**五对题是不是真的"一对"?**
 *   每一对里两道题必须显示**不同**的工具名。显示成同一个的话,
 *   这一页就退化成了十道互不相干的例题,而"挑哪个"才是内容。
 *
 * ⭐ 第三问:**错答案那条线在画面上看得见吗?**
 *   `plotWindow` 的单元测试保证了数值上看得见,但窗口到像素还有一层映射。
 *   这里直接量 SVG 路径的包围盒:错答案的线必须有一段落在画布里,
 *   而且和被积函数的线**不重合**。
 *
 * ⚠️ 手推的期望值(不依赖被测代码):
 *   · ∫x·e^{x²}dx 在 x = 1:被积函数 1·e = 2.71828;
 *     错答案 e^{x²} 求导得 2x·e^{x²} = 5.43656(正好 2 倍)。
 *   · ∫x/(x²+1)dx 在 x = 1:被积函数 0.5;错答案 arctan x 求导得 1/(1+1) = 0.5 ——
 *     **这一点上两者相等**,正是那句"交叉点上会碰巧对上"要覆盖的情形。
 *   · ∫√(9−x²)dx 在 x = 2:被积函数 √5 = 2.23607;
 *     错答案 (2/3)(9−x²)^{3/2} 求导得 −2x√(9−x²) = −8.94427。
 *   · ∫ln x dx 在 x = e:被积函数 1;错答案 (ln x)²/2 求导得 ln x / x = 1/e = 0.36788。
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SHOT_DIR ?? join(HERE, 'screenshots');
const DIST = join(HERE, '..', '..', 'dist');
const PORT = Number(process.env.SHOT_PORT ?? 4233);
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
const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
await page.goto(`http://localhost:${PORT}/#/choose-integral`, { waitUntil: 'networkidle' });

const fail = [];
const note = (m) => fail.push(m);

/** ⚠️ 从 `data-value` 读**原始数**,不读渲染出来的字符串。这个项目在这上面栽过。 */
const val = (k) => page.$eval(`[data-read="${k}"]`, (el) => Number(el.dataset.value));
const attr = (sel, name) => page.$eval(sel, (el, n) => el.getAttribute(n), name);
const count = (sel) => page.$$eval(sel, (els) => els.length);
const texts = (sel) => page.$$eval(sel, (els) => els.map((e) => e.textContent.trim()));

/** 把游标拖到指定的数学 x 上:用键盘,因为键盘通路也必须能用。 */
async function moveTo(targetX) {
  await page.focus('[role="slider"]');
  // 先到左端点,再按右键推过去 —— 每一步是区间的 1/100
  await page.keyboard.press('Home');
  await page.waitForTimeout(60);
  const lo = Number(await attr('[role="slider"]', 'aria-valuemin'));
  const hi = Number(await attr('[role="slider"]', 'aria-valuemax'));
  const steps = Math.round(((targetX - lo) / (hi - lo)) * 100);
  for (let i = 0; i < steps; i += 1) await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(120);
  return { lo, hi };
}

/* ── ① 页面真的渲染出来了 ─────────────────────────────────── */
if ((await count('[data-panel="check"]')) !== 1) note('the check panel is missing');
if ((await count('[data-pair]')) !== 5) note(`expected 5 pair buttons, got ${await count('[data-pair]')}`);
if ((await count('[data-curve]')) !== 3) note(`expected 3 curves, got ${await count('[data-curve]')}`);
if ((await count('[data-legend]')) !== 3) note('the legend is not showing all three curves');
if ((await count('[data-step]')) !== 6) note(`expected 6 ordered steps, got ${await count('[data-step]')}`);

/* ── ② 每一对里两道题用不同的工具 ─────────────────────────── */
const pairIds = await page.$$eval('[data-pair]', (els) => els.map((e) => e.dataset.pair));
if (pairIds.length !== 5) note('could not read the pair ids');

for (const pid of pairIds) {
  await page.click(`[data-pair="${pid}"]`);
  await page.waitForTimeout(120);
  const tools = await page.$$eval('[data-problem] [data-tool]', (els) => els.map((e) => e.dataset.tool));
  if (tools.length !== 2) note(`[${pid}] expected 2 problems side by side, got ${tools.length}`);
  if (tools[0] === tools[1]) note(`[${pid}] both halves of the pair show the same tool: ${tools[0]}`);
  // 判定问题必须是个问句,而且不是空话
  const test = (await texts('[data-test]'))[0] ?? '';
  if (!test.endsWith('?')) note(`[${pid}] the deciding question is not a question: ${test}`);
  if (test.length < 20) note(`[${pid}] the deciding question is too thin`);
}

/* ── ③ 核心:逐题逐点核对三个读数 ─────────────────────────── */
/**
 * ⚠️ 期望值是**在这里独立手写一遍闭式**的,不是从页面上抄的。
 *
 * ⚠️ 而且要在**页面实际停在的那个 x** 上求值,不是在我想去的 x 上。
 *   第一版写死了 `x = 1` 的数值,结果键盘步长是区间的 1/100(这道题是 0.024),
 *   游标只能停在 1.008 上,于是 `x·e^{x²}` 差了 2.4% —— 测试报了个失败,
 *   可那是**我的测量方式错了**,不是页面错了。放宽容差就会把这件事盖过去。
 */
const EXPECT = [
  // pair, problem, 想去的 x, 被积函数(闭式), 错答案求导(闭式)
  ['exp', 'x-exp-x2', 1.0, (x) => x * Math.exp(x * x), (x) => 2 * x * Math.exp(x * x)],
  ['exp', 'x-exp-x', 1.0, (x) => x * Math.exp(x), (x) => Math.exp(x) * (x + (x * x) / 2)],
  ['top', 'x-over-x2-plus-1', 1.0, (x) => x / (x * x + 1), (x) => 1 / (x * x + 1)],
  ['top', 'one-over-x2-plus-1', 1.0, (x) => 1 / (x * x + 1), (x) => x / (x * x + 1)],
  ['sign', 'one-over-x2-minus-1', 2.0, (x) => 1 / (x * x - 1), (x) => 1 / (x * x + 1)],
  ['sign', 'one-over-x2-plus-1-again', 2.0, (x) => 1 / (x * x + 1), (x) => 1 / (x * x - 1)],
  ['radical', 'two-x-over-root', 2.0, (x) => (2 * x) / Math.sqrt(9 - x * x), (x) => (-2 * x) / Math.sqrt(9 - x * x)],
  ['radical', 'root-alone', 2.0, (x) => Math.sqrt(9 - x * x), (x) => -2 * x * Math.sqrt(9 - x * x)],
  ['log', 'ln-over-x', Math.E, (x) => Math.log(x) / x, (x) => Math.log(x)],
  ['log', 'ln-alone', Math.E, (x) => Math.log(x), (x) => Math.log(x) / x],
];

let probed = 0;
for (const [pid, qid, targetX, fOf, wrongOf] of EXPECT) {
  await page.click(`[data-pair="${pid}"]`);
  await page.waitForTimeout(100);
  await page.click(`[data-problem="${qid}"]`);
  await page.waitForTimeout(120);
  if ((await attr(`[data-problem="${qid}"]`, 'data-active')) !== 'yes') {
    note(`[${qid}] clicking the problem card did not select it`);
    continue;
  }
  await moveTo(targetX);
  const x = await val('x');
  if (Math.abs(x - targetX) > 0.05) { note(`[${qid}] could not reach x=${targetX}, got ${x}`); continue; }

  const f = await val('integrand');
  const good = await val('answer');
  const bad = await val('wrong');
  // 在页面实际停住的 x 上求手写闭式 —— 于是容差可以收得很紧。
  const wantF = fOf(x);
  const wantWrong = wrongOf(x);

  if (Math.abs(f - wantF) > 1e-9) {
    note(`[${qid}] integrand at x=${x} is ${f}, hand-computed ${wantF}`);
  }
  // ⭐⭐⭐ 正确答案求导回去 = 被积函数。整页的论点就是这一行。
  if (Math.abs(good - f) > 1e-6) {
    note(`[${qid}] the correct answer does not differentiate back: ${good} vs ${f}`);
  }
  // 错答案求导回去 = 手算的那个错的值(差商有截断误差,给 1e-5)
  if (Math.abs(bad - wantWrong) > 1e-5) {
    note(`[${qid}] wrong answer slope at x=${x} is ${bad}, hand-computed ${wantWrong}`);
  }
  // 而且它得真的错 —— 不然这一格什么都没教
  if (Math.abs(bad - f) < 0.01 && Math.abs(x - 1) > 0.05) {
    note(`[${qid}] the wrong answer agrees with the integrand at x=${x}`);
  }
  probed += 1;
}
// 空转防护:上面的循环真的跑完了
if (probed !== EXPECT.length) note(`only probed ${probed} of ${EXPECT.length} problems`);

/* ── ④ "碰巧对上"那句提醒必须真的出现过 ──────────────────── */
/**
 * ⭐⭐ `∫x/(x²+1)dx` 和 arctan x 在 x = 1 相交(两边都是 0.5)。
 *   那一点上页面必须主动说"这只是一个点上的巧合",否则就是在教假验证。
 */
await page.click('[data-pair="top"]');
await page.waitForTimeout(100);
await page.click('[data-problem="x-over-x2-plus-1"]');
await page.waitForTimeout(120);
await moveTo(1.0);
if ((await count('[data-coincidence]')) !== 1) {
  note('at the crossing point (x=1) the page does not warn that a single point proves nothing');
}
// 而在远离交叉点的地方,这句话不该出现 —— 否则它就是一句永远挂着的废话
await moveTo(-1.5);
if ((await count('[data-coincidence]')) !== 0) {
  note('the coincidence warning is showing even far from the crossing');
}

/* ── ⑤ 错答案那条线在画面上真的看得见、而且不重合 ────────── */
/**
 * ⚠️ **更正第一版的测量方式。** 原来我比的是三条 path 的**包围盒**。
 *   那是个坏度量:`∫2x/√(9−x²)dx` 的错答案求导回去恰好是被积函数的**相反数**,
 *   一个奇函数和它的相反数**包围盒完全一样** —— 屏幕上明明是镜像的两条线,
 *   包围盒却报"分不开",于是测试失败在一个没有问题的页面上。
 *   现在改成沿路径逐点取坐标,按 x 配好之后比 y:这才是"画面上分不分得开"。
 */
for (const [pid, qid] of EXPECT) {
  await page.click(`[data-pair="${pid}"]`);
  await page.waitForTimeout(80);
  await page.click(`[data-problem="${qid}"]`);
  await page.waitForTimeout(120);
  const geo = await page.evaluate(() => {
    const svg = document.querySelector('[data-panel="check"] svg');
    const vb = svg.viewBox.baseVal;
    /** 沿路径按弧长取 240 个点,整理成 x → y 的样本。 */
    const sample = (k) => {
      const el = svg.querySelector(`[data-curve="${k}"]`);
      const len = el.getTotalLength();
      const out = [];
      for (let i = 0; i <= 240; i += 1) {
        const p = el.getPointAtLength((len * i) / 240);
        out.push([p.x, p.y]);
      }
      return { pts: out, len };
    };
    /** 在 xs 上线性插值取 y —— 两条曲线的采样点 x 不对齐,必须插值后再比。 */
    const yAt = (pts, x) => {
      for (let i = 1; i < pts.length; i += 1) {
        const [x0, y0] = pts[i - 1];
        const [x1, y1] = pts[i];
        if ((x - x0) * (x - x1) <= 0 && x0 !== x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
      }
      return null;
    };
    const f = sample('integrand');
    const good = sample('answer');
    const bad = sample('wrong');
    let worstGood = 0;
    let worstBad = 0;
    let comparedGood = 0;
    let comparedBad = 0;
    for (let i = 0; i <= 120; i += 1) {
      const x = f.pts[0][0] + ((f.pts[f.pts.length - 1][0] - f.pts[0][0]) * i) / 120;
      const yf = yAt(f.pts, x);
      if (yf === null) continue;
      const yg = yAt(good.pts, x);
      if (yg !== null) { worstGood = Math.max(worstGood, Math.abs(yg - yf)); comparedGood += 1; }
      const yb = yAt(bad.pts, x);
      if (yb !== null) { worstBad = Math.max(worstBad, Math.abs(yb - yf)); comparedBad += 1; }
    }
    return {
      worstGood, worstBad, comparedGood, comparedBad,
      lens: { f: f.len, good: good.len, bad: bad.len },
      h: vb.height,
    };
  });

  // 三条线都得真的画出来了
  for (const [k, l] of Object.entries(geo.lens)) {
    if (!(l > 50)) note(`[${qid}] the ${k} curve is barely drawn (length ${l})`);
  }
  // 空转防护:比较真的发生了
  if (geo.comparedGood < 100) note(`[${qid}] only ${geo.comparedGood} points compared for the correct curve`);
  if (geo.comparedBad < 20) note(`[${qid}] the wrong curve is barely on screen (${geo.comparedBad} points)`);
  // ⭐⭐⭐ 正确答案那条线必须逐点压在被积函数上(2 像素内)
  if (geo.worstGood > 2) {
    note(`[${qid}] the correct answer curve drifts ${geo.worstGood.toFixed(1)}px off the integrand`);
  }
  // ⭐⭐ 错答案那条线必须有一处明显岔开 —— 画布高度的 5%
  if (geo.worstBad < geo.h * 0.05) {
    note(`[${qid}] the wrong curve never visibly departs (worst ${geo.worstBad.toFixed(1)}px of ${geo.h})`);
  }
}

/* ── ⑤b 画的先后顺序 ────────────────────────────────────── */
/**
 * ⭐⭐⭐ 这条是截图逼出来的,数值测试一条都抓不到。
 *   SVG 后画的盖先画的。正确答案那条绿虚线必须画在**被积函数之后**,
 *   否则就被那条更粗的琥珀实线整条盖住 —— 屏幕上一点绿色都没有,
 *   而"绿虚线正好压在琥珀线上"恰恰是这一页唯一的论点。
 *   第一版就是这么错的:`reverse()` 把被积函数推到了最上面。
 */
const order = await page.$$eval('[data-panel="check"] [data-curve]', (els) => els.map((e) => e.dataset.curve));
if (order.join(',') !== 'wrong,integrand,answer') {
  note(`curves are painted in the order ${order.join(' → ')}; the correct answer must be painted last so it shows on top`);
}

/* ── ⑤c 开局那一屏就能看见分叉 ──────────────────────────── */
/**
 * ⭐⭐ 原来页面打开停在区间中点,而第一道题的中点正好是 x = 0,
 *   三条曲线在那里一起等于 0,四个读数全是 0.0000。
 *   这条钉死:**刚打开**的时候,错答案的读数必须和被积函数明显不同。
 */
await page.goto(`http://localhost:${PORT}/#/choose-integral`, { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
for (const pid of pairIds) {
  await page.click(`[data-pair="${pid}"]`);
  await page.waitForTimeout(150);
  const f0 = await val('integrand');
  const bad0 = await val('wrong');
  if (Math.abs(bad0 - f0) < 0.05) {
    note(`[${pid}] the page opens on a point where the wrong answer agrees (${f0} vs ${bad0})`);
  }
  if ((await count('[data-coincidence]')) !== 0) {
    note(`[${pid}] the page opens on a coincidence point, which is the least informative one`);
  }
}

/* ── ⑤d 手柄标签不许和曲线上的圆点叠在一起 ───────────────── */
/**
 * ⚠️ 这个项目在"两个标签叠在一起"上栽过(`#/rotating-disks` 的端点重合)。
 *   这一页的新风险是:手柄钉在 y = 0 的轴上,而某条曲线在游标处恰好经过 0 附近,
 *   于是那个圆点就压到手柄的 "x" 字上。这里直接量包围盒,不靠眼睛看。
 */
for (const [pid, qid] of EXPECT) {
  await page.click(`[data-pair="${pid}"]`);
  await page.waitForTimeout(80);
  await page.click(`[data-problem="${qid}"]`);
  await page.waitForTimeout(150);
  const hits = await page.evaluate(() => {
    const svg = document.querySelector('[data-panel="check"] svg');
    const label = svg.querySelector('[role="slider"] text');
    if (!label) return ['the handle has no label'];
    const lb = label.getBBox();
    const out = [];
    for (const dot of svg.querySelectorAll('[data-dot]')) {
      const d = dot.getBBox();
      const overlap =
        lb.x < d.x + d.width && d.x < lb.x + lb.width &&
        lb.y < d.y + d.height && d.y < lb.y + lb.height;
      if (overlap) out.push(dot.dataset.dot);
    }
    return out;
  });
  if (hits.length) note(`[${qid}] the handle label collides with the ${hits.join(', ')} dot`);
}

/* ── ⑥ 没课的工具不许给死链 ──────────────────────────────── */
let sawLink = 0;
let sawGap = 0;
for (const [pid, qid] of EXPECT) {
  await page.click(`[data-pair="${pid}"]`);
  await page.waitForTimeout(80);
  await page.click(`[data-problem="${qid}"]`);
  await page.waitForTimeout(100);
  const link = await count('[data-lesson-link]');
  const gap = await count('[data-no-lesson]');
  if (link + gap !== 1) note(`[${qid}] expected exactly one of a lesson link or a "no lesson yet" note`);
  if (link === 1) {
    const href = await attr('[data-lesson-link]', 'href');
    if (!['#/u-substitution', '#/by-parts'].includes(href)) note(`[${qid}] dead lesson link: ${href}`);
    sawLink += 1;
  } else sawGap += 1;
}
// 死界面自查:两种分支都出现过
if (sawLink === 0) note('no problem ever shows a lesson link');
if (sawGap === 0) note('no problem ever shows the "no lesson yet" note — that branch is dead UI');

/* ── ⑦ 用户看到的字里不许有中日韩字符 ────────────────────── */
const cjk = await page.evaluate(() => {
  // ⚠️ `innerText` 而不是 `textContent`:KaTeX 把原始 TeX 塞在隐藏的
  //   <annotation> 里,textContent 会把它一起读出来。这个坑踩过两次。
  const t = document.body.innerText;
  const m = t.match(/[　-〿぀-ヿ㐀-䶿一-鿿豈-﫿]/g);
  return m ? [...new Set(m)].join('') : '';
});
if (cjk) note(`Chinese or Japanese characters are visible to the user: ${cjk}`);

/* ── ⑧ 首页卡片能点进来 ──────────────────────────────────── */
await page.goto(`http://localhost:${PORT}/#/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(200);
const card = await page.$('a[href="#/choose-integral"]');
if (!card) note('there is no card linking to the lesson from the home page');
else {
  // ⚠️ 用真实指针事件,不用 .click() —— hover 那次黑屏就是 `.click()` 漏掉的。
  await card.hover();
  await page.waitForTimeout(200);
  if ((await page.$eval('#root', (el) => el.children.length)) === 0) {
    note('hovering the card empties the page');
  }
  await card.click();
  await page.waitForTimeout(400);
  if (!page.url().includes('choose-integral')) note('clicking the card did not navigate');
  if ((await count('[data-panel="check"]')) !== 1) note('the lesson did not render after clicking the card');
}

/* ── 截图,给人看 ────────────────────────────────────────── */
await page.goto(`http://localhost:${PORT}/#/choose-integral`, { waitUntil: 'networkidle' });
// ⚠️ 必须显式滚回顶部:换 hash 之后浏览器会保留上一次的滚动位置,
//   第一版的"顶部截图"其实是从页面中段开始的,标题根本没拍进去。
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);
await page.screenshot({ path: join(OUT, 'choose-integral-top.png'), clip: { x: 0, y: 0, width: 1280, height: 1000 } });
await page.click('[data-pair="radical"]');
await page.waitForTimeout(150);
await page.click('[data-problem="root-alone"]');
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(250);
await page.screenshot({ path: join(OUT, 'choose-integral-radical.png'), clip: { x: 0, y: 0, width: 1280, height: 1000 } });
await page.evaluate(() => window.scrollTo(0, 980));
await page.waitForTimeout(250);
await page.screenshot({ path: join(OUT, 'choose-integral-lower.png') });

if (errors.length) note(`console errors: ${[...new Set(errors)].join(' | ')}`);

await browser.close();
server.close();

if (fail.length) {
  console.error('✗ choose-integral:');
  for (const f of fail) console.error('  - ' + f);
  process.exit(1);
}
console.log(`✓ choose-integral:5 对题、${EXPECT.length} 道逐点核对、三条曲线、交叉点提醒、缺课标注、无 CJK、首页可进入`);
