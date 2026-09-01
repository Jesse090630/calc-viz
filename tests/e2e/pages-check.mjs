/**
 * 在**真实的子路径** `/calc-viz/` 下跑一遍 —— GitHub Pages 就是这么挂的。
 *
 * ⚠️ 存在的理由:有一类错**只在部署之后才暴露**,本地从根目录起服务时永远绿:
 *   · `public/` 里的资源写死成 `/xxx.pdf`,线上是 404;
 *   · lazy chunk 的路径没跟着 base 走;
 *   · 任何硬编码的斜杠开头的链接。
 * 本地 `home-check` 从 `/` 起服务,这些一个都看不见。
 *
 * 跑法:先 `GITHUB_PAGES=true npx vite build`,再 `node tests/e2e/pages-check.mjs`。
 */
import { chromium } from 'playwright-core';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http'; import { join, extname } from 'node:path';
const DIST=join(process.cwd(),'dist'); const BASE_PATH='/calc-viz/';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.pdf':'application/pdf'};
const server=await new Promise(r=>{const s=createServer((q,res)=>{
  let rel=decodeURIComponent((q.url??'/').split('?')[0]);
  if(!rel.startsWith(BASE_PATH)){res.writeHead(404);res.end('outside base');return;}
  rel=rel.slice(BASE_PATH.length-1);
  let f=join(DIST, rel==='/'||rel===''?'index.html':rel);
  if(!existsSync(f)||statSync(f).isDirectory())f=join(DIST,'index.html');
  res.writeHead(200,{'Content-Type':MIME[extname(f)]??'application/octet-stream'});res.end(readFileSync(f));
});s.listen(4360,()=>r(s));});
const B='http://localhost:4360/calc-viz/';
const bad=[]; const note=m=>bad.push(m);
const b=await chromium.launch();
const p=await b.newPage({viewport:{width:1440,height:1100}});
p.on('console',m=>{if(m.type()==='error')note('console: '+m.text().slice(0,140));});
p.on('pageerror',e=>note('pageerror: '+e.message.slice(0,140)));
p.on('requestfailed',r=>note('request failed: '+r.url().slice(-70)));
await p.goto(B,{waitUntil:'networkidle'}); await p.waitForTimeout(1400);

const cards=await p.locator('[data-lesson-card]').count();
if(cards!==40) note(`expected 40 lesson cards, got ${cards}`);
const filters=await p.locator('.home-filters button').count();
if(filters!==5) note(`expected 5 filters, got ${filters}`);

// PDF 在子路径下必须还能拿到(这类错只在部署后才暴露)
const pdf=await p.evaluate(async()=>{const a=document.querySelector('a[href*="SecretFormula"]');
  const r=await fetch(new URL(a.getAttribute('href'),location.href));
  const u=new Uint8Array(await r.arrayBuffer());
  return {status:r.status,size:u.length,head:String.fromCharCode(...u.slice(0,5)),href:a.getAttribute('href')};});
if(pdf.status!==200||pdf.head!=='%PDF-') note(`PDF broken under the subpath: ${JSON.stringify(pdf)}`);

// 七条链在子路径下也要开得出来
for(const id of ['derivative','riemann-sum','log-integral','shell-method','disk-method','unit-circle','trig-rates']){
  await p.goto(`${B}#/${id}`,{waitUntil:'networkidle'}); await p.waitForTimeout(1600);
  const ok=await p.evaluate(()=>({canvas:document.querySelectorAll('canvas').length,
    steps:document.querySelectorAll('[data-step-outline]').length}));
  if(ok.canvas!==1) note(`[${id}] canvas=${ok.canvas} under the subpath`);
  if(ok.steps<6) note(`[${id}] step outline has ${ok.steps} entries under the subpath`);
}
// 404 页
await p.goto(`${B}#/nope`,{waitUntil:'networkidle'}); await p.waitForTimeout(500);
if(await p.locator('[data-missing-route]').count()!==1) note('the not-found page did not render under the subpath');

await b.close(); server.close();
if(bad.length){console.error('✗ pages-check\n'+bad.map(x=>'  '+x).join('\n'));process.exit(1);}
console.log('✓ 子路径 /calc-viz/ 下一切正常:40 张卡、5 个筛选、七条链、PDF、404');
