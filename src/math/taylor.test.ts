/**
 * ⚠️ 期望值不从被测模块里取。锚点是**手算得出的数**和**另外一条推理**:
 *
 *   · `1/(1−x)` 在 x = 2 的部分和是 1, 3, 7, 15, … = 2ⁿ⁺¹ − 1,而真值是 −1;
 *   · `e` = 2.718281828…,`ln 2` = 0.693147180…,`sin(π/6)` = 1/2;
 *   · 系数另用 **Cauchy 积分公式**求一遍 —— 它只认识 f,不认识通项。
 */
import { describe, expect, it } from 'vitest';
import {
  SERIES,
  alternatingBound,
  cAbs,
  cDiv,
  cExp,
  cLog,
  cMul,
  cSin,
  clampX,
  coeffCauchy,
  coeffClosed,
  converges,
  cx,
  lagrangeBound,
  partialSum,
  partialSumTrail,
  sampleF,
  sampleSn,
  seriesOf,
  taylorApplies,
  show,
  trueError,
  verdictAt,
} from './taylor';

const geo = seriesOf('geometric');
const exp = seriesOf('exp');
const sin = seriesOf('sin');
const ln1p = seriesOf('ln1p');

describe('复数够不够用', () => {
  it('e^{iπ} = −1', () => {
    const v = cExp(cx(0, Math.PI));
    expect(v.re).toBeCloseTo(-1, 12);
    expect(v.im).toBeCloseTo(0, 12);
  });

  it('sin 在实轴上就是普通的 sin', () => {
    for (const t of [-2, -0.4, 0, 0.7, 3.1]) {
      expect(cSin(cx(t)).re).toBeCloseTo(Math.sin(t), 12);
      expect(cSin(cx(t)).im).toBeCloseTo(0, 12);
    }
  });

  it('log 在正实轴上就是普通的 ln', () => {
    for (const t of [0.3, 1, 2.5]) {
      expect(cLog(cx(t)).re).toBeCloseTo(Math.log(t), 12);
      expect(cLog(cx(t)).im).toBeCloseTo(0, 12);
    }
  });

  it('除法是乘法的逆', () => {
    const a = cx(1.7, -0.9);
    const b = cx(-0.4, 2.2);
    const q = cDiv(a, b);
    const back = cMul(q, b);
    expect(back.re).toBeCloseTo(a.re, 12);
    expect(back.im).toBeCloseTo(a.im, 12);
  });

  it('模长', () => {
    expect(cAbs(cx(3, 4))).toBeCloseTo(5, 12);
  });
});

describe('⭐⭐ 两条路径求同一批系数', () => {
  it('闭式通项和 Cauchy 积分一致', () => {
    for (const s of SERIES) {
      for (let k = 0; k <= 8; k += 1) {
        expect(coeffCauchy(s, k), `${s.id} 的 a${k}`).toBeCloseTo(coeffClosed(s, k), 6);
      }
    }
  });

  it('⭐ 而 Cauchy 那条路**只认识 f** —— 换个积分半径,答案不变', () => {
    for (const r of [0.3, 0.5, 0.7]) {
      for (let k = 0; k <= 6; k += 1) {
        expect(coeffCauchy(geo, k, r)).toBeCloseTo(1, 6);
      }
    }
  });

  it('手写的几个系数就是课本上的样子', () => {
    expect(coeffClosed(geo, 0)).toBe(1);
    expect(coeffClosed(geo, 5)).toBe(1);
    expect(coeffClosed(exp, 0)).toBe(1);
    expect(coeffClosed(exp, 1)).toBe(1);
    expect(coeffClosed(exp, 2)).toBeCloseTo(0.5, 12);
    expect(coeffClosed(exp, 3)).toBeCloseTo(1 / 6, 12);
    // sin:偶次项全为 0,奇次项 +1/1!, −1/3!, +1/5! …
    expect(coeffClosed(sin, 0)).toBe(0);
    expect(coeffClosed(sin, 2)).toBe(0);
    expect(coeffClosed(sin, 1)).toBeCloseTo(1, 12);
    expect(coeffClosed(sin, 3)).toBeCloseTo(-1 / 6, 12);
    expect(coeffClosed(sin, 5)).toBeCloseTo(1 / 120, 12);
    // ln(1+x):0, 1, −1/2, 1/3, −1/4 …
    expect(coeffClosed(ln1p, 0)).toBe(0);
    expect(coeffClosed(ln1p, 1)).toBeCloseTo(1, 12);
    expect(coeffClosed(ln1p, 2)).toBeCloseTo(-0.5, 12);
    expect(coeffClosed(ln1p, 3)).toBeCloseTo(1 / 3, 12);
  });
});

describe('部分和', () => {
  it('⭐ 几何级数在 x = 2 处的部分和是 2ⁿ⁺¹ − 1 —— 手算得出来', () => {
    for (let n = 0; n <= 8; n += 1) {
      expect(partialSum(geo, n, 2)).toBeCloseTo(2 ** (n + 1) - 1, 9);
    }
  });

  it('级数在收敛区间里确实逼近函数', () => {
    expect(partialSum(exp, 20, 1)).toBeCloseTo(Math.E, 10);
    expect(partialSum(sin, 21, Math.PI / 6)).toBeCloseTo(0.5, 12);
    expect(partialSum(ln1p, 400, 1)).toBeCloseTo(Math.LN2, 2);
    expect(partialSum(geo, 60, 0.5)).toBeCloseTo(2, 12);
  });

  it('trail 的最后一项就是 partialSum', () => {
    for (const s of SERIES) {
      const t = partialSumTrail(s, 0.4, 7);
      expect(t).toHaveLength(8);
      expect(t[7]).toBeCloseTo(partialSum(s, 7, 0.4), 12);
    }
  });
});

describe('⭐⭐⭐ 反例:收敛半径以外,越加越远', () => {
  it('几何级数在 x = 2:真值是 −1,而部分和一路飞走', () => {
    expect(geo.f(2)).toBeCloseTo(-1, 12);
    const trail = partialSumTrail(geo, 2, 10);
    expect(trail[0]).toBe(1);
    expect(trail[1]).toBe(3);
    expect(trail[2]).toBe(7);
    expect(trail[10]).toBeCloseTo(2047, 9);
  });

  it('⭐ 误差**单调递增**,而且每加一项翻一倍 —— 不是"慢一点",是反着走', () => {
    let grew = 0;
    for (let n = 0; n <= 9; n += 1) {
      const e0 = trueError(geo, n, 2)!;
      const e1 = trueError(geo, n + 1, 2)!;
      expect(e1).toBeGreaterThan(e0);
      expect(e1 / e0).toBeCloseTo(2, 6);
      grew += 1;
    }
    expect(grew, '循环空转了').toBe(10);
  });

  it('⭐ 而在半径**以内**,同一个级数误差单调递减', () => {
    let shrank = 0;
    for (let n = 0; n <= 12; n += 1) {
      expect(trueError(geo, n + 1, 0.5)!).toBeLessThan(trueError(geo, n, 0.5)!);
      shrank += 1;
    }
    expect(shrank).toBe(13);
  });

  it('⭐ 反例点必须**在滑块范围之内** —— 够不着就是死界面', () => {
    expect(geo.xRange[1]).toBeGreaterThan(geo.radius);
    expect(verdictAt(geo, geo.xRange[1])).toBe('outside');
    // 而默认落点已经在外面了,一打开就看得到
    expect(verdictAt(geo, geo.startX)).toBe('outside');
  });
});

describe('收敛判定 —— 端点是单独一问', () => {
  it('半径以内 / 以外', () => {
    expect(verdictAt(geo, 0.5)).toBe('inside');
    expect(verdictAt(geo, 1.5)).toBe('outside');
    expect(verdictAt(exp, 100)).toBe('inside');       // R = ∞
    expect(verdictAt(sin, -50)).toBe('inside');
  });

  it('⭐⭐ 同一个级数,两个端点可以一个收敛一个发散', () => {
    expect(verdictAt(ln1p, 1)).toBe('endpoint-converges');
    expect(verdictAt(ln1p, -1)).toBe('endpoint-diverges');
    expect(converges(ln1p, 1)).toBe(true);
    expect(converges(ln1p, -1)).toBe(false);
  });

  it('几何级数两个端点都发散', () => {
    expect(verdictAt(geo, 1)).toBe('endpoint-diverges');
    expect(verdictAt(geo, -1)).toBe('endpoint-diverges');
  });

  it('⭐ 而右端点确实收敛到 ln 2 —— 不是随口说的', () => {
    expect(partialSum(ln1p, 2000, 1)).toBeCloseTo(Math.LN2, 3);
  });

  it('⭐ 四个判定结果**每一个都出现过**,没有死分支', () => {
    const seen = new Set<string>();
    for (const s of SERIES) {
      for (const x of [0, 0.5, 1, -1, 1.5, -1.5, 3]) seen.add(verdictAt(s, x));
    }
    expect([...seen].sort()).toEqual(
      ['endpoint-converges', 'endpoint-diverges', 'inside', 'outside'],
    );
  });
});

describe('⭐⭐ Lagrange 上界必须**罩得住**真实误差', () => {
  it('收敛区间内,上界 ≥ 误差,一次都不许被穿过', () => {
    let checked = 0;
    for (const s of SERIES) {
      const probes = s.id === 'geometric' ? [0.2, 0.5, 0.8]
        : s.id === 'ln1p' ? [0.2, 0.5, 0.9]
          : [0.5, 1.5, 3];
      for (const x of probes) {
        for (let n = 0; n <= 9; n += 1) {
          const e = trueError(s, n, x);
          const b = lagrangeBound(s, n, x);
          if (e === null || b === null) continue;
          expect(b, `${s.id} n=${n} x=${x} 上界被穿了`).toBeGreaterThanOrEqual(e - 1e-12);
          checked += 1;
        }
      }
    }
    expect(checked, '循环空转了').toBeGreaterThan(80);
  });

  it('⭐ 但它只是上界,不是误差 —— 松是正常的', () => {
    // e^x 在 x = 3、n = 4 处,上界应当明显大于真实误差
    const e = trueError(exp, 4, 3)!;
    const b = lagrangeBound(exp, 4, 3)!;
    expect(b).toBeGreaterThan(e);
    expect(b / e).toBeGreaterThan(1.5);
  });

  it('n 变大时上界趋于 0(在收敛区间内)', () => {
    expect(lagrangeBound(exp, 20, 1)!).toBeLessThan(lagrangeBound(exp, 5, 1)!);
    expect(lagrangeBound(exp, 20, 1)!).toBeLessThan(1e-10);
  });

  it('x = 0 处上界就是 0', () => {
    for (const s of SERIES) expect(lagrangeBound(s, 3, 0)).toBeCloseTo(0, 12);
  });
});

describe('⭐ 交错级数的上界 = 下一项', () => {
  it('sin 与 ln(1+x) 有,几何级数与 eˣ 没有', () => {
    expect(alternatingBound(sin, 5, 1)).not.toBeNull();
    expect(alternatingBound(ln1p, 5, 0.5)).not.toBeNull();
    expect(alternatingBound(geo, 5, 0.5)).toBeNull();
    expect(alternatingBound(exp, 5, 0.5)).toBeNull();
  });

  it('⭐⭐ 它也必须罩得住真实误差', () => {
    let checked = 0;
    for (const [s, xs] of [[sin, [0.6, 1.4, 2.5]], [ln1p, [0.3, 0.7, 0.95]]] as const) {
      for (const x of xs) {
        for (let n = 1; n <= 9; n += 1) {
          const b = alternatingBound(s, n, x);
          if (b === null) continue;
          expect(b).toBeGreaterThanOrEqual(trueError(s, n, x)! - 1e-12);
          checked += 1;
        }
      }
    }
    expect(checked, '循环空转了').toBeGreaterThan(30);
  });

  it('⭐ 前提不成立就返回 null —— 不硬给数', () => {
    // 发散点上不给界
    expect(alternatingBound(ln1p, 4, 1.8)).toBeNull();
    // 项还在变大的时候也不给界
    expect(alternatingBound(sin, 1, 9)).toBeNull();
  });

  it('⭐ 而"不给界"这条分支是真的会走到的,不是摆设', () => {
    let nulls = 0;
    for (let n = 0; n <= 12; n += 1) if (alternatingBound(sin, n, 9) === null) nulls += 1;
    expect(nulls).toBeGreaterThan(0);
  });
});

describe('画图用的量', () => {
  it('取样都是有限值', () => {
    for (const s of SERIES) {
      for (const p of sampleF(s)) expect(Number.isFinite(p.y)).toBe(true);
      for (const p of sampleSn(s, 6)) expect(Number.isFinite(p.y)).toBe(true);
    }
  });

  it('⭐ 几何级数的样本会跳过 x = 1 那个奇点,不返回 Infinity', () => {
    const pts = sampleF(geo);
    for (const p of pts) expect(Math.abs(p.y)).toBeLessThan(1e15);
  });

  it('clampX 夹在自己的范围里', () => {
    expect(clampX(geo, 99)).toBe(geo.xRange[1]);
    expect(clampX(geo, -99)).toBe(geo.xRange[0]);
    expect(clampX(geo, Number.NaN)).toBe(geo.startX);
  });

  it('每个级数都有半径的**理由**,而且默认点在范围内', () => {
    for (const s of SERIES) {
      expect(s.why.length).toBeGreaterThan(40);
      expect(s.startX).toBeGreaterThanOrEqual(s.xRange[0]);
      expect(s.startX).toBeLessThanOrEqual(s.xRange[1]);
    }
  });

  it('⭐ 有限半径的级数,滑块必须能拖到半径**以外**', () => {
    for (const s of SERIES) {
      if (!Number.isFinite(s.radius)) continue;
      expect(Math.max(Math.abs(s.xRange[0]), s.xRange[1])).toBeGreaterThan(s.radius);
    }
  });

  it('show 不吐 NaN', () => {
    expect(show(null)).toBe('undefined');
    expect(show(Number.NaN)).toBe('undefined');
    expect(show(Number.POSITIVE_INFINITY)).toBe('undefined');
  });
});

describe('⚠️ 变异测试逼出来的三条:光"是个上界"证明不了它是**对的**那个上界', () => {
  /**
   * ⚠️ 这三个变异体都活了下来,原因一样:它们把界**放大**或**换成另一个也成立的界**。
   *   "上界 ≥ 误差"照样满足,于是所有不等式断言全绿。
   *   ⭐ 治法只有一个:**钉住确切的数**,不要只验不等号。
   */

  it('⭐ Lagrange 上界的**确切值** —— 手算对照', () => {
    // eˣ,n = 3,x = 1:max|f⁽⁴⁾| = e,|x|⁴ = 1,4! = 24 ⇒ e/24
    expect(lagrangeBound(exp, 3, 1)!).toBeCloseTo(Math.E / 24, 12);
    // sin,n = 4,x = 1:导数上界 1,1⁵/5! = 1/120
    expect(lagrangeBound(sin, 4, 1)!).toBeCloseTo(1 / 120, 12);
    // 1/(1−x),n = 2,x = 0.5:3!/(0.5)⁴ = 96,乘 0.5³/3! ⇒ 2
    expect(lagrangeBound(geo, 2, 0.5)!).toBeCloseTo(2, 12);
    // ln(1+x),n = 3,x = 0.5:3!/1⁴ = 6,乘 0.5⁴/4! ⇒ 0.015625
    expect(lagrangeBound(ln1p, 3, 0.5)!).toBeCloseTo(0.015625, 12);
  });

  it('⭐ 交错上界的**确切值** —— 必须是"下一个非零项",不是当前项', () => {
    // sin 在 x = 1:n = 3 之后的下一个非零项是 x⁵/5! = 1/120
    expect(alternatingBound(sin, 3, 1)!).toBeCloseTo(1 / 120, 12);
    // n = 4 时下一个非零项还是 5 次那一项 —— 偶数次是 0,要跳过去
    expect(alternatingBound(sin, 4, 1)!).toBeCloseTo(1 / 120, 12);
    // ⭐ 而当前项(3 次)是 1/6,差了二十倍 —— 取错了这里就会露馅
    expect(alternatingBound(sin, 3, 1)!).not.toBeCloseTo(1 / 6, 6);
    // ln(1+x) 在 x = 0.5:n = 3 之后是 x⁴/4 = 0.015625
    expect(alternatingBound(ln1p, 3, 0.5)!).toBeCloseTo(0.015625, 12);
  });

  it('⭐⭐ 发散点上不给界 —— 哪怕那里的项**恰好还在变小**', () => {
    /**
     * ⚠️ 变异体"不验收敛"活了下来,因为我原来挑的发散点(x = 1.8)项已经在变大,
     *   单调判据顺手就把它拦了 —— 收敛判据有没有都一样。
     *   x = 1.05 才是真正能分辨的点:**它在半径以外(发散),可项还在变小。**
     *   这时只有收敛判据救得了它。
     */
    expect(verdictAt(ln1p, 1.05)).toBe('outside');
    // 项确实还在变小,单调判据拦不住
    const t4 = Math.abs(ln1p.coeff(4) * 1.05 ** 4);
    const t5 = Math.abs(ln1p.coeff(5) * 1.05 ** 5);
    expect(t5).toBeLessThan(t4);
    // 所以必须靠"发散"这一条把它挡下来
    expect(alternatingBound(ln1p, 3, 1.05)).toBeNull();
  });
});

describe('⚠️ 截图逼出来的两条', () => {
  it('⭐ 纵轴上限按各自量级给,不是一个魔数', () => {
    for (const s of SERIES) {
      expect(s.yCap).toBeGreaterThan(0);
      // 能把 x = 0 附近的函数值装下 —— 否则一打开就是空的
      expect(Math.abs(s.f(0))).toBeLessThan(s.yCap);
      expect(Math.abs(s.f(s.radius === 1 ? 0.5 : 1))).toBeLessThan(s.yCap);
    }
  });

  it('⭐⭐ 几何级数一打开就停在 x = 2 —— 反例不该藏起来', () => {
    expect(geo.startX).toBe(2);
    expect(verdictAt(geo, geo.startX)).toBe('outside');
    // 而且那里每加一项误差正好翻倍,这是最好记的一句
    expect(trueError(geo, 6, geo.startX)! / trueError(geo, 5, geo.startX)!).toBeCloseTo(2, 9);
  });
});

describe('⭐⭐⭐ 截图逼出来的数学错误:定理不适用的地方,不许给"上界"', () => {
  /**
   * ⚠️ 在 x = 2 处,`1/(1−x)` 的 Lagrange"上界"算出来是 32,而真实误差**也**是 32,
   *   屏幕上于是写着「✓ 上界成立」—— 看起来一切正常。
   *   可 Taylor 定理要求 f 在 0 与 x 之间处处可导,而 x = 1 处它根本没定义。
   *   **定理压根不适用**,那个 32 是个没有意义的巧合。
   *   一个不适用的定理给出碰巧相等的数,比给出错的数更危险。
   */
  it('0 与 x 之间夹着奇点时,定理不适用', () => {
    expect(taylorApplies(geo, 0.5)).toBe(true);
    expect(taylorApplies(geo, 1)).toBe(false);        // 奇点就在端点上
    expect(taylorApplies(geo, 2)).toBe(false);
    expect(taylorApplies(geo, -3)).toBe(true);        // 往左走碰不到 x = 1
    expect(taylorApplies(ln1p, 0.9)).toBe(true);
    expect(taylorApplies(ln1p, -1)).toBe(false);
    expect(taylorApplies(ln1p, -1.4)).toBe(false);
    expect(taylorApplies(ln1p, 2)).toBe(true);        // 右边一路光滑
  });

  it('⭐ 处处光滑的函数,任何 x 都适用', () => {
    for (const x of [-40, -1, 0, 1, 40]) {
      expect(taylorApplies(exp, x)).toBe(true);
      expect(taylorApplies(sin, x)).toBe(true);
    }
  });

  it('⭐⭐ 于是那里 lagrangeBound 必须是 null,不是 32', () => {
    expect(lagrangeBound(geo, 4, 2)).toBeNull();
    expect(lagrangeBound(geo, 4, 1.5)).toBeNull();
    expect(lagrangeBound(ln1p, 4, -1.2)).toBeNull();
    // 而适用的地方照旧给数
    expect(lagrangeBound(geo, 4, 0.5)).not.toBeNull();
  });

  it('⭐ 那个"碰巧相等"确实存在过 —— 记下来,免得有人觉得这条改动多余', () => {
    // 旧版会算出 max|f⁽⁵⁾| = 5!/|1−2|⁶ = 120,乘 2⁵/5! 正好是 32
    const oldBound = (120 * 2 ** 5) / 120;
    expect(oldBound).toBe(32);
    expect(trueError(geo, 4, 2)).toBeCloseTo(32, 9);   // 误差也是 32
  });

  it('⭐ 而这条分支是**走得到**的 —— 默认落点就在那儿', () => {
    expect(taylorApplies(geo, geo.startX)).toBe(false);
  });
});
