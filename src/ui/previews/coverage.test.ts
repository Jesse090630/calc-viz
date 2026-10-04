import { describe, expect, it } from 'vitest';
import { LESSONS } from '../Home';
import { PREVIEWS } from './LessonPreviews';

/**
 * ⭐⭐⭐ 这个文件只为一条断言存在,而那条断言对应一次真实事故。
 *
 * 首页的预览是**悬停**触发的:`onPointerEnter` 把那一课设为当前预览,
 * 然后 `Home` 渲染 `<Preview />`。`PREVIEWS` 里少了这一课,
 * `Preview` 就是 `undefined` —— React 抛 #130,**整棵树被卸载**,
 * 屏幕变黑、地址栏退回 `#/`。
 *
 * ⚠️ 为什么一直没发现:所有浏览器脚本都是 `goto('#/xxx')` 直接进课页,
 *   **没有一个真的悬停过首页的卡**。而 `PREVIEWS[id]!` 那个 `!`
 *   把类型检查也骗过去了。
 *   → 一次性加八课,八张卡全是地雷,而仓库从头到尾是绿的。
 */
describe('every lesson card has a preview', () => {
  it('⭐⭐⭐ 一课都不许漏 —— 漏一个,悬停那张卡就会让首页整个黑掉', () => {
    const missing = LESSONS.filter((l) => PREVIEWS[l.id] === undefined).map((l) => l.id);
    expect(missing).toEqual([]);
  });

  it('⚠️ 而且必须是个函数,不是别的什么东西', () => {
    for (const l of LESSONS) {
      expect(typeof PREVIEWS[l.id]).toBe('function');
    }
  });

  it('空转保护:课确实不少,而且 id 不重复', () => {
    expect(LESSONS.length).toBeGreaterThan(40);
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
  });

  it('⚠️ 反过来也查一遍:没有多余的预览挂在不存在的课上', () => {
    // 多出来的条目通常意味着某一课被改了 id 而预览没跟着改 ——
    // 那张卡的预览就静默地不见了(不会崩,但也永远不显示)。
    const ids = new Set(LESSONS.map((l) => l.id));
    const orphans = Object.keys(PREVIEWS).filter((k) => !ids.has(k));
    expect(orphans).toEqual([]);
  });
});
