/**
 * u-换元的测试。
 *
 * 三件事:
 *   ① 换元 + 原函数,与**完全不换元**的数值积分,给出同一个数;
 *   ② 忘了乘 `g′(x)` 确实算出**另一个**数(否则这一课没得讲);
 *   ③ 竖条的宽度换算倍率确实趋于 `g′` —— 这是 `du = g′dx` 的实质。
 */
import { describe, expect, it } from 'vitest';
import {
  CASES,
  SLICE_LADDER,
  byQuadrature,
  bySubstitution,
  caseOf,
  clampSliceCount,
  integrand,
  integrandWithoutJacobian,
  isUsable,
  jacobianGap,
  limitsCollapse,
  limitsFor,
  show,
  riemannInU,
  riemannInX,
  slices,
  widthMismatch,
  widthIsExact,
  withoutJacobian,
  type Case,
} from './substitution';

/* ── 手算的锚 ───────────────────────────────────────────────────────
 * ∫₀^1.2 cos(x²)·2x dx.  u = x²,du = 2x dx,上下限 0 → 1.44。
 * = ∫₀^1.44 cos u du = sin(1.44) − sin(0) = sin(1.44) = 0.99145835…
 */
describe('⭐ 手算对得上', () => {
  it('∫₀^1.2 cos(x²)·2x dx = sin(1.44)', () => {
    expect(bySubstitution(caseOf('cos-of-square'))).toBeCloseTo(Math.sin(1.44), 12);
  });

  it('换元后的上下限确实是 g(a) → g(b)', () => {
    const { uLow, uHigh } = limitsFor(caseOf('cos-of-square'));
    expect(uLow).toBe(0);
    expect(uHigh).toBeCloseTo(1.44, 12);
  });

  it('∫₀^1 √(3x+1)·3 dx = (2/3)(4^{3/2} − 1) = 14/3', () => {
    expect(bySubstitution(caseOf('root-of-affine'))).toBeCloseTo(14 / 3, 10);
  });

  it('∫₀^1.3 sin²x·cos x dx = sin³(1.3)/3', () => {
    expect(bySubstitution(caseOf('square-of-sine'))).toBeCloseTo(Math.sin(1.3) ** 3 / 3, 12);
  });
});

describe('⭐⭐ 两条独立路径必须一致', () => {
  /**
   * 路径 ① 换元 + 原函数(一次求值);路径 ② 在 x 上做自适应 Simpson,
   * 从头到尾不知道有换元这回事。两者一致 = 对换元法的真实数值检验。
   */
  it('每个案例都一致', () => {
    for (const c of CASES) {
      expect(isUsable(c), `${c.id} 本身就算不动`).toBe(true);
      expect(byQuadrature(c), c.id).toBeCloseTo(bySubstitution(c), 8);
    }
  });
});

describe('⭐⭐ 忘了乘 g′(x) 会算出另一块面积', () => {
  it('每个案例里,漏掉的那个式子确实给出不同的数', () => {
    let checked = 0;
    for (const c of CASES) {
      const right = bySubstitution(c);
      const wrong = withoutJacobian(c);
      // 掉头那个案例正确值是 0,单独判
      if (right === 0) {
        expect(wrong, `${c.id} 漏掉 g′ 之后居然还是 0`).not.toBeCloseTo(0, 6);
      } else {
        expect(wrong, c.id).not.toBeCloseTo(right, 6);
      }
      checked += 1;
    }
    expect(checked).toBe(CASES.length);
  });

  it('⭐ 两个被积函数本身在区间内部就已经不同 —— 差别不是端点效应', () => {
    const c = caseOf('cos-of-square');
    const withJ = integrand(c);
    const withoutJ = integrandWithoutJacobian(c);
    // ⚠️ 在 x = 0 处 g′ = 0,两者恰好都是 0,所以要取内部的点
    for (const x of [0.3, 0.6, 0.9, 1.1]) {
      expect(withJ(x)).not.toBeCloseTo(withoutJ(x), 6);
    }
  });

  it('⭐ jacobianGap 永远有定义 —— 它是差,不是比值', () => {
    /**
     * ⚠️ 第一版给它加了个 `right === 0 → null` 的守卫,是条件反射式的照搬:
     * 这里根本没有除法。而且在掉头案例上还判错了边 —— `sin(π)` 是 1.22e-16,
     * 不是 0,`=== 0` 压根不成立。**别为不存在的除法设防。**
     */
    for (const c of CASES) expect(Number.isFinite(jacobianGap(c)), c.id).toBe(true);
    // 掉头案例的正确值 ≈ 0,所以差就等于那个错答案本身
    const turning = caseOf('turning-back');
    expect(jacobianGap(turning)).toBeCloseTo(withoutJacobian(turning), 8);
  });
});

describe('⭐⭐ du = g′dx 的实质:宽度换算', () => {
  /**
   * 每条竖条在 x 上宽 Δx,映到 u 上宽 Δu。
   * "实际倍率 Δu/Δx" 就是 g 的割线斜率;我们拿它和**中点处**的 g′ 比。
   *
   * ⚠️ 第一版这里断言"条数翻倍、偏差减半",结果 `cos(x²)` 那个案例在 n = 4 时
   * 偏差就已经是 1e-15 —— **没有东西可以收敛**。那不是 bug,是一个我没料到的事实:
   *     对至多二次的 g,割线斜率**恒等于**中点导数。
   *     (x₁² − x₀²)/(x₁ − x₀) = x₀ + x₁ = 2·中点 = g′(中点)
   * 所以线性(3x+1)和二次(x²)的内层,宽度换算是**精确**的,一条误差都没有;
   * 只有 sin 这种超越函数才有真正的二阶误差。
   *
   * 教训还是同一条:**先问这个量到底该是多少,再写断言**,
   * 不要把"应该会收敛"当成默认。
   */
  it('⭐ 线性与二次的内层:宽度换算是**精确**的', () => {
    const exact = CASES.filter(widthIsExact);
    expect(exact.length, '没有可用的精确案例,下面就是空跑').toBeGreaterThan(0);
    for (const c of exact) {
      for (const n of SLICE_LADDER) {
        expect(widthMismatch(c, n), `${c.id} n=${n}`).toBeLessThan(1e-12);
      }
    }
  });

  it('⭐ 而超越内层(sin)是**二阶**的:条数翻倍,偏差落到四分之一附近', () => {
    const curved = CASES.filter((c) => !widthIsExact(c));
    expect(curved.length, '没有可用的弯曲案例,下面就是空跑').toBeGreaterThan(0);
    for (const c of curved) {
      const e1 = widthMismatch(c, 32);
      const e2 = widthMismatch(c, 64);
      expect(e1, `${c.id} 在 n=32 就已经没有误差了?`).toBeGreaterThan(0);
      expect(e1 / e2, `${c.id} 的收敛阶`).toBeGreaterThan(3);
      expect(e1 / e2, `${c.id} 的收敛阶`).toBeLessThan(5);
    }
  });

  it('不管哪种内层,条数够多之后偏差都必须很小', () => {
    for (const c of CASES) expect(widthMismatch(c, 128), c.id).toBeLessThan(1e-3);
  });

  it('每条的宽度加起来正好是整段区间', () => {
    for (const c of CASES) {
      const total = slices(c, 16).reduce((sum, s) => sum + s.dx, 0);
      expect(total, c.id).toBeCloseTo(c.b - c.a, 12);
    }
  });

  it('u 上每条的有向宽度加起来,正好是换元后的总跨度', () => {
    for (const c of CASES) {
      const total = slices(c, 16).reduce((sum, s) => sum + s.du, 0);
      const { uLow, uHigh } = limitsFor(c);
      expect(total, c.id).toBeCloseTo(uHigh - uLow, 10);
    }
  });
});

describe('⭐⭐ 掉头的那个案例', () => {
  const c = caseOf('turning-back');

  it('上下限换完之后重合', () => {
    expect(limitsCollapse(c)).toBe(true);
    const { uLow, uHigh } = limitsFor(c);
    // ⚠️ 数学上 sin(0) = sin(π) = 0,但浮点里 sin(π) 是 1.22e-16 —— 不能用 ===
    expect(uLow).toBeCloseTo(uHigh, 12);
    expect(uHigh).not.toBe(0);
  });

  it('所以换元后的积分正好是 0', () => {
    expect(bySubstitution(c)).toBeCloseTo(0, 12);
    expect(byQuadrature(c)).toBeCloseTo(0, 8);
  });

  it('⭐ 但曲线**不是**恒为 0 —— 是正负相消,不是什么都没发生', () => {
    const f = integrand(c);
    expect(f(0.5)).toBeGreaterThan(0);      // 上山段
    expect(f(Math.PI - 0.5)).toBeLessThan(0); // 下山段
  });

  /**
   * ⚠️ 变异测试抓出来的洞:把容差从 `1e-12` 放松到 `1e-1`,原来那几条断言**照样全绿** ——
   * 因为所有"没重合"的案例,上下限差得都远大于 0.1×尺度,松到那个地步也还判得对。
   *
   * 而这个谓词真正要分清的是两件很接近的事:
   *   · 数学上相等、只差浮点噪声(`sin π` = 1.22e-16)—— 算重合;
   *   · 一个**真的很小但确实存在**的区间 —— 不算重合。
   * 不把后者摆出来,容差写多松都测不出来。
   */
  it('⭐ 一个真的很小、但确实存在的区间,不能被判成"重合"', () => {
    const tiny: Case = {
      ...caseOf('cos-of-square'),
      id: 'tiny-but-real',
      // g(x) = x²:a = 1、b = 1 + 1e-6 → 上下限差约 2e-6,尺度约 1。
      // 这是一个货真价实的小区间,不是浮点噪声。
      a: 1,
      b: 1 + 1e-6,
    };
    const { uLow, uHigh } = limitsFor(tiny);
    expect(Math.abs(uHigh - uLow)).toBeGreaterThan(1e-7);   // 确实非零
    expect(Math.abs(uHigh - uLow)).toBeLessThan(1e-4);      // 而且确实很小
    expect(limitsCollapse(tiny), '容差太松,把小区间也当成重合了').toBe(false);
  });

  it('⭐ 而它是唯一一个上下限重合的案例 —— 其余不许悄悄退化', () => {
    const collapsed = CASES.filter(limitsCollapse).map((x) => x.id);
    expect(collapsed).toEqual(['turning-back']);
  });
});

describe('取值与边界', () => {
  it('slices 对非法条数返回空数组,不抛也不产生 NaN', () => {
    expect(slices(CASES[0]!, 0)).toEqual([]);
    expect(slices(CASES[0]!, -3)).toEqual([]);
    expect(slices(CASES[0]!, 2.5)).toEqual([]);
  });

  it('clampSliceCount 挡住非有限值并夹在范围内', () => {
    expect(clampSliceCount(Number.NaN)).toBe(8);
    expect(clampSliceCount(0)).toBe(1);
    expect(clampSliceCount(9999)).toBe(256);
  });

  it('caseOf 认不出的 id 回落到第一个', () => {
    expect(caseOf('nope')).toBe(CASES[0]);
  });

  it('show(null) 是 "undefined" 这四个字', () => {
    expect(show(null)).toBe('undefined');
    expect(show(1.5)).not.toBe('undefined');
  });
});

describe('⭐⭐ 两张图画的是同一块面积 —— 这一课的落点', () => {
  it('条数够多时,x 上的和 与 u 上的和 互相吻合', () => {
    for (const c of CASES) {
      expect(riemannInU(c, 256), c.id).toBeCloseTo(riemannInX(c, 256), 4);
    }
  });

  it('两者都收敛到那个定积分', () => {
    for (const c of CASES) {
      expect(riemannInX(c, 512), `${c.id} x`).toBeCloseTo(bySubstitution(c), 5);
      expect(riemannInU(c, 512), `${c.id} u`).toBeCloseTo(bySubstitution(c), 5);
    }
  });

  it('⭐ 条数越多,两张图的差越小 —— 差不是恒为 0,是**收敛到** 0', () => {
    /**
     * ⚠️ 不能只断言"最后很接近":那样把 `riemannInU` 写成直接返回 `riemannInX`
     * 也一样绿。要断言的是它们**本来不同、随条数变细而靠拢**。
     */
    const c = caseOf('square-of-sine');            // 内层弯曲,两张图确实不同
    const coarse = Math.abs(riemannInU(c, 4) - riemannInX(c, 4));
    const fine = Math.abs(riemannInU(c, 64) - riemannInX(c, 64));
    expect(coarse, '粗分时两张图就该有可见的差').toBeGreaterThan(1e-6);
    expect(fine).toBeLessThan(coarse / 10);
  });
});
