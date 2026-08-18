import { describe, expect, it } from 'vitest';
import { adaptiveSimpson, numericDerivative } from './quadrature';
import { chordVelocity, circleVelocity, trigRates } from './trigRates';

describe('单位圆速度给出 sin / cos 的导数', () => {
  it('手算基准:θ=π/3 时速度是 (-√3/2, 1/2)', () => {
    const [vx, vy] = circleVelocity(Math.PI / 3);
    expect(vx).toBeCloseTo(-Math.sqrt(3) / 2, 12);
    expect(vy).toBeCloseTo(1 / 2, 12);
  });

  it('四个轴端点的速度始终沿逆时针切线', () => {
    const table = [
      [0, 0, 1],
      [Math.PI / 2, -1, 0],
      [Math.PI, 0, -1],
      [(3 * Math.PI) / 2, 1, 0],
    ] as const;
    for (const [theta, expectedX, expectedY] of table) {
      const [vx, vy] = circleVelocity(theta);
      expect(vx).toBeCloseTo(expectedX, 12);
      expect(vy).toBeCloseTo(expectedY, 12);
    }
  });

  it('速度长度恒为 1,所以箭头只转向而不伸缩', () => {
    for (let degree = 0; degree <= 360; degree += 3) {
      const [vx, vy] = circleVelocity((degree * Math.PI) / 180);
      expect(Math.hypot(vx, vy)).toBeCloseTo(1, 12);
    }
  });

  it('弦速度在 Δθ 缩小时收敛到切向速度', () => {
    const theta = Math.PI / 3;
    const exact = circleVelocity(theta);
    const errors = [0.8, 0.4, 0.2, 0.1, 0.05].map((delta) => {
      const chord = chordVelocity(theta, delta);
      return Math.hypot(chord[0] - exact[0], chord[1] - exact[1]);
    });
    for (let i = 1; i < errors.length; i++) {
      expect(errors[i]).toBeLessThan(errors[i - 1]!);
    }
    expect(errors.at(-1)).toBeLessThan(0.026);
  });

  it('第二条独立路径:中心差分逐点复算 d(cos)/dθ 与 d(sin)/dθ', () => {
    for (let degree = 0; degree <= 360; degree += 15) {
      const theta = (degree * Math.PI) / 180;
      const rates = trigRates(theta);
      expect(rates.dCos).toBeCloseTo(numericDerivative(Math.cos, theta), 8);
      expect(rates.dSin).toBeCloseTo(numericDerivative(Math.sin, theta), 8);
    }
  });

  it('积分反向复算:∫cos = sin 且 ∫sin = -cos + C', () => {
    for (const theta of [0, Math.PI / 6, Math.PI / 3, Math.PI / 2, Math.PI]) {
      expect(adaptiveSimpson(Math.cos, 0, theta)).toBeCloseTo(Math.sin(theta), 10);
      expect(adaptiveSimpson(Math.sin, 0, theta)).toBeCloseTo(1 - Math.cos(theta), 10);
    }
  });

  it('Δθ=0 与非有限输入必须抛错,不返回 NaN', () => {
    expect(() => chordVelocity(0, 0)).toThrow();
    expect(() => chordVelocity(Number.NaN, 0.1)).toThrow();
    expect(() => circleVelocity(Number.POSITIVE_INFINITY)).toThrow();
  });
});
