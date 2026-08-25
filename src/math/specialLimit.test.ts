/**
 * `specialLimit.ts` 的测试。
 *
 * ⭐⭐ 三条核心:
 * ① `sin θ < θ < tan θ` 在整个可拖范围上成立;
 * ② 比值处处被夹在 `[cos θ, 1]` 里,两条独立路径都给出 1;
 * ③ **弧度不是叮嘱,是事实**:角度制下同一个极限是 π/180。
 */
import { describe, it, expect } from 'vitest';
import {
  DEGREE_FACTOR, EPS, STEPS, THETA_RANGE,
  approachedValue, arcOf, areas, bounds, clampTheta, degreeVersionLimit,
  halveTheta, inequalityHolds, ratio, ratioInDegrees, sampleCos, sampleRatio,
  showGeometry, showValue, squeezedLimit, withinBounds,
} from './specialLimit';

const grid = (n = 200) =>
  Array.from({ length: n }, (_, i) => THETA_RANGE.from + ((THETA_RANGE.to - THETA_RANGE.from) * i) / (n - 1));

describe('⭐⭐ 几何不等式', () => {
  it('sin θ < θ < tan θ 在整个可拖范围上成立', () => {
    for (const t of grid()) expect(inequalityHolds(t), `θ = ${t}`).toBe(true);
  });

  it('三块面积按同样的顺序排', () => {
    for (const t of grid(60)) {
      const a = areas(t);
      expect(a.inner).toBeLessThan(a.sector);
      expect(a.sector).toBeLessThan(a.outer);
    }
  });

  it('⚠️ 弧长**就是** θ —— 这是弧度制才有的事', () => {
    for (const t of grid(20)) expect(arcOf(t)).toBe(t);
  });

  it('⚠️⚠️ 三个数在**显示出来之后**仍然互不相同 —— 包括最小的 θ', () => {
    // 四位小数时 θ = 0.02 会显示成 0.0200 / 0.0200 / 0.0200,
    // 屏幕上就成了 "0.0200 < 0.0200 < 0.0200" —— 把严格不等式显示成了相等。
    for (const t of [THETA_RANGE.from, 0.03, 0.05, 0.1, 1]) {
      const shown = [Math.sin(t), t, Math.tan(t)].map(showGeometry);
      expect(new Set(shown).size, `θ = ${t} 显示成 ${shown}`).toBe(3);
    }
  });

  it('范围之外不声称成立', () => {
    expect(inequalityHolds(0)).toBe(false);
    expect(inequalityHolds(-0.3)).toBe(false);
    expect(inequalityHolds(Math.PI / 2)).toBe(false);
  });
});

describe('⭐ 夹逼与两条路径', () => {
  it('比值处处夹在 [cos θ, 1] 里', () => {
    for (const t of grid()) {
      expect(withinBounds(t), `θ = ${t}`).toBe(true);
      const b = bounds(t);
      expect(b.low).toBeLessThan(b.high);
    }
  });

  it('两条独立路径都给出 1', () => {
    expect(squeezedLimit()).toBe(1);
    expect(approachedValue()).toBeCloseTo(1, 10);
  });

  it('⭐ 结论不看比值的任何一个取样 —— 一个参数都不接', () => {
    expect(squeezedLimit.length).toBe(0);
  });

  it('θ 越小,比值越接近 1', () => {
    let previous = Number.POSITIVE_INFINITY;
    for (const t of [1, 0.5, 0.1, 0.01, 0.001]) {
      const d = Math.abs(ratio(t)! - 1);
      expect(d).toBeLessThan(previous);
      previous = d;
    }
  });

  it('cos θ 与 1 都收到 1 —— 夹逼的前提', () => {
    expect(Math.cos(0)).toBe(1);
    expect(bounds(1e-6).low).toBeCloseTo(1, 10);
  });
});

describe('⭐⭐ 弧度不是叮嘱,是事实', () => {
  it('角度制下同一个极限是 π/180,不是 1', () => {
    expect(degreeVersionLimit()).toBeCloseTo(DEGREE_FACTOR, 15);
    expect(degreeVersionLimit()).not.toBeCloseTo(1, 2);
    expect(degreeVersionLimit()).toBeCloseTo(0.0174533, 6);
  });

  it('角度版本的比值确实收到 π/180', () => {
    let last = 0;
    for (const d of [10, 1, 0.1, 0.01, 0.001]) last = ratioInDegrees(d)!;
    expect(last).toBeCloseTo(DEGREE_FACTOR, 10);
  });

  it('两个答案差了两个数量级 —— 差别看得见', () => {
    expect(squeezedLimit() / degreeVersionLimit()).toBeGreaterThan(50);
  });
});

describe('θ = 0 处', () => {
  it('返回 null,不返回 NaN', () => {
    expect(Number.isNaN(Math.sin(0) / 0)).toBe(true);
    expect(ratio(0)).toBeNull();
    expect(ratioInDegrees(0)).toBeNull();
    expect(showValue(ratio(0))).toBe('undefined');
    expect(showValue(ratio(0))).not.toContain('NaN');
  });
});

describe('拖动与取样', () => {
  it('θ 夹在范围内,而且永远为正', () => {
    for (const v of [-9, 0, 0.001, 5, Number.NaN]) {
      const t = clampTheta(v);
      expect(t).toBeGreaterThanOrEqual(THETA_RANGE.from - EPS);
      expect(t).toBeLessThanOrEqual(THETA_RANGE.to + EPS);
      expect(t).toBeGreaterThan(0);
    }
  });

  it('「减半」每次更小,停在下界', () => {
    // ⚠️ `THETA_RANGE` 是 `as const`,直接赋给 let 会窄化成字面量 1.2。
    let t: number = THETA_RANGE.to;
    for (let i = 0; i < 12; i += 1) t = halveTheta(t);
    expect(t).toBeCloseTo(THETA_RANGE.from, 6);
  });

  it('取样都是有限值,且比值在 0 处为 null', () => {
    for (const p of sampleRatio(-0.6, 0.6)) {
      if (p.x === 0) expect(p.y).toBeNull();
      else expect(Number.isFinite(p.y!)).toBe(true);
    }
    for (const p of sampleCos(-0.6, 0.6)) expect(Number.isFinite(p.y)).toBe(true);
  });

  it('推导按顺序有三步,每一步都有一句为什么', () => {
    expect(STEPS).toHaveLength(3);
    for (const s of STEPS) {
      expect(s.tex.length).toBeGreaterThan(5);
      expect(s.note.length).toBeGreaterThan(10);
    }
    // 第二步必须提到"除以 sin θ 是正的",否则那一步就是变魔术
    expect(STEPS[1]!.note.toLowerCase()).toContain('positive');
    expect(STEPS[2]!.note.toLowerCase()).toContain('reciprocal');
  });
});
