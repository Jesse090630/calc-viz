import { describe, expect, it } from 'vitest';
import { candidateSteps, niceTicks } from './ticks';

/** 这一课用到的所有画框横纵跨度。 */
const RANGES: readonly (readonly [number, number])[] = [
  [0, 0.4], [0, 1], [0, 3], [0, 1.4], [0, 2 * Math.PI],
  [-3, 5], [-0.15, 2.25], [0.8, 3.1], [-0.1, 1.55], [0, 12],
];

describe('candidateSteps', () => {
  it('只给 1 / 2 / 5 乘十的幂', () => {
    for (const span of [0.03, 0.4, 1.4, 7, 40, 1234]) {
      for (const s of candidateSteps(span)) {
        const m = s / 10 ** Math.round(Math.log10(s / 5) + Math.log10(5));
        expect([1, 2, 5]).toContain(Number((s / 10 ** Math.floor(Math.log10(s) + 1e-9)).toFixed(6)));
        expect(Number.isFinite(m)).toBe(true);
      }
    }
  });

  it('候选里既有比跨度细得多的,也有跟跨度同量级的', () => {
    const c = candidateSteps(1.4);
    expect(Math.min(...c)).toBeLessThan(0.05);
    expect(Math.max(...c)).toBeGreaterThanOrEqual(1);
  });

  it('脏输入给 [1],不给 NaN', () => {
    for (const bad of [0, -3, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(candidateSteps(bad)).toEqual([1]);
    }
  });
});

describe('niceTicks', () => {
  it('⭐⭐ 小于 1 的跨度也给得出刻度 —— 这就是当初那个缺陷', () => {
    const t = niceTicks(0, 0.4, true);
    expect(t.length).toBeGreaterThanOrEqual(3);
    for (const v of t) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThanOrEqual(0.4);
    }
  });

  it('⭐⭐ [0, 1.4] 去掉 0 之后也得有 3 个以上 —— 第二个缺陷', () => {
    // 向上取整的版本在这里只吐得出 0.5 和 1.0 两个。
    expect(niceTicks(0, 1.4, true).length).toBeGreaterThanOrEqual(3);
  });

  it('这一课用到的每个画框,横轴纵轴都至少 3 个刻度', () => {
    for (const [lo, hi] of RANGES) {
      expect(niceTicks(lo, hi, true).length).toBeGreaterThanOrEqual(3);
      expect(niceTicks(lo, hi, false).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('也不会多到糊成一片', () => {
    for (const [lo, hi] of RANGES) {
      expect(niceTicks(lo, hi, true).length).toBeLessThanOrEqual(12);
      expect(niceTicks(lo, hi, false).length).toBeLessThanOrEqual(12);
    }
  });

  it('全都落在区间内,而且严格递增、间距相等', () => {
    for (const [lo, hi] of RANGES) {
      const t = niceTicks(lo, hi, false);
      expect(t[0]!).toBeGreaterThanOrEqual(lo);
      expect(t[t.length - 1]!).toBeLessThanOrEqual(hi);
      const gap = t[1]! - t[0]!;
      for (let i = 1; i < t.length; i += 1) {
        expect(t[i]!).toBeGreaterThan(t[i - 1]!);
        expect(t[i]! - t[i - 1]!).toBeCloseTo(gap, 9);
      }
    }
  });

  it('skipZero 只管 0', () => {
    expect(niceTicks(-3, 3, true)).not.toContain(0);
    expect(niceTicks(-3, 3, false)).toContain(0);
  });

  it('⚠️ 不带浮点毛刺 —— 屏幕上不许出现 0.30000000000000004', () => {
    for (const [lo, hi] of RANGES) {
      for (const v of niceTicks(lo, hi, false)) {
        expect(String(v).length).toBeLessThanOrEqual(5);
      }
    }
  });

  it('脏区间给空数组,不给 NaN', () => {
    expect(niceTicks(1, 1)).toEqual([]);
    expect(niceTicks(3, 1)).toEqual([]);
    expect(niceTicks(Number.NaN, 1)).toEqual([]);
  });
});
