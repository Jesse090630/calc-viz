import { describe, it, expect } from 'vitest';
import { createChainStore, paramsForStage, makeVisible, resolveTex } from './store';
import type { Chain } from './types';

const CHAIN: Chain = {
  id: 'test',
  title: 'Test chain',
  subtitle: 'test',
  defaultParams: { a: 1, b: 10 },
  stages: [
    { id: 's0', label: '1', title: 'A', narration: 'first', show: ['x'], camera: 'front' },
    {
      id: 's1',
      label: '2',
      title: 'B',
      narration: 'second',
      show: ['x', 'y'],
      camera: 'three-quarter',
      params: { a: 5 },
    },
    {
      id: 's2',
      label: '3',
      title: 'C',
      narration: 'third',
      show: ['y'],
      camera: 'three-quarter',
      autoplay: { param: 'b', from: 0, to: 100, delayMs: 900, durationMs: 1000 },
    },
  ],
};

describe('paramsForStage', () => {
  it('第 0 步用链的默认值', () => {
    expect(paramsForStage(CHAIN, 0)).toEqual({ a: 1, b: 10 });
  });
  it('stage.params 覆盖链默认值', () => {
    expect(paramsForStage(CHAIN, 1)).toEqual({ a: 5, b: 10 });
  });
  it('autoplay 起点优先级最高(否则进入该步会先闪终态再倒回去)', () => {
    expect(paramsForStage(CHAIN, 2)).toEqual({ a: 1, b: 0 });
  });
});

describe('createChainStore', () => {
  it('初始状态在第 0 步', () => {
    const s = createChainStore(CHAIN).getState();
    expect(s.index).toBe(0);
    expect(s.params).toEqual({ a: 1, b: 10 });
  });

  it('next / prev 正常前进后退', () => {
    const store = createChainStore(CHAIN);
    store.getState().next();
    store.getState().next();
    expect(store.getState().index).toBe(2);
    store.getState().prev();
    expect(store.getState().index).toBe(1);
  });

  it('两端会被夹住,不会越界', () => {
    const store = createChainStore(CHAIN);
    store.getState().prev();
    expect(store.getState().index).toBe(0);
    for (let i = 0; i < 10; i++) store.getState().next();
    expect(store.getState().index).toBe(CHAIN.stages.length - 1);
  });

  it('⭐ 切步时参数必须重置 —— 残留上一步的状态会让画面莫名其妙', () => {
    const store = createChainStore(CHAIN);
    store.getState().setParam('a', 999);
    expect(store.getState().params.a).toBe(999);
    store.getState().next();
    expect(store.getState().params.a).toBe(5); // 用的是 s1 的 params,不是 999
    store.getState().prev();
    expect(store.getState().params.a).toBe(1); // 回到 s0 也不残留
  });

  it('setParam 丢弃 NaN / Infinity,不污染状态', () => {
    const store = createChainStore(CHAIN);
    store.getState().setParam('a', Number.NaN);
    store.getState().setParam('a', Number.POSITIVE_INFINITY);
    expect(store.getState().params.a).toBe(1);
  });

  it('resetParams 只重置参数,不改步号', () => {
    const store = createChainStore(CHAIN);
    store.getState().next();
    store.getState().setParam('a', 42);
    store.getState().resetParams();
    expect(store.getState().index).toBe(1);
    expect(store.getState().params.a).toBe(5);
  });

  it('goto 接受小数索引时向下取整', () => {
    const store = createChainStore(CHAIN);
    store.getState().goto(1.9);
    expect(store.getState().index).toBe(1);
  });

  it('空链要在创建时就报错,而不是渲染时白屏', () => {
    expect(() => createChainStore({ ...CHAIN, stages: [] })).toThrow(/no stages/);
  });
});

describe('makeVisible / resolveTex', () => {
  it('makeVisible 按 show 列表判断', () => {
    const v = makeVisible(['a', 'b']);
    expect(v('a')).toBe(true);
    expect(v('z')).toBe(false);
  });
  it('resolveTex 支持常量与函数两种写法', () => {
    expect(resolveTex('x^2', {})).toBe('x^2');
    expect(resolveTex((p) => `x = ${p.a}`, { a: 7 })).toBe('x = 7');
  });
});
