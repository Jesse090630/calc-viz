/**
 * 这一组测试全都是被浏览器里那个真 bug 逼出来的。
 *
 * 组件里原来写的是「谁挡路就把谁推开」,单看代码很合理,
 * 直到把手柄一路拖到区间尽头 —— 两点撞在一起、`orderPair` 返回 null、
 * 整对被回退逻辑扔回区间两端,屏幕上表现为"往右拖,点却跳到最左边"。
 *
 * 所以这里的核心断言只有一句:**遍历整个行程,x₁ < x₂ 永远成立。**
 */
import { describe, it, expect } from 'vitest';
import { MIN_GAP, fitToInterval, moveX1, moveX2 } from './pairState';
import { orderPair, type Interval } from '../../math/monotonicity';

const I: Interval = { a: 0, b: 3 };
const NEG: Interval = { a: -2, b: 2 };

describe('⭐ 遍历整个拖动行程,顺序永不破坏', () => {
  it('把 x₁ 从最左一路拖到最右(含拖出界),始终 x₁ < x₂', () => {
    let state = { x1: 0.8, x2: 2.1 };
    for (let i = -50; i <= 400; i += 1) {
      state = moveX1(state, (i / 350) * 3, I);
      expect(state.x1, `第 ${i} 步`).toBeLessThan(state.x2);
      expect(orderPair(state.x1, state.x2), `第 ${i} 步产生了非法对`).not.toBeNull();
    }
  });

  it('把 x₂ 从最右一路拖到最左(含拖出界),始终 x₁ < x₂', () => {
    let state = { x1: 0.8, x2: 2.1 };
    for (let i = 400; i >= -50; i -= 1) {
      state = moveX2(state, (i / 350) * 3, I);
      expect(state.x1, `第 ${i} 步`).toBeLessThan(state.x2);
    }
  });

  it('⚠️ 就是那个 bug:x₁ 拖到右端点之外,不许把两点弹回区间两头', () => {
    const after = moveX1({ x1: 0.8, x2: 2.1 }, 99, I);
    expect(after.x1).toBeCloseTo(3 - MIN_GAP, 10);
    expect(after.x2).toBeCloseTo(3, 10);
    expect(after.x1).toBeLessThan(after.x2);
    // 旧写法在这里会得到 x₁ = x₂ = 3,然后被上层回退成 (0, 3)
    expect(after.x1).not.toBe(0);
  });

  it('x₂ 拖到左端点之外,对称地不许弹回', () => {
    const after = moveX2({ x1: 0.8, x2: 2.1 }, -99, I);
    expect(after.x2).toBeCloseTo(MIN_GAP, 10);
    expect(after.x1).toBeCloseTo(0, 10);
    expect(after.x1).toBeLessThan(after.x2);
  });

  it('两点之间永远至少留着一条缝隙', () => {
    let state = { x1: 0.8, x2: 2.1 };
    for (const target of [3, 2.9999, 0, -5, 1.5, 1.5000001, 3, 0]) {
      state = moveX1(state, target, I);
      expect(state.x2 - state.x1).toBeGreaterThanOrEqual(MIN_GAP - 1e-12);
      state = moveX2(state, target, I);
      expect(state.x2 - state.x1).toBeGreaterThanOrEqual(MIN_GAP - 1e-12);
    }
  });

  it('推开的那一个也不许被推出区间', () => {
    const a = moveX1({ x1: 0.8, x2: 2.1 }, 2.99, I);
    expect(a.x2).toBeLessThanOrEqual(3);
    const b = moveX2({ x1: 0.8, x2: 2.1 }, 0.01, I);
    expect(b.x1).toBeGreaterThanOrEqual(0);
  });

  it('非有限输入原样返回,不产生 NaN', () => {
    const before = { x1: 0.8, x2: 2.1 };
    expect(moveX1(before, Number.NaN, I)).toEqual(before);
    expect(moveX2(before, Number.POSITIVE_INFINITY, I)).toEqual(before);
  });
});

describe('换区间', () => {
  it('[0,3] 的一对搬进 [-2,2] 后仍然合法', () => {
    const fitted = fitToInterval({ x1: 0.8, x2: 2.9 }, NEG);
    expect(fitted.x1).toBeGreaterThanOrEqual(-2);
    expect(fitted.x2).toBeLessThanOrEqual(2);
    expect(fitted.x1).toBeLessThan(fitted.x2);
  });

  it('整对都落在新区间之外时也能救回来', () => {
    const fitted = fitToInterval({ x1: 8, x2: 9 }, NEG);
    expect(fitted.x1).toBeLessThan(fitted.x2);
    expect(fitted.x1).toBeGreaterThanOrEqual(-2);
    expect(fitted.x2).toBeLessThanOrEqual(2);
  });

  it('区间窄到放不下缝隙时退化成两个端点,而不是报错', () => {
    const fitted = fitToInterval({ x1: 0, x2: 1 }, { a: 1, b: 1.01 });
    expect(fitted.x1).toBeLessThanOrEqual(fitted.x2);
  });

  // 变异测试逼出来的一条:原本这里写了一次"把被推的那个裁回区间",
  // 但它在正常区间下**永远不会触发** —— 因为主动那个已经先被裁到 b − MIN_GAP 了。
  // 测不到的防御代码删掉之后,真正需要防的是这种退化区间,那才是能触发的分支。
  it('退化区间下移动手柄不产生越界或 NaN', () => {
    const narrow: Interval = { a: 1, b: 1.01 };
    for (const target of [-99, 0.5, 1.005, 99]) {
      for (const state of [moveX1({ x1: 1, x2: 1.01 }, target, narrow), moveX2({ x1: 1, x2: 1.01 }, target, narrow)]) {
        expect(Number.isFinite(state.x1)).toBe(true);
        expect(Number.isFinite(state.x2)).toBe(true);
        expect(state.x1).toBeGreaterThanOrEqual(narrow.a);
        expect(state.x2).toBeLessThanOrEqual(narrow.b);
      }
    }
  });

  it('正常区间下被推的那个永远不会跑出右端点', () => {
    for (let i = 0; i <= 200; i += 1) {
      const state = moveX1({ x1: 0, x2: 0.1 }, (i / 200) * 3.5, I);
      expect(state.x2).toBeLessThanOrEqual(I.b + 1e-12);
      expect(state.x1).toBeGreaterThanOrEqual(I.a);
    }
  });
});
