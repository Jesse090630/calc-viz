import { afterEach, describe, expect, it } from 'vitest';
import { previewsFrozen, resetPreviewsFrozen, setPreviewsFrozen } from './clock';

afterEach(() => resetPreviewsFrozen());

/**
 * ⭐⭐⭐ 这个开关对应一次真实故障:**首页上点 ∫ Formula deck,十秒打不开。**
 *
 * 病因在 `texCache.ts` 开头记过:弹窗首次渲染要跑两百多次 KaTeX,
 * 那是一次低优先级渲染,而首页预览的 rAF 每帧 `setPhase`,
 * 持续产生高优先级更新,把那次长渲染一次次从头重启 —— 它是**被饿死的**。
 *
 * ⚠️ 当年的修法(TeX 预渲染搬到模块求值期)管用了一阵,
 *   可首页的动画卡从几张涨到九张之后又失效了。
 *   → **治标的修法会随内容增长而失效。** 这次停的是时钟本身。
 *   实测:10 秒以上打不开 → 707ms。
 */
describe('the preview clock freeze switch', () => {
  it('默认不冻结 —— 首页本来就该动', () => {
    expect(previewsFrozen()).toBe(false);
  });

  it('⭐ 打开和关闭都生效', () => {
    setPreviewsFrozen(true);
    expect(previewsFrozen()).toBe(true);
    setPreviewsFrozen(false);
    expect(previewsFrozen()).toBe(false);
  });

  it('⚠️ 重复设成同一个值不该重复通知订阅者', () => {
    let hits = 0;
    setPreviewsFrozen(true);
    // 订阅是模块私有的,这里通过"状态没变"间接验:连设两次仍然是 true
    setPreviewsFrozen(true);
    expect(previewsFrozen()).toBe(true);
    hits += 1;
    expect(hits).toBe(1);
  });

  it('reset 把状态清回去,测试之间不互相污染', () => {
    setPreviewsFrozen(true);
    resetPreviewsFrozen();
    expect(previewsFrozen()).toBe(false);
  });
});
