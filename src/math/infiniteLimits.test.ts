/**
 * `infiniteLimits.ts` 的测试。
 *
 * ⭐⭐ 两条硬约束:
 * ① **∞ 不是数** —— 模块里没有"极限等于某个数"的出口,措辞里也不许出现 equals infinity;
 * ② **无界要用构造证明** —— 给任意界,都能给出一个超过它的 x。
 */
import { describe, it, expect } from 'vitest';
import {
  A,
  GROWTH_COPY,
  MAX_DECADE,
  MIN_GAP,
  TWO_SIDED_TEX,
  approachTex,
  beats,
  clampToSide,
  closerDecade,
  decade,
  decadeX,
  growthByProbe,
  growthBySign,
  growthTex,
  read,
  showX,
  showY,
  sidesAgree,
  valueAt,
  viewHalfHeight,
  viewHalfWidth,
  type Side,
} from './infiniteLimits';

const SIDES: readonly Side[] = ['left', 'right'];

describe('⭐⭐ ∞ 不是一个数', () => {
  it('JS 里 1/0 是 Infinity 且不报错 —— 先证明这个坑存在', () => {
    expect(1 / 0).toBe(Infinity);
    expect(Number.isFinite(1 / 0)).toBe(false);
    expect(valueAt(0)).toBeNull();
  });

  it('显示层写 undefined,不写 Infinity', () => {
    expect(showY(valueAt(0))).toBe('undefined');
    expect(showY(valueAt(0))).not.toContain('Infinity');
  });

  it('措辞是"无界增长",不是"等于无穷"', () => {
    for (const side of SIDES) {
      const words = GROWTH_COPY[growthBySign(side)].words;
      expect(words).toContain('without bound');
      expect(words.toLowerCase()).not.toContain('equals');
      expect(words.toLowerCase()).not.toContain('reaches');
    }
  });

  it('双侧那一行写的是不存在,不是等于 ∞', () => {
    expect(TWO_SIDED_TEX).toContain('does not exist');
    expect(TWO_SIDED_TEX).not.toMatch(/=\s*[+-]?\\infty/);
    expect(sidesAgree()).toBe(false);
  });
});

describe('⭐⭐ 无界:给任意界都能超过它', () => {
  it('从右边:任何界都会被超过', () => {
    // ⚠️ 界要能开到很大。第一版 `valueAt` 用 1e-12 当"算作 0"的阈值,
    //    于是 bound = 1e12 就顶不住了 —— 代码里给"无界"设了个上限。
    for (const bound of [1, 10, 1e3, 1e6, 1e12, 1e30, 1e100]) {
      const k = beats('right', bound);
      expect(k, `bound = ${bound}`).not.toBeNull();
      expect(valueAt(decadeX('right', k!))!).toBeGreaterThan(bound);
    }
  });

  it('从左边:任何界都会被跌破', () => {
    for (const bound of [1, 10, 1e3, 1e6, 1e12, 1e60]) {
      const k = beats('left', bound);
      expect(k, `bound = ${bound}`).not.toBeNull();
      expect(valueAt(decadeX('left', k!))!).toBeLessThan(-bound);
    }
  });

  it('⭐ 界面的最近距离(10⁻⁵)与论证的深度是两回事', () => {
    // 学生只能拖到 10⁻⁵,但"无界"这件事不受界面限制。
    expect(MIN_GAP).toBe(1e-5);
    // 十进位必须**精确**:10 ** -5 会给 0.0000099999999…
    for (let k = 0; k <= 8; k += 1) expect(decade(k)).toBe(Number('1e-' + k));
    // ⚠️ 非整数的 k 也必须给出有限值 —— 首页预览用连续的 k 做动画。
    for (const k of [0.5, 1.3, 2.75, 4.99]) {
      expect(Number.isFinite(decade(k)), `decade(${k})`).toBe(true);
      expect(decade(k)).toBeGreaterThan(0);
    }
    for (const side of ['left', 'right'] as const) {
      for (const k of [0.5, 2.75]) expect(Number.isFinite(valueAt(decadeX(side, k))!)).toBe(true);
    }
    expect(beats('right', 1e50)).toBeGreaterThan(MAX_DECADE);
  });

  it('界越大,需要走得越近 —— 但**总是**走得到', () => {
    let previous = -1;
    for (const bound of [10, 1e3, 1e6, 1e9]) {
      const k = beats('right', bound)!;
      expect(k).toBeGreaterThan(previous);
      previous = k;
    }
  });
});

describe('⭐ 两条独立路径给出同一个方向', () => {
  it('符号推理 vs 取样探测', () => {
    for (const side of SIDES) expect(growthByProbe(side), side).toBe(growthBySign(side));
  });

  it('右边往上,左边往下', () => {
    expect(growthBySign('right')).toBe('up');
    expect(growthBySign('left')).toBe('down');
  });

  it('十进位阶梯:|x| = 10⁻ᵏ 时 |f| = 10ᵏ', () => {
    for (let k = 0; k <= MAX_DECADE; k += 1) {
      expect(Math.abs(valueAt(decadeX('right', k))!)).toBeCloseTo(10 ** k, 6);
      expect(Math.abs(valueAt(decadeX('left', k))!)).toBeCloseTo(10 ** k, 6);
    }
    // 提示词点名的那几组
    expect(valueAt(0.1)).toBeCloseTo(10, 9);
    expect(valueAt(0.01)).toBeCloseTo(100, 9);
    expect(valueAt(-0.001)).toBeCloseTo(-1000, 9);
  });
});

describe('可拖的点', () => {
  it('永远越不过渐近线,而且留在自己那一侧', () => {
    for (const x of [-99, -1e-9, 0, 1e-9, 99, Number.NaN]) {
      expect(clampToSide('left', x)).toBeLessThan(0);
      expect(clampToSide('right', x)).toBeGreaterThan(0);
      expect(Math.abs(clampToSide('left', x))).toBeGreaterThanOrEqual(MIN_GAP - 1e-15);
    }
  });

  it('读数不会是 Infinity', () => {
    for (const side of SIDES) {
      for (let k = 0; k <= MAX_DECADE; k += 1) {
        const r = read(side, decadeX(side, k));
        expect(Number.isFinite(r.y), `${side} k=${k}`).toBe(true);
        expect(r.x).not.toBe(A);
      }
    }
  });

  it('「再靠近十倍」每次加一档,到最深就停住', () => {
    let k = 0;
    for (let i = 0; i < MAX_DECADE + 3; i += 1) k = closerDecade(k);
    expect(k).toBe(MAX_DECADE);
  });
});

describe('取景跟着档位放大', () => {
  it('档位越深,纵向越高、横向越窄', () => {
    let previousH = 0;
    let previousW = Number.POSITIVE_INFINITY;
    for (let k = 0; k <= MAX_DECADE; k += 1) {
      const h = viewHalfHeight(k);
      const w = viewHalfWidth(k);
      expect(h).toBeGreaterThanOrEqual(previousH);
      expect(w).toBeLessThanOrEqual(previousW);
      previousH = h;
      previousW = w;
    }
  });

  it('⚠️ 每一档的曲线值都**落在当时的取景里** —— 否则爆炸看不见', () => {
    for (let k = 1; k <= MAX_DECADE; k += 1) {
      const y = Math.abs(valueAt(decadeX('right', k))!);
      expect(y, `档 ${k} 跑出画外`).toBeLessThanOrEqual(viewHalfHeight(k));
      expect(Math.abs(decadeX('right', k))).toBeLessThanOrEqual(viewHalfWidth(k));
    }
  });
});

describe('显示', () => {
  it('极小的 x 用科学记数,不显示成 0.000', () => {
    expect(showX(1e-4)).not.toBe('0.000');
    expect(showX(1e-4)).toContain('10');
    expect(showX(0.5)).toBe('0.500');
  });

  it('极大的 f 用科学记数,不显示成一长串', () => {
    expect(showY(1e5)).toContain('10');
    expect(showY(10)).toBe('10');
    expect(showY(-1000).startsWith('−')).toBe(true);
  });

  it('上标符号左右不同', () => {
    expect(approachTex('left')).toContain('^{-}');
    expect(approachTex('right')).toContain('^{+}');
    expect(growthTex('right')).toContain('+\\infty');
    expect(growthTex('left')).toContain('-\\infty');
  });
});
