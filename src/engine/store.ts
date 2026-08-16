/**
 * ENGINE — 状态存储
 *
 * 用工厂函数而不是全局单例:每条链一个 store,测试时无需清理全局状态。
 */
import { create } from 'zustand';
import type { Chain, Params } from './types';

export interface ChainStore {
  readonly chain: Chain;
  readonly index: number;
  readonly params: Record<string, number>;

  goto: (index: number) => void;
  next: () => void;
  prev: () => void;
  setParam: (key: string, value: number) => void;
  /** 回到本步的初始参数(不改变步号) */
  resetParams: () => void;
}

/**
 * 计算某一步的初始参数。
 * 优先级:链默认值 < 该步的 params < 该步 autoplay 的起点
 * (autoplay 最高,否则进入该步的瞬间会先闪一下终态再倒回去)
 */
export function paramsForStage(chain: Chain, index: number): Record<string, number> {
  const stage = chain.stages[index];
  const merged: Record<string, number> = { ...chain.defaultParams, ...(stage?.params ?? {}) };
  if (stage?.autoplay) merged[stage.autoplay.param] = stage.autoplay.from;
  return merged;
}

const clamp = (i: number, n: number): number => Math.max(0, Math.min(n - 1, Math.trunc(i)));

export function createChainStore(chain: Chain) {
  if (chain.stages.length === 0) throw new Error(`Chain "${chain.id}" has no stages`);

  return create<ChainStore>((set, get) => ({
    chain,
    index: 0,
    params: paramsForStage(chain, 0),

    goto: (index) => {
      const i = clamp(index, chain.stages.length);
      // 切步时必须重置参数,否则会残留上一步的状态,画面会莫名其妙
      set({ index: i, params: paramsForStage(chain, i) });
    },
    next: () => get().goto(get().index + 1),
    prev: () => get().goto(get().index - 1),

    setParam: (key, value) => {
      if (!Number.isFinite(value)) return; // 拖动时的脏值直接丢弃,不要污染状态
      set((s) => ({ params: { ...s.params, [key]: value } }));
    },

    resetParams: () => set((s) => ({ params: paramsForStage(chain, s.index) })),
  }));
}

export type ChainStoreHook = ReturnType<typeof createChainStore>;

/** 供场景组件使用的便捷判断 */
export const makeVisible =
  (show: readonly string[]) =>
  (objectId: string): boolean =>
    show.includes(objectId);

/** 把 FormulaLine.tex 解析成字符串 */
export function resolveTex(tex: string | ((p: Params) => string), params: Params): string {
  return typeof tex === 'function' ? tex(params) : tex;
}
