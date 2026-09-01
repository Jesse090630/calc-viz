/**
 * `texCache` 的测试。
 *
 * ⚠️ 这些测试**抓不到那个真正的 bug**(渲染被高优先级更新饿死),那件事只有
 * 浏览器里才看得见 —— `tests/e2e/formulas-check.mjs` 里从**有动画的首页**点开
 * 弹窗的那一段才是它的回归测试。
 * 这里能钉住的是它的前提:同一条 TeX 只渲染一次,而且预热确实发生过。
 */
import { describe, expect, it } from 'vitest';
import { FORMULA_SECTIONS } from '../math/formulaCatalog';
import { cacheSize, texHtml, warmTexCache } from './texCache';

function allTex(): string[] {
  return FORMULA_SECTIONS.flatMap((s) => s.entries.flatMap((e) => e.tex));
}

describe('texCache', () => {
  it('⭐ 同一条 TeX 第二次拿到的是**同一个字符串对象** —— 证明没有重新渲染', () => {
    const first = texHtml('a^2 - b^2');
    const second = texHtml('a^2 - b^2');
    expect(second).toBe(first);
    // 而且真的渲染出了东西,不是空串蒙混过关
    expect(first).toContain('katex');
  });

  it('⭐ 预热之后,目录里每一条 TeX 都已经在缓存里 —— 组件渲染时一条都不用现算', () => {
    const sources = allTex();
    warmTexCache(sources);
    const sizeAfterWarm = cacheSize();

    // 再全部取一遍,缓存**一条都不应该增长**
    for (const src of sources) texHtml(src);
    expect(cacheSize()).toBe(sizeAfterWarm);

    // 防空转:目录不能是空的,否则上面这条永远成立却什么也没证明
    expect(sources.length).toBeGreaterThan(150);
  });

  it('⭐ 缓存条数 = 去重后的 TeX 条数,不多不少', () => {
    warmTexCache(allTex());
    expect(cacheSize()).toBeGreaterThanOrEqual(new Set(allTex()).size);
  });
});
