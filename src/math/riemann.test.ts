import { describe, it, expect } from 'vitest';
import { PARABOLA_DOWN } from './curves';
import type { CurveSpec } from './types';
import {
  definiteIntegralExact,
  endpointDifference,
  leftRightGap,
  partitionWidth,
  riemannRectangles,
  sampleX,
  riemannSum,
  relativeError,
} from './riemann';

describe('sampleX', () => {
  it('left / right / mid 在 [0,2] n=2 上取到正确的点', () => {
    expect(sampleX(0, 2, 2, 0, 'left')).toBe(0);
    expect(sampleX(0, 2, 2, 0, 'mid')).toBe(0.5);
    expect(sampleX(0, 2, 2, 0, 'right')).toBe(1);
    expect(sampleX(0, 2, 2, 1, 'mid')).toBe(1.5);
  });
});

describe('partitionWidth', () => {
  it('手算:[0,2] 分 4 份时 Δx=0.5', () => {
    expect(partitionWidth([0, 2], 4)).toBeCloseTo(0.5, 12);
  });

  it('非正整数分割明确报错', () => {
    expect(() => partitionWidth([0, 2], 0)).toThrow();
    expect(() => partitionWidth([0, 2], 2.5)).toThrow();
  });
});

describe('riemannSum', () => {
  it('线性函数上中点法是精确的(∫₀¹ x dx = 1/2)', () => {
    for (const n of [1, 2, 7, 100]) {
      expect(riemannSum((x) => x, [0, 1], n, 'mid')).toBeCloseTo(0.5, 12);
    }
  });

  it('左端点法对递增函数低估,右端点法高估', () => {
    const left = riemannSum((x) => x, [0, 1], 4, 'left');
    const right = riemannSum((x) => x, [0, 1], 4, 'right');
    expect(left).toBeLessThan(0.5);
    expect(right).toBeGreaterThan(0.5);
  });

  it('中点法是二阶收敛:n 翻倍,误差缩到约 1/4', () => {
    const exact = 1 / 3; // ∫₀¹ x² dx
    const e = (n: number) => Math.abs(riemannSum((x) => x * x, [0, 1], n, 'mid') - exact);
    for (const n of [4, 8, 16, 32]) {
      expect(e(n) / e(2 * n)).toBeCloseTo(4, 1);
    }
  });

  it('n 非正整数要报错,不要静默返回 NaN', () => {
    expect(() => riemannSum((x) => x, [0, 1], 0)).toThrow();
    expect(() => riemannSum((x) => x, [0, 1], 2.5)).toThrow();
  });
});

describe('relativeError', () => {
  it('基本换算', () => {
    expect(relativeError(110, 100)).toBeCloseTo(10, 12);
    expect(relativeError(100, 100)).toBe(0);
  });
});

describe('leftRightGap', () => {
  it('手算:[0,2] 上 f(x)=4−x²,n=4 时左和 6.25、右和 4.25、夹缝 2', () => {
    expect(leftRightGap(PARABOLA_DOWN, 4, [0, 2])).toBeCloseTo(2, 12);
  });

  it('独立端点恒等式:(f(a)−f(b))Δx 与逐矩形求和一致', () => {
    for (const n of [1, 2, 4, 8, 16, 32, 64]) {
      const dx = 2 / n;
      const endpointGap = (PARABOLA_DOWN.f(0) - PARABOLA_DOWN.f(2)) * dx;
      expect(leftRightGap(PARABOLA_DOWN, n, [0, 2])).toBeCloseTo(endpointGap, 12);
    }
  });

  it('边界:n=1(Δx=2)且右端点为零时夹缝为 8', () => {
    expect(PARABOLA_DOWN.f(2)).toBe(0);
    expect(leftRightGap(PARABOLA_DOWN, 1, [0, 2])).toBeCloseTo(8, 12);
  });

  it('大 Δx 区间仍满足端点恒等式', () => {
    const linear = {
      ...PARABOLA_DOWN,
      f: (x: number) => 10 - x,
    };
    expect(leftRightGap(linear, 1, [0, 10])).toBeCloseTo(100, 12);
  });

  it('n 非正整数沿用 riemannSum 的明确报错', () => {
    expect(() => leftRightGap(PARABOLA_DOWN, 0, [0, 2])).toThrow();
    expect(() => leftRightGap(PARABOLA_DOWN, 2.5, [0, 2])).toThrow();
  });
});

describe('riemannRectangles', () => {
  it('n=4 时矩形位置取子区间中心,高度分别取左/右端点', () => {
    const left = riemannRectangles(PARABOLA_DOWN, 4, [0, 2], 'left');
    const right = riemannRectangles(PARABOLA_DOWN, 4, [0, 2], 'right');

    expect(left).toHaveLength(4);
    expect(left[0]).toEqual({ x: 0.25, dx: 0.5, height: 4 });
    expect(right[0]).toEqual({ x: 0.25, dx: 0.5, height: 3.75 });
    expect(right[3]).toEqual({ x: 1.75, dx: 0.5, height: 0 });
  });

  it('n=1 边界覆盖整个区间', () => {
    expect(riemannRectangles(PARABOLA_DOWN, 1, [0, 2], 'left')).toEqual([
      { x: 1, dx: 2, height: 4 },
    ]);
  });
});

describe('definiteIntegralExact', () => {
  it('手算:∫₀²(4−x²)dx = 16/3', () => {
    expect(definiteIntegralExact(PARABOLA_DOWN, [0, 2])).toBeCloseTo(16 / 3, 12);
  });

  it('用户曲线没有 F 时自动退回自适应 Simpson，仍得 16/3', () => {
    const userCurve = {
      id: 'user-parabola',
      label: 'y = 4 - x^2',
      tex: 'f(x)=4-x^2',
      f: (x: number) => 4 - x * x,
      df: (x: number) => -2 * x,
      domain: [0, 2] as const,
    } as CurveSpec;
    expect(definiteIntegralExact(userCurve)).toBeCloseTo(16 / 3, 10);
    expect(definiteIntegralExact(userCurve)).toBeCloseTo(
      riemannSum(userCurve.f, userCurve.domain, 20000, 'mid'),
      6,
    );
  });
});

describe('endpointDifference', () => {
  it('手算:f(0)−f(2)=4,作为左右和夹缝的 Δx 系数', () => {
    expect(endpointDifference(PARABOLA_DOWN, [0, 2])).toBeCloseTo(4, 12);
  });
});
