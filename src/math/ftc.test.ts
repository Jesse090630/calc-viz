/**
 * 微积分基本定理的测试。
 *
 * 四件事:
 *   ① 解析原函数 与 自适应 Simpson,给出同一块面积;
 *   ② 细缝的平均增长率随 h → 0 收敛到 f(x) —— 而且是**一阶**的;
 *   ③ f 跳跃处,A 仍然连续、但不可导,而且单侧斜率正好是 f 的单侧值;
 *   ④ 第二部分对**任何**原函数成立(加常数不改变结果)。
 */
import { describe, expect, it } from 'vitest';
import {
  H_LADDER,
  INTEGRANDS,
  areaByAntiderivative,
  areaByQuadrature,
  areaJumpAt,
  clampX,
  definiteWithShiftedAntiderivative,
  derivativeExistsAt,
  integrandOf,
  oneSidedRates,
  rateLadder,
  sampleF,
  show,
  sliver,
} from './ftc';

const CONTINUOUS = INTEGRANDS.filter((f) => f.continuous);
const JUMPY = INTEGRANDS.filter((f) => !f.continuous);

describe('⭐ 手算对得上', () => {
  it('∫₀ˣ t dt = x²/2', () => {
    const f = integrandOf('line');
    for (const x of [0, 0.5, 1.7, 3]) expect(areaByAntiderivative(f, x)).toBeCloseTo((x * x) / 2, 12);
  });

  it('∫₀² (4 − t²) dt = 8 − 8/3 = 16/3', () => {
    expect(areaByAntiderivative(integrandOf('parabola'), 2)).toBeCloseTo(16 / 3, 12);
  });

  it('阶梯函数:∫₀^2.5 = 1 + 2.5 + 0.8·0.5 = 3.9', () => {
    expect(areaByAntiderivative(integrandOf('step'), 2.5)).toBeCloseTo(3.9, 12);
  });

  it('起点处面积是 0', () => {
    for (const f of INTEGRANDS) expect(areaByAntiderivative(f, f.a)).toBeCloseTo(0, 12);
  });
});

describe('⭐⭐ 两条独立路径必须一致', () => {
  it('连续的那几个:原函数 与 Simpson 一致', () => {
    let checked = 0;
    for (const f of CONTINUOUS) {
      for (let x = f.a + 0.1; x <= f.b; x += 0.1) {
        expect(areaByQuadrature(f, x), `${f.id} x=${x.toFixed(1)}`).toBeCloseTo(
          areaByAntiderivative(f, x), 8,
        );
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(60);   // 防空跑
  });

  it('⭐ 不连续的那个**明确拒绝**做 Simpson,返回 null 而不是一个像样的错数', () => {
    /**
     * ⚠️ 自适应积分靠"细分后两次估计是否接近"判停,而跳跃处这个判据会骗它。
     * 与其给一个看起来合理、实际不可信的数,不如说"这条路走不通"。
     */
    expect(JUMPY.length, '没有不连续的案例,这条就是空跑').toBeGreaterThan(0);
    for (const f of JUMPY) expect(areaByQuadrature(f, 2.5)).toBeNull();
  });
});

describe('⭐⭐ 细缝就是那个矩形', () => {
  /**
   * ⚠️ 第一版这里断言"gap 随 h 单调递减",`sin t + 1` 在 h = 0.1 处直接打脸。
   * **那不是 bug**,是我又一次没先问清楚这个量该是多少。展开一下就明白:
   *
   *     gap = [A(x+h) − A(x)]/h − f(x) = f′(x)·h/2 + f″(x)·h²/6 + …
   *
   * 主项是 `f′(x)·h/2`。而测试取的点是区间中点 x = 1.5,
   * 对 `sin t + 1` 来说 `f′(1.5) = cos(1.5) ≈ 0.0707` —— **几乎是零**。
   * 一阶项塌掉之后,二阶项在 h 还不够小时就能盖过它,gap 于是不单调。
   *
   * 所以要断言的是**收敛**(两端比较),不是**单调**。
   * 顺带说:这也是一个漂亮的事实 —— 在 f 的临界点附近,矩形估计出奇地准。
   */
  it('平均增长率随 h → 0 收敛到 f(x)(但**不保证单调**,理由见上)', () => {
    for (const f of CONTINUOUS) {
      const x = (f.a + f.b) / 2;
      const coarse = Math.abs(sliver(f, x, H_LADDER[0]!)!.gap);
      const fine = Math.abs(sliver(f, x, H_LADDER[H_LADDER.length - 1]!)!.gap);
      expect(coarse, `${f.id} 粗档就该看得见差`).toBeGreaterThan(0);
      expect(fine, `${f.id} 细档没有收下来`).toBeLessThan(coarse / 10);
      expect(fine, f.id).toBeLessThan(1e-2);
    }
  });

  it('⭐ gap 的主项确实是 f′(x)·h/2 —— 把展开式本身钉住', () => {
    // f(t) = t 时 f′ ≡ 1,gap 应当恰好是 h/2(更高阶项全为 0)
    const line = integrandOf('line');
    for (const h of [0.5, 0.1, 0.01]) {
      expect(sliver(line, 1.3, h)!.gap).toBeCloseTo(h / 2, 12);
    }
    // f(t) = 4 − t² 时 f′(x) = −2x,gap 应当恰好是 −x·h(二阶项也精确)
    const par = integrandOf('parabola');
    for (const h of [0.5, 0.1, 0.01]) {
      expect(sliver(par, 1.2, h)!.gap).toBeCloseTo(-1.2 * h - (h * h) / 3, 12);
    }
  });

  it('⭐ 而且是**一阶**的:h 减半,差也减半', () => {
    // ⚠️ 用前向细缝,所以是 O(h)。和链式法则那一课同一个理由:钉结构,不钉手感。
    for (const f of CONTINUOUS) {
      // ⚠️ 要在 f′ 明显非零的点上测 —— 临界点附近一阶项塌掉,阶数会变高(见上一条)
      const x = f.id === 'wave' ? 0.4 : (f.a + f.b) / 2;
      const e1 = Math.abs(sliver(f, x, 0.02)!.gap);
      const e2 = Math.abs(sliver(f, x, 0.01)!.gap);
      expect(e1, `${f.id} 在 h=0.02 就已经没有差了?`).toBeGreaterThan(0);
      expect(e1 / e2, `${f.id} 的收敛阶`).toBeGreaterThan(1.6);
      expect(e1 / e2, `${f.id} 的收敛阶`).toBeLessThan(2.4);
    }
  });

  it('⭐ f 是直线时,矩形估计**恰好**差半个三角形 —— 手算钉死', () => {
    // f(t) = t:细缝真实面积是梯形 = (x + h/2)·h,矩形估计是 x·h,差正好 h²/2
    const f = integrandOf('line');
    for (const h of [0.5, 0.1, 0.01]) {
      const s = sliver(f, 1.3, h)!;
      expect(s.exact - s.rectangle).toBeCloseTo((h * h) / 2, 12);
    }
  });

  it('细缝面积就是两个面积之差,不是另算的', () => {
    for (const f of INTEGRANDS) {
      const s = sliver(f, 1.4, 0.3)!;
      expect(s.exact).toBeCloseTo(
        areaByAntiderivative(f, 1.7) - areaByAntiderivative(f, 1.4), 12,
      );
    }
  });

  it('h = 0 时返回 null,不产生 0/0', () => {
    expect(sliver(INTEGRANDS[0]!, 1, 0)).toBeNull();
    expect(sliver(INTEGRANDS[0]!, 1, Number.NaN)).toBeNull();
  });
});

describe('⭐⭐ 跳跃处:A 连续,但有折角', () => {
  const f = integrandOf('step');

  it('跳跃点上导数不存在,别处都存在', () => {
    for (const j of f.jumps) expect(derivativeExistsAt(f, j), `x=${j}`).toBe(false);
    for (const x of [0.4, 1.5, 2.6]) expect(derivativeExistsAt(f, x), `x=${x}`).toBe(true);
  });

  it('⭐ 但 A 在那里仍然**连续** —— 面积不会瞬移', () => {
    for (const j of f.jumps) expect(areaJumpAt(f, j), `x=${j}`).toBeCloseTo(0, 6);
  });

  it('⭐ 单侧斜率正好是 f 的单侧值', () => {
    const at1 = oneSidedRates(f, 1)!;
    expect(at1.left).toBeCloseTo(1, 10);
    expect(at1.right).toBeCloseTo(2.5, 10);
    const at2 = oneSidedRates(f, 2)!;
    expect(at2.left).toBeCloseTo(2.5, 10);
    expect(at2.right).toBeCloseTo(0.8, 10);
  });

  it('⭐ 两侧确实不相等 —— 否则"折角"这话就是空的', () => {
    for (const j of f.jumps) {
      const r = oneSidedRates(f, j)!;
      expect(Math.abs(r.left - r.right), `x=${j}`).toBeGreaterThan(0.5);
    }
  });

  it('不在跳跃点上时 oneSidedRates 返回 null', () => {
    expect(oneSidedRates(f, 1.5)).toBeNull();
    expect(oneSidedRates(integrandOf('line'), 1)).toBeNull();
  });

  it('⭐ 连续的那几个,处处可导 —— 不许有人偷偷给它们塞跳跃点', () => {
    for (const g of CONTINUOUS) {
      expect(g.jumps).toEqual([]);
      for (const x of [0.3, 1.1, 2.2]) expect(derivativeExistsAt(g, x), g.id).toBe(true);
    }
  });

  it('⭐ 采样在跳跃处**断笔** —— 台阶不许被连成斜线', () => {
    const points = sampleF(f);
    const holes = points.filter((p) => p.y === null);
    expect(holes.length, '一个洞都没有,台阶被连过去了').toBeGreaterThanOrEqual(f.jumps.length);
    // 而连续的那几个一个洞都不该有
    for (const g of CONTINUOUS) {
      expect(sampleF(g).every((p) => p.y !== null), g.id).toBe(true);
    }
  });
});

describe('⭐⭐ 第二部分:换任何原函数都一样', () => {
  it('给原函数加上任意常数,定积分不变', () => {
    for (const f of INTEGRANDS) {
      const base = definiteWithShiftedAntiderivative(f, 0.4, 2.6, 0);
      for (const shift of [-100, -1.5, 0.7, 42]) {
        expect(definiteWithShiftedAntiderivative(f, 0.4, 2.6, shift), `${f.id} +${shift}`)
          .toBeCloseTo(base, 12);
      }
    }
  });

  it('而它就等于两端面积之差', () => {
    for (const f of INTEGRANDS) {
      expect(definiteWithShiftedAntiderivative(f, 0.4, 2.6, 3.3)).toBeCloseTo(
        areaByAntiderivative(f, 2.6) - areaByAntiderivative(f, 0.4), 12,
      );
    }
  });
});

describe('取值与边界', () => {
  it('clampX 夹在这个 f 自己的区间里', () => {
    const f = integrandOf('line');
    expect(clampX(f, -5)).toBe(f.a);
    expect(clampX(f, 99)).toBe(f.b);
    expect(clampX(f, Number.NaN)).toBe((f.a + f.b) / 2);
  });

  it('integrandOf 认不出的 id 回落到第一个', () => {
    expect(integrandOf('nope')).toBe(INTEGRANDS[0]);
  });

  it('show 对 NaN / null 都给 "undefined"', () => {
    expect(show(null)).toBe('undefined');
    expect(show(Number.NaN)).toBe('undefined');
    expect(show(2)).not.toBe('undefined');
  });

  it('rateLadder 每一档都算得出来', () => {
    for (const f of INTEGRANDS) {
      for (const rung of rateLadder(f, 1.4)) {
        expect(Number.isFinite(rung.rate), `${f.id} h=${rung.h}`).toBe(true);
      }
    }
  });
});

describe('⭐⭐ 在跳跃点上,前向细缝只看得见右边', () => {
  /**
   * ⚠️ 这一条是**看界面**发现的:在 x = 1(跳跃点)上,前向细缝的 rate 对每个 h
   * 都恰好是 2.5、gap 恒为 0 —— 屏幕上看起来"完美收敛",
   * 可同一页的另一块却写着"A 在这里不可导"。两者互相打架。
   *
   * 打架的原因不是算错,是**前向差商只探到右半边**。
   * 所以在跳跃点上,必须把左右两个方向都算出来、都显示出来,
   * 否则数字会替我们撒谎。
   */
  const f = integrandOf('step');

  it('右侧(h > 0)的 rate 是右极限 2.5', () => {
    for (const h of [0.5, 0.1, 0.01]) {
      expect(sliver(f, 1, h)!.rate, `h=${h}`).toBeCloseTo(2.5, 10);
    }
  });

  it('⭐ 左侧(h < 0)的 rate 是左极限 1 —— 和右边**不一样**', () => {
    for (const h of [-0.5, -0.1, -0.01]) {
      expect(sliver(f, 1, h)!.rate, `h=${h}`).toBeCloseTo(1, 10);
    }
  });

  it('⭐ 两侧不相等,正是"没有单一斜率"的意思', () => {
    const right = sliver(f, 1, 0.01)!.rate;
    const left = sliver(f, 1, -0.01)!.rate;
    expect(Math.abs(right - left)).toBeGreaterThan(1);
    expect(derivativeExistsAt(f, 1)).toBe(false);
  });

  it('⭐ 而在连续的地方,左右两侧收敛到同一个数', () => {
    for (const g of CONTINUOUS) {
      const x = 1.4;
      const r = sliver(g, x, 0.001)!.rate;
      const l = sliver(g, x, -0.001)!.rate;
      expect(Math.abs(r - l), g.id).toBeLessThan(1e-2);
      expect(derivativeExistsAt(g, x)).toBe(true);
    }
  });
});
