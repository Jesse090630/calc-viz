/**
 * 部署 base 的测试。
 *
 * ⚠️ 这不是数学,放在这里只是因为 vitest 只收 `src/**` 下的测试。
 * 但它保护的是一类**最贵**的错误:base 写错了,线上整站白屏,而本地全绿 ——
 * 因为本地永远是从根路径起服务的。
 *
 * GitHub Pages 的两种挂法:
 *   · 无自定义域名 → `https://<用户名>.github.io/<仓库名>/`,base 必须是 `/calc-viz/`
 *   · 有自定义域名 → `https://那个域名/` 的**根**上,base 必须是 `/`
 * 而部署工作流无条件设 `GITHUB_PAGES=true`。所以接域名的那一刻,
 * 如果 base 没跟着变,每个资源都会 404。
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { customDomain, resolveBase } from '../../vite.config';

const temps: string[] = [];
function tempCname(contents: string | null): string {
  const dir = mkdtempSync(join(tmpdir(), 'cname-'));
  temps.push(dir);
  const path = join(dir, 'CNAME');
  if (contents !== null) writeFileSync(path, contents);
  return path;
}

afterEach(() => {
  while (temps.length) rmSync(temps.pop()!, { recursive: true, force: true });
});

describe('⭐⭐ base 必须跟着自定义域名一起变', () => {
  it('GitHub Pages + 没有域名 → 子路径', () => {
    expect(resolveBase(true, null)).toBe('/calc-viz/');
  });

  it('⭐ GitHub Pages + 有域名 → **根路径**(这一条就是那个陷阱)', () => {
    expect(resolveBase(true, 'calcviz.app')).toBe('/');
  });

  it('不是 GitHub Pages(Vercel / Netlify / 本地)→ 永远根路径', () => {
    expect(resolveBase(false, null)).toBe('/');
    expect(resolveBase(false, 'calcviz.app')).toBe('/');
  });

  it('⭐ 两种挂法给出的 base **必须不同** —— 否则这套逻辑等于没写', () => {
    expect(resolveBase(true, null)).not.toBe(resolveBase(true, 'calcviz.app'));
  });
});

describe('⭐ CNAME 就是唯一的事实来源', () => {
  it('文件不存在 → null', () => {
    expect(customDomain(join(tempCname(null), '..', 'nope'))).toBeNull();
  });

  it('文件存在且有内容 → 返回域名', () => {
    expect(customDomain(tempCname('calcviz.app'))).toBe('calcviz.app');
  });

  it('⚠️ 结尾的换行与空白要去掉 —— GitHub Pages 存的 CNAME 通常带一个换行', () => {
    expect(customDomain(tempCname('calcviz.app\n'))).toBe('calcviz.app');
    expect(customDomain(tempCname('  calcviz.app  \n'))).toBe('calcviz.app');
  });

  it('⚠️ 空文件当作没配 —— 不能让一个空 CNAME 把 base 切成根路径', () => {
    expect(customDomain(tempCname(''))).toBeNull();
    expect(customDomain(tempCname('   \n'))).toBeNull();
  });

  it('⭐ 空 CNAME 与不存在,行为必须一致', () => {
    expect(resolveBase(true, customDomain(tempCname('')))).toBe('/calc-viz/');
    expect(resolveBase(true, customDomain(tempCname('\n\n')))).toBe('/calc-viz/');
  });
});

describe('⭐ 当前仓库的实际状态', () => {
  it('现在还没有配自定义域名,所以线上仍然是子路径', () => {
    // ⚠️ 这一条会在你新建 public/CNAME 的那一刻变红 —— **那是故意的**。
    //    它提醒你:base 已经自动切到根路径了,DNS 也要跟上,
    //    而且旧的 github.io/calc-viz/ 链接会开始重定向。
    expect(customDomain()).toBeNull();
    expect(resolveBase(true, customDomain())).toBe('/calc-viz/');
  });
});
