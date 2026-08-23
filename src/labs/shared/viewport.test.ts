import { describe, it, expect } from 'vitest';
import {
  fromSvgX,
  makeViewport,
  polylinePath,
  ticks,
  toSvgX,
  toSvgY,
} from './viewport';

const VIEWPORT = makeViewport({ xMin: -2.6, xMax: 3.6, yMin: -1.1, yMax: 9.8 });

describe('坐标映射', () => {
  it('fromSvgX 是 toSvgX 的严格逆 —— 否则拖拽会漂', () => {
    for (const x of [-2.6, -1, 0, 0.8, 2.1, 3, 3.6]) {
      expect(fromSvgX(VIEWPORT, toSvgX(VIEWPORT, x))).toBeCloseTo(x, 10);
    }
  });

  it('y 轴是翻转的:更大的数学 y 给出更小的 SVG y', () => {
    expect(toSvgY(VIEWPORT, 4)).toBeLessThan(toSvgY(VIEWPORT, 1));
  });

  it('x 轴不翻转', () => {
    expect(toSvgX(VIEWPORT, 3)).toBeGreaterThan(toSvgX(VIEWPORT, 0));
  });

  it('窗口边界落在内边距上', () => {
    expect(toSvgX(VIEWPORT, VIEWPORT.xMin)).toBeCloseTo(VIEWPORT.padLeft, 6);
    expect(toSvgX(VIEWPORT, VIEWPORT.xMax)).toBeCloseTo(VIEWPORT.width - VIEWPORT.padRight, 6);
    expect(toSvgY(VIEWPORT, VIEWPORT.yMax)).toBeCloseTo(VIEWPORT.padTop, 6);
  });
});

describe('折线', () => {
  it('无定义处断开而不是连过去', () => {
    const path = polylinePath(VIEWPORT, [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: null },
      { x: 3, y: 9 },
    ]);
    // 两段:0→1 一段,3 单独起一段
    expect(path.match(/M/g)).toHaveLength(2);
  });

  it('全部无定义时给出空路径而不是 NaN', () => {
    const path = polylinePath(VIEWPORT, [{ x: 0, y: null }, { x: 1, y: null }]);
    expect(path).toBe('');
    expect(path).not.toContain('NaN');
  });

  it('正常曲线不产生 NaN', () => {
    const points = Array.from({ length: 60 }, (_, i) => {
      const x = -2.6 + (6.2 * i) / 59;
      return { x, y: x * x };
    });
    expect(polylinePath(VIEWPORT, points)).not.toContain('NaN');
  });
});

describe('刻度', () => {
  it('不产生浮点噪声标签', () => {
    for (const t of ticks(-2.6, 3.6, 1)) {
      expect(String(t)).not.toMatch(/000000|999999/);
    }
  });

  it('落在范围内', () => {
    expect(ticks(-2.6, 3.6, 1)).toEqual([-2, -1, 0, 1, 2, 3]);
  });
});
