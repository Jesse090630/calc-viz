import { describe, expect, it } from 'vitest';
import { arcLength, circlePoint } from './trig';

describe('单位圆特殊角数表', () => {
  // 分镜表中的值已由独立 Python 脚本与项目 math 模块两条路径复核。
  const TABLE: ReadonlyArray<readonly [number, number, number]> = [
    [0, 1, 0],
    [Math.PI / 6, Math.sqrt(3) / 2, 1 / 2],
    [Math.PI / 4, Math.SQRT1_2, Math.SQRT1_2],
    [Math.PI / 3, 1 / 2, Math.sqrt(3) / 2],
    [Math.PI / 2, 0, 1],
    [Math.PI, -1, 0],
    [(3 * Math.PI) / 2, 0, -1],
  ];

  for (const [theta, expectedX, expectedY] of TABLE) {
    it(`θ = ${theta} → (${expectedX}, ${expectedY})`, () => {
      const [x, y] = circlePoint(theta);
      expect(x).toBeCloseTo(expectedX, 9);
      expect(y).toBeCloseTo(expectedY, 9);
    });
  }

  it('⭐ 任意角都留在单位圆上:cos²θ + sin²θ = 1', () => {
    for (let i = 0; i <= 720; i++) {
      const [x, y] = circlePoint((i * Math.PI) / 180);
      expect(x * x + y * y).toBeCloseTo(1, 12);
    }
  });

  it('第二条独立路径:四个轴端点每转 π/2 轮换一次', () => {
    const expected = [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
      [1, 0],
    ] as const;
    expected.forEach(([ex, ey], quarter) => {
      const [x, y] = circlePoint((quarter * Math.PI) / 2);
      expect(x).toBeCloseTo(ex, 12);
      expect(y).toBeCloseTo(ey, 12);
    });
  });
});

describe('弧长就是弧度角乘半径', () => {
  it('⭐ 单位圆上 s = θ', () => {
    for (const theta of [0, Math.PI / 6, Math.PI / 3, Math.PI, 2 * Math.PI]) {
      expect(arcLength(theta, 1)).toBeCloseTo(theta, 12);
    }
  });

  it('θ = π/3 时显示用弧长为 1.047198', () => {
    expect(arcLength(Math.PI / 3, 1).toFixed(6)).toBe('1.047198');
  });

  it('第二条独立路径:走一整圈等于圆周长 2πr', () => {
    for (const radius of [0.25, 1, 2.5, 10]) {
      expect(arcLength(2 * Math.PI, radius)).toBeCloseTo(2 * Math.PI * radius, 12);
    }
  });

  it('反向走同样远,弧长仍为正', () => {
    expect(arcLength(-Math.PI / 3, 2)).toBeCloseTo((2 * Math.PI) / 3, 12);
  });

  it('拒绝无效输入,不把 NaN 灌进场景', () => {
    expect(() => circlePoint(Number.NaN)).toThrow();
    expect(() => arcLength(Number.POSITIVE_INFINITY, 1)).toThrow();
    expect(() => arcLength(1, -1)).toThrow();
  });
});
