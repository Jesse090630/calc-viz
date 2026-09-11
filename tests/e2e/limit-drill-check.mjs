/**
 * 「Special Limits Drill」的浏览器专项检查。
 *
 * ⭐⭐ 这一页是**练习**,不是讲解,所以要验的是**交互契约**:
 *   · 提交之前不许露答案(包括解答步骤);
 *   · 提示分两层,第一层不点名特殊极限;
 *   · 答对说对、答错说错**并给出正确答案**;
 *   · 每十题出小结。
 *
 * ⚠️ 而最要紧的一条:**页面上永远不许出现洛必达**。
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.SHOT_DIR ?? join(HERE, 'screenshots');
const DIST = join(HERE, '..', '..', 'dist');
const PORT = Number(process.env.SHOT_PORT ?? 4207);
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
const URL = `http://localhost:${PORT}/#/limit-drill`;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(URL, { waitUntil: 'networkidle' });

const fail = [];
const has = async (sel) => Boolean(await page.$(sel));
const txt = async (sel) => page.$eval(sel, (el) => el.textContent.trim()).catch(() => '');

/* ① 一上来就该有题、有规则、有八条参考 */
if (!(await has('[data-panel="question"]'))) fail.push('打开就没有题目');
if (!(await txt('[data-readout="rule"]')).toLowerCase().includes('substitute first')) {
  fail.push('那条总规则没常驻在页面上');
}
if ((await page.$$('[data-special]')).length !== 8) fail.push('八条特殊极限的参考表不全');

/* ② ⭐⭐ 提交之前,答案和解答一个字都不许露 */
for (const sel of ['[data-readout="verdict"]', '[data-readout="steps"]', '[data-readout="substitution"]', '[data-readout="hint-1"]', '[data-readout="hint-2"]']) {
  if (await has(sel)) fail.push(`还没提交就露出了 ${sel}`);
}

/* ③ ⭐ 提示分两层,而且第一层不点名特殊极限 */
await page.click('[data-action="hint"]');
await page.waitForTimeout(60);
const h1 = await txt('[data-readout="hint-1"]');
if (!h1) fail.push('点了提示却没出现第一条');
if (!h1.toLowerCase().includes('approaches 0')) fail.push(`第一条提示没说"什么趋于 0":${h1}`);
if (await has('[data-readout="hint-2"]')) fail.push('第一次点提示就把第二条也放出来了');
await page.click('[data-action="hint"]');
await page.waitForTimeout(60);
if (!(await has('[data-readout="hint-2"]'))) fail.push('点第二次没出现第二条提示');
if (await has('[data-action="hint"]')) fail.push('两条都放完了,提示钮还在');

/* ④ ⭐ 乱打一个答案:必须判错,并把正确答案说出来 */
await page.fill('[data-input="answer"]', '-99');
await page.click('[data-action="submit"]');
await page.waitForTimeout(100);
{
  const ok = await page.$eval('[data-readout="verdict"]', (el) => el.dataset.ok);
  if (ok !== 'no') fail.push('答错了却判成对');
  const v = await txt('[data-readout="verdict"]');
  if (!v.includes('the answer is')) fail.push(`判错时没给出正确答案:${v}`);
  if (!(await has('[data-readout="steps"]'))) fail.push('提交后没有分步解答');
  const steps = (await page.$$('[data-readout="steps"] li')).length;
  if (steps < 2) fail.push(`解答只有 ${steps} 步`);
}
await page.screenshot({ path: join(OUT, 'limit-drill-wrong.png') });

/* ⑤ ⭐ 认得出分数、DNE、以及看不懂的输入 */
await page.click('[data-action="next"]');
await page.waitForTimeout(80);
await page.fill('[data-input="answer"]', 'banana');
await page.waitForTimeout(60);
if (!(await has('[data-readout="unparsed"]'))) fail.push('看不懂的输入没有提示');
if (!(await page.$eval('[data-action="submit"]', (el) => el.disabled))) {
  fail.push('输入看不懂时提交钮还能按');
}
await page.fill('[data-input="answer"]', '1/2');
await page.waitForTimeout(60);
if (await page.$eval('[data-action="submit"]', (el) => el.disabled)) fail.push('分数写法不被接受');

/* ⑥ ⭐⭐ 等级 3:题目**不**在 x → 0,而且提交后要给出代换 */
await page.click('[data-level="3"]');
await page.waitForTimeout(150);
{
  const prompt = await txt('[data-readout="prompt"]');
  if (/\\to\s*0|→\s*0/.test(prompt) || prompt.includes('to 0')) {
    fail.push(`等级 3 出了一道 x → 0 的题:${prompt}`);
  }
  await page.fill('[data-input="answer"]', '0');
  await page.click('[data-action="submit"]');
  await page.waitForTimeout(100);
  const sub = await txt('[data-readout="substitution"]');
  if (!sub || !sub.includes('u =')) fail.push(`等级 3 提交后没给出代换:${sub}`);
  if (!sub.includes('→ 0')) fail.push(`代换里没说清 u → 0:${sub}`);
}
await page.screenshot({ path: join(OUT, 'limit-drill-level3.png') });

/* ⑦ ⭐⭐ 连答十题,必须出小结 */
await page.click('[data-level="1"]');
await page.waitForTimeout(150);
for (let i = 0; i < 10; i += 1) {
  const sort = await page.$eval('[data-panel="question"]', (el) => el.dataset.sort);
  if (sort === 'concept') {
    await page.click('[data-choice="0"]');
  } else {
    await page.fill('[data-input="answer"]', '1');
  }
  await page.click('[data-action="submit"]');
  await page.waitForTimeout(70);
  if (i < 9) { await page.click('[data-action="next"]'); await page.waitForTimeout(70); }
}
await page.waitForTimeout(150);
if (!(await has('[data-panel="report"]'))) fail.push('答满十题没有出小结');
{
  const score = Number(await txt('[data-readout="score"]'));
  if (!(score >= 0 && score <= 10)) fail.push(`小结分数不合理:${score}`);
  const answered = Number(await txt('[data-readout="answered"]'));
  if (answered !== 10) fail.push(`计数不对:answered = ${answered}`);
  const advice = await txt('[data-readout="advice"]');
  if (!advice || advice.length < 20) fail.push('小结没给建议');
  if (!(await txt('[data-readout="weakest"]'))) fail.push('小结没说错在哪几类');
}
await page.screenshot({ path: join(OUT, 'limit-drill-report.png') });

/* ⑧ ⭐⭐ 解题过程里不许出现洛必达。
   ⚠️ 第一版查的是整个 body —— 结果被自己的那句「No L'Hôpital」免责声明绊倒了。
      **声明不用它**和**用了它**是两回事,断言要查的是后者。
      所以只扫题目面板(提示、判定、分步解答),并另外确认那句声明还在。 */
{
  const panel = (await page.$eval('[data-panel="question"]', (el) => el.innerText)).toLowerCase();
  for (const bad of ['hopital', 'hôpital', "l'hop"]) {
    if (panel.includes(bad)) fail.push(`解题过程里出现了洛必达:${bad}`);
  }
  const foot = (await page.$eval('[data-panel="reference"]', (el) => el.innerText)).toLowerCase();
  if (!foot.includes('hôpital') && !foot.includes('hopital')) {
    fail.push('那句"不用洛必达"的声明不见了 —— 这是 Jesse 明确要求的');
  }
}

/* ⑨ 概念题走得到 */
{
  let sawConcept = false;
  await page.click('[data-level="2"]');
  await page.waitForTimeout(120);
  for (let i = 0; i < 14; i += 1) {
    if ((await page.$eval('[data-panel="question"]', (el) => el.dataset.sort)) === 'concept') {
      sawConcept = true;
      await page.click('[data-choice="1"]');
      await page.click('[data-action="submit"]');
      await page.waitForTimeout(80);
      if (!(await txt('[data-readout="why"]'))) fail.push('概念题答完没给解释');
      break;
    }
    await page.fill('[data-input="answer"]', '1');
    await page.click('[data-action="submit"]');
    await page.waitForTimeout(60);
    await page.click('[data-action="next"]');
    await page.waitForTimeout(60);
  }
  if (!sawConcept) fail.push('十四题里一道概念题都没出现 —— 那它就是死界面');
}

/* ⑩ 溢出与手机 */
const over = async () => page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
const wide = await over();
await page.setViewportSize({ width: 390, height: 900 });
await page.waitForTimeout(200);
const narrow = await over();
await page.screenshot({ path: join(OUT, 'limit-drill-390.png'), fullPage: true });
if (wide > 0 || narrow > 0) fail.push(`横向溢出 桌面 ${wide} / 390 ${narrow}`);
if (errors.length) fail.push(`控制台报错:${errors.join(' | ')}`);

await browser.close(); server.close();
console.log(fail.length ? '✗\n  ' + fail.join('\n  ') : '✓ limit-drill:提交前不露答案、提示分两层、十题出小结、无洛必达、无溢出');
process.exit(fail.length ? 1 : 0);
