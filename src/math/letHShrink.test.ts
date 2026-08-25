/**
 * `letHShrink.ts` 的测试。
 *
 * ⭐⭐ 核心:**h = 0 时割线不存在**(返回 null),而化简式 `2a+h` 在 0 处有定义。
 * 两者只在 h ≠ 0 时相等 —— 那条缝就是"极限"要处理的东西。
 */
import { describe, it, expect } from 'vitest';
import {
  A_RANGE, EPS, H_LADDER, H_RANGE, TANGENT_THRESHOLD, VIEW,
  agreeAwayFromZero, algebraSteps, clampA, clampH, derivativeTex, f,
  isTangentish, limitTex, sampleCurve, secantLine, shrinkH, showNum,
  slopeByDifference, slopeGap, slopeSimplified, tangentLine, tangentSlope,
} from './letHShrink';

const AS = [-1.5, -0.5, 0, 0.5, 1, 1.5, 2];

describe('⭐⭐ h = 0 时割线不存在', () => {
  it('差商在 h = 0 处返回 null,不返回 NaN,也不返回 2a', () => {
    for (const a of AS) {
      expect(Number.isNaN((f(a + 0) - f(a)) / 0)).toBe(true); // 先证明这个坑存在
      expect(slopeByDifference(a, 0)).toBeNull();
      expect(slopeByDifference(a, 0)).not.toBe(2 * a);
      expect(showNum(slopeByDifference(a, 0))).toBe('undefined');
    }
  });

  it('割线本身也不存在', () => {
    for (const a of AS) expect(secantLine(a, 0)).toBeNull();
  });

  it('⭐ 但化简式在 h = 0 处**有**定义 —— 差异就在这里', () => {
    for (const a of AS) {
      expect(slopeSimplified(a, 0)).toBe(2 * a);
      expect(Number.isFinite(slopeSimplified(a, 0))).toBe(true);
      expect(slopeByDifference(a, 0)).toBeNull();
    }
  });

  it('h ≠ 0 时两条路径处处相等', () => {
    for (const a of AS) {
      for (let h = H_RANGE.from; h <= H_RANGE.to; h += 0.01) {
        expect(agreeAwayFromZero(a, Number(h.toFixed(4))), `a=${a} h=${h}`).toBe(true);
        expect(agreeAwayFromZero(a, -Number(h.toFixed(4)))).toBe(true);
      }
    }
  });
});

describe('⭐ 极限斜率', () => {
  it('tangentSlope 不接受 h —— 结论与走到多近无关', () => {
    expect(tangentSlope.length).toBe(1);
    for (const a of AS) expect(tangentSlope(a)).toBe(2 * a);
  });

  it('提示词钉死的那个:a = 1 时 f′(1) = 2', () => {
    expect(tangentSlope(1)).toBe(2);
    expect(derivativeTex(1)).toBe("f'(1) = 2");
    expect(limitTex(1)).toContain('= 2');
  });

  it('割线斜率与切线斜率之差**正好是 h**', () => {
    for (const a of AS) {
      for (const h of H_LADDER) expect(slopeGap(a, h)).toBeCloseTo(h, 10);
    }
  });

  it('h 越小,割线斜率越接近极限值', () => {
    for (const a of AS) {
      let previous = Number.POSITIVE_INFINITY;
      for (const h of H_LADDER) {
        const d = Math.abs(slopeByDifference(a, h)! - tangentSlope(a));
        expect(d).toBeLessThan(previous);
        previous = d;
      }
    }
  });

  it('切线过 P,而且斜率对', () => {
    for (const a of AS) {
      const t = tangentLine(a);
      expect(t.at(a)).toBeCloseTo(f(a), 12);
      expect(t.slope).toBe(2 * a);
    }
  });

  it('割线过 P 与 Q', () => {
    for (const a of AS) {
      for (const h of H_LADDER) {
        const s = secantLine(a, h)!;
        expect(s.at(a)).toBeCloseTo(f(a), 10);
        expect(s.at(a + h)).toBeCloseTo(f(a + h), 10);
      }
    }
  });
});

describe('拖动', () => {
  it('h 永远为正,而且到不了 0', () => {
    for (const v of [-9, 0, 0.001, 5, Number.NaN]) {
      const h = clampH(v);
      expect(h).toBeGreaterThan(0);
      expect(h).toBeGreaterThanOrEqual(H_RANGE.from - EPS);
      expect(h).toBeLessThanOrEqual(H_RANGE.to + EPS);
    }
  });

  it('「再小一点」逐档收缩,到最小停住', () => {
    let h = H_LADDER[0]!;
    const seen = [h];
    for (let i = 0; i < 8; i += 1) { h = shrinkH(h); seen.push(h); }
    for (let i = 1; i < seen.length; i += 1) expect(seen[i]!).toBeLessThanOrEqual(seen[i - 1]! + EPS);
    expect(seen[seen.length - 1]!).toBeCloseTo(H_LADDER[H_LADDER.length - 1]!, 6);
    expect(seen[seen.length - 1]!).toBeGreaterThan(0);
  });

  it('a 夹在范围内', () => {
    for (const v of [-99, 0, 99, Number.NaN]) {
      const a = clampA(v);
      expect(a).toBeGreaterThanOrEqual(A_RANGE.from - EPS);
      expect(a).toBeLessThanOrEqual(A_RANGE.to + EPS);
    }
  });

  it('⚠️ 最小的 h 必须小到触发 TANGENT 标签 —— 否则那次切换永远看不到', () => {
    expect(isTangentish(H_LADDER[H_LADDER.length - 1]!)).toBe(true);
    expect(isTangentish(H_LADDER[0]!)).toBe(false);
    expect(TANGENT_THRESHOLD).toBeGreaterThan(H_RANGE.from);
  });
});

describe('代数与取样', () => {
  it('三步,而且第三步必须说明"只有 h ≠ 0 才能约分"', () => {
    const steps = algebraSteps(1);
    expect(steps).toHaveLength(3);
    expect(steps[2]!.note).toContain('h ≠ 0');
  });

  it('代数跟着 a 走', () => {
    expect(algebraSteps(1)[2]!.tex).toBe('2 + h');
    expect(algebraSteps(1.5)[2]!.tex).toBe('3 + h');
  });

  it('曲线取样都是有限值', () => {
    for (const p of sampleCurve()) {
      expect(Number.isFinite(p.y)).toBe(true);
      expect(p.x).toBeGreaterThanOrEqual(VIEW.from - EPS);
    }
  });
});
