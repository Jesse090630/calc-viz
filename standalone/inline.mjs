/**
 * 把 Vite 的产物压成**一个** HTML 文件。
 * ⚠️ 不留任何外部引用:从 file:// 打开时,同目录的 .js/.css 也算跨源,会被浏览器拦掉。
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
// ⚠️ root 改成项目根之后,产物的 html 落在 out/standalone/ 下,不在 out/ 根上。
const htmlPath = [join(OUT, 'index.html'), join(OUT, 'standalone', 'index.html')]
  .find((f) => { try { readFileSync(f); return true; } catch { return false; } });
if (!htmlPath) throw new Error('could not find the built index.html');
let html = readFileSync(htmlPath, 'utf8');
const assets = readdirSync(join(OUT, 'assets'));

const js = assets.find((f) => f.endsWith('.js'));
const css = assets.find((f) => f.endsWith('.css'));
if (!js || !css) throw new Error(`expected one .js and one .css, found: ${assets.join(', ')}`);

const jsCode = readFileSync(join(OUT, 'assets', js), 'utf8');
const cssCode = readFileSync(join(OUT, 'assets', css), 'utf8');

/**
 * ⚠️⚠️ 替换必须用**函数**,不能用字符串。
 *   `String.replace(re, str)` 会把 `$&`、`$1` 之类当成反向引用展开,
 *   而打包出来的 JS 里到处都是 `$` —— 结果是把原来的 <script src> 又塞了回去,
 *   产物看着正常,打开却是空白页。(这次是下面那条空转防护把它抓住的。)
 */
html = html
  .replace(/<script type="module"[^>]*src="[^"]*"[^>]*><\/script>/,
    () => `<script type="module">\n${jsCode}\n</script>`)
  .replace(/<link rel="stylesheet"[^>]*href="[^"]*"[^>]*>/,
    () => `<style>\n${cssCode}\n</style>`);

// ⚠️ 空转防护:确认真的没有外部引用了,否则双击打开就是空白页
for (const bad of [/src="[^"]*\.js"/, /href="[^"]*\.css"/]) {
  if (bad.test(html)) throw new Error(`an external reference survived: ${bad}`);
}
const dest = process.argv[2];
writeFileSync(dest, html);
console.log(`${dest}  ${(html.length / 1024 / 1024).toFixed(2)} MB  (one file, no external references)`);
