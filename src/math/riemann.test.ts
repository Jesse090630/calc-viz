import { describe, it, expect } from 'vitest';
import { sampleX, riemannSum, relativeError } from './riemann';

describe('sampleX', () => {
  it('left / right / mid 在 [0,2] n=2 上取到正确的点', () => {
    expect(sampleX(0, 2, 2, 0, 'left')).toBe(0);
    expect(sampleX(0, 2, 2, 0, 'mid')).toBe(0.5);
    expect(sampleX(0, 2, 2, 0, 'right')).toBe(1);
    expect(sampleX(0, 2, 2, 1, 'mid')).toBe(1.5);
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
