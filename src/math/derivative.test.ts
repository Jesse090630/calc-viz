import { describe, it, expect } from 'vitest';
import { PARABOLA_UP, PARABOLA_DOWN, CURVES } from './curves';
import { numericDerivative } from './quadrature';
import { MIN_H, clampH, secantSlope, secant, tangent, lineY } from './derivative';

const A = 1; // 定点

describe('⭐ 割线斜率恒等于 2 + h(选这个例子的全部理由)', () => {
  // 这张表已由独立脚本验算,见 docs/HANDOFF.md 第 4.2 节
  const TABLE: ReadonlyArray<readonly [number, number]> = [
    [1, 3.0],
    [0.5, 2.5],
    [0.25, 2.25],
    [0.1, 2.1],
    [0.01, 2.01],
    [0.001, 2.001],
    [-0.1, 1.9],
  ];

  for (const [h, expected] of TABLE) {
    it(`h = ${h} → ${expected}`, () => {
      expect(secantSlope(PARABOLA_UP, A, h)).toBeCloseTo(expected, 9);
    });
  }

  it('对任意 h,割线斜率与 2 + h 完全一致', () => {
    for (let k = -40; k <= 40; k++) {
      const h = k / 20;
      if (h === 0) continue;
      expect(secantSlope(PARABOLA_UP, A, h)).toBeCloseTo(2 + h, 9);
    }
  });
});

describe('h → 0 时收敛到解析导数', () => {
  it('对每条曲线,h 很小的差商都逼近 df', () => {
    for (const c of CURVES) {
      const [lo, hi] = c.domain;
      const a = lo + (hi - lo) * 0.4; // 取定义域内部,避开端点(√x 在 0 处导数发散)
      expect(secantSlope(c, a, 1e-6)).toBeCloseTo(c.df(a), 4);
    }
  });

  it('第二条独立路径:中心差分数值导数也给出同一个值', () => {
    expect(numericDerivative(PARABOLA_UP.f, A)).toBeCloseTo(PARABOLA_UP.df(A), 8);
    expect(PARABOLA_UP.df(A)).toBe(2);
  });
});

describe('⚠️ h = 0 必须抛错而不是返回 NaN', () => {
  it('h = 0 抛错', () => {
    expect(() => secantSlope(PARABOLA_UP, A, 0)).toThrow(/0\/0/);
    expect(() => secant(PARABOLA_UP, A, 0)).toThrow();
  });

  it('h 非有限值抛错', () => {
    expect(() => secantSlope(PARABOLA_UP, A, Number.NaN)).toThrow();
    expect(() => secantSlope(PARABOLA_UP, A, Number.POSITIVE_INFINITY)).toThrow();
  });

  it('绝不返回 NaN —— NaN 会一路灌进场景变成看不见的错', () => {
    for (const h of [1, 0.3, -0.3, MIN_H, -MIN_H]) {
      expect(Number.isFinite(secantSlope(PARABOLA_UP, A, h))).toBe(true);
    }
  });
});

describe('clampH 把滑块推离 0', () => {
  it('0 推到 +MIN_H(默认从右边逼近)', () => {
    expect(clampH(0)).toBe(MIN_H);
  });
  it('保号', () => {
    expect(clampH(0.001)).toBe(MIN_H);
    expect(clampH(-0.001)).toBe(-MIN_H);
  });
  it('已经够大的值原样返回', () => {
    expect(clampH(0.5)).toBe(0.5);
    expect(clampH(-1)).toBe(-1);
  });
  it('⭐ clampH 之后的值送进 secantSlope 永远不抛', () => {
    for (let k = -100; k <= 100; k++) {
      expect(() => secantSlope(PARABOLA_UP, A, clampH(k / 100))).not.toThrow();
    }
  });
});

describe('secant 的几何数据', () => {
  it('h = 1 时 P=(1,1) Q=(2,4) Δx=1 Δy=3 斜率=3', () => {
    const s = secant(PARABOLA_UP, A, 1);
    expect(s.p).toEqual([1, 1]);
    expect(s.q).toEqual([2, 4]);
    expect(s.dx).toBe(1);
    expect(s.dy).toBe(3);
    expect(s.slope).toBe(3);
  });

  it('斜率与 Δy/Δx 一致(两条路径)', () => {
    for (const h of [0.4, -0.4, 0.05]) {
      const s = secant(PARABOLA_UP, A, h);
      expect(s.slope).toBeCloseTo(s.dy / s.dx, 12);
    }
  });
});

describe('tangent', () => {
  it('斜率来自解析导数,不是差商近似', () => {
    expect(tangent(PARABOLA_UP, A).slope).toBe(2);
    expect(tangent(PARABOLA_DOWN, 1).slope).toBe(-2);
  });

  it('切点在曲线上', () => {
    const t = tangent(PARABOLA_UP, 1.3);
    expect(t.p[1]).toBeCloseTo(PARABOLA_UP.f(1.3), 12);
  });
});

describe('lineY', () => {
  it('过点且斜率正确', () => {
    expect(lineY(1, 1, 2, 1)).toBe(1);
    expect(lineY(1, 1, 2, 3)).toBe(5);
    expect(lineY(1, 1, 2, 0)).toBe(-1);
  });
});
