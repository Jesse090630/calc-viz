/**
 * 分部积分的测试。
 *
 * 这一课的论点是「选错 u 不是错的,是没用的」,所以测试的重心就在这:
 *   ① 恒等式对**两种选法都成立**(这是论点的前半句);
 *   ② 但只有一种让剩下的积分变简单(后半句),而且"简单"是**量**出来的;
 *   ③ 闭形式与直接数值积分一致。
 */
import { describe, expect, it } from 'vitest';
import {
  CASES,
  betterChoice,
  byPartsFormula,
  byQuadrature,
  caseOf,
  degreeAfter,
  integrand,
  isProgress,
  originalDegree,
  roundsNeeded,
  show,
  split,
  type Case,
  type ChoiceId,
  type Factor,
} from './byParts';

const CHOICES: readonly ChoiceId[] = ['first', 'second'];

describe('⭐ 手算对得上', () => {
  it('∫₀¹ x·eˣ dx = 1', () => {
    expect(byQuadrature(caseOf('x-times-exp'))).toBeCloseTo(1, 9);
  });

  it('∫₀^π x·sin x dx = π', () => {
    expect(byQuadrature(caseOf('x-times-sin'))).toBeCloseTo(Math.PI, 9);
  });

  it('∫₁^e ln x dx = 1', () => {
    expect(byQuadrature(caseOf('ln-alone'))).toBeCloseTo(1, 9);
  });

  it('∫₀¹ x²eˣ dx = e − 2', () => {
    expect(byQuadrature(caseOf('x2-times-exp'))).toBeCloseTo(Math.E - 2, 9);
  });
});

describe('⭐⭐ 恒等式对两种选法**都**成立 —— 论点的前半句', () => {
  /**
   * 这是整节课最要紧的一条。课本让人背 LIATE,好像选错就"做错了"。
   * 其实分部积分对哪种选法都是恒等式;错的从来不是等号,是**收益**。
   */
  it('每个案例、每种选法,闭形式都等于直接数值积分', () => {
    let checked = 0;
    for (const c of CASES) {
      const truth = byQuadrature(c);
      for (const choice of CHOICES) {
        expect(byPartsFormula(c, choice), `${c.id} / ${choice}`).toBeCloseTo(truth, 7);
        checked += 1;
      }
    }
    expect(checked).toBe(CASES.length * 2);   // 防空跑
  });

  it('⭐ 而且两种选法给出的**中间量**确实不同 —— 否则"两种选法"是假的', () => {
    for (const c of CASES) {
      const a = split(c, 'first');
      const b = split(c, 'second');
      // 边界项与剩余积分各自不同,只是差值相同
      const sameBoundary = Math.abs(a.boundary - b.boundary) < 1e-9;
      const sameRemaining = Math.abs(a.remaining - b.remaining) < 1e-9;
      expect(sameBoundary && sameRemaining, `${c.id} 两种选法算出来一模一样`).toBe(false);
    }
  });
});

describe('⭐⭐ 但只有一种让积分变简单 —— 论点的后半句', () => {
  it('⭐ ∫x·eˣ:选 x 当 u 次数降到 0,选 eˣ 当 u 次数升到 2', () => {
    const c = caseOf('x-times-exp');
    expect(originalDegree(c)).toBe(1);
    expect(split(c, 'first').remainingDegree).toBe(0);    // u = x
    expect(split(c, 'second').remainingDegree).toBe(2);   // u = eˣ
    expect(isProgress(c, 'first')).toBe(true);
    expect(isProgress(c, 'second')).toBe(false);
    expect(betterChoice(c)).toBe('first');
  });

  it('⭐ ∫x·sin x 同理', () => {
    const c = caseOf('x-times-sin');
    expect(betterChoice(c)).toBe('first');
    expect(split(c, 'first').remainingDegree).toBe(0);
    expect(split(c, 'second').remainingDegree).toBe(2);
  });

  it('⭐ x² 那个要做**两轮** —— 次数就是轮数', () => {
    const c = caseOf('x2-times-exp');
    expect(originalDegree(c)).toBe(2);
    expect(roundsNeeded(c)).toBe(2);
    expect(split(c, 'first').remainingDegree).toBe(1);   // 降了 1,还没完
  });

  it('degreeAfter:u 求导降一次,dv 积分升一次', () => {
    const c = caseOf('x-times-exp');
    expect(degreeAfter(c.left, c.right)).toBe(0);   // u = x  → 1 − 1
    expect(degreeAfter(c.right, c.left)).toBe(2);   // u = eˣ → x 被积,1 + 1
  });

  it('次数不会降到负数', () => {
    const c = caseOf('ln-alone');
    // u = 1 时 u′ = 0,次数最低就是 0
    expect(split(c, 'second').remainingDegree).toBeGreaterThanOrEqual(0);
  });
});

describe('⭐ ∫ln x:两个因子都不是多项式的那一种', () => {
  const c = caseOf('ln-alone');

  it('原式没有多项式因子…等一下,1 是零次多项式', () => {
    // ⚠️ 把 1 当作因子,它的次数是 0 —— 这正是"凑一个 dv = dx"的写法
    expect(c.right.degree).toBe(0);
    expect(originalDegree(c)).toBe(0);
  });

  it('选 ln x 当 u,剩下的是 ∫1 dx 那一类 —— 确实能做完', () => {
    const s = split(c, 'first');
    expect(byPartsFormula(c, 'first')).toBeCloseTo(1, 8);
    // u′v = (1/x)·x = 1,所以剩余积分就是区间长度
    expect(s.remaining).toBeCloseTo(c.b - c.a, 8);
  });

  it('⭐ betterChoice 在两种都不推进时诚实地返回 null', () => {
    // 次数已经是 0,降不下去了;这个案例靠的是 u′v 恰好化简,而不是降次
    expect(betterChoice(c)).toBeNull();
  });
});

describe('⭐ 每个案例的因子设置都自洽', () => {
  it('每个 Factor 的 F 确实是它的原函数(数值验一遍)', () => {
    const eps = 1e-6;
    for (const c of CASES) {
      for (const f of [c.left, c.right]) {
        const at = (c.a + c.b) / 2;
        const numeric = (f.F(at + eps) - f.F(at - eps)) / (2 * eps);
        expect(numeric, `${c.id}/${f.id} 的 F 不是 f 的原函数`).toBeCloseTo(f.at(at), 5);
      }
    }
  });

  it('每个 Factor 的 d 确实是它的导数', () => {
    const eps = 1e-6;
    for (const c of CASES) {
      for (const f of [c.left, c.right]) {
        const at = (c.a + c.b) / 2;
        const numeric = (f.at(at + eps) - f.at(at - eps)) / (2 * eps);
        expect(numeric, `${c.id}/${f.id} 的 d 不是它的导数`).toBeCloseTo(f.d(at), 5);
      }
    }
  });

  it('被积函数就是两个因子的乘积', () => {
    for (const c of CASES) {
      const at = (c.a + c.b) / 2;
      expect(integrand(c)(at)).toBeCloseTo(c.left.at(at) * c.right.at(at), 12);
    }
  });

  it('⭐ 至多一个因子是多项式 —— degreeAfter 的推理依赖这一点', () => {
    for (const c of CASES) {
      const polys = [c.left, c.right].filter((f) => f.degree !== null);
      expect(polys.length, `${c.id} 有两个多项式因子,degreeAfter 的假设就破了`).toBeLessThanOrEqual(1);
    }
  });
});

describe('取值与边界', () => {
  it('caseOf 认不出的 id 回落到第一个', () => {
    expect(caseOf('nope')).toBe(CASES[0]);
  });

  it('show 对 NaN / null 给 "undefined"', () => {
    expect(show(null)).toBe('undefined');
    expect(show(Number.NaN)).toBe('undefined');
    expect(show(3)).not.toBe('undefined');
  });
});

describe('⭐⭐ 次数按定义相加,不靠分支顺序', () => {
  /**
   * ⚠️ 变异测试抓出来的:第一版 `degreeAfter` / `originalDegree` 写成两个先后的 `if`,
   * "两支互换"这个变异**活了下来** —— 因为现有案例里至多一个因子是多项式,
   * 另一支永远不执行。那是靠不变量**侥幸**成立,不是写对了。
   *
   * 现在按定义相加。下面用一个**两边都是多项式**的合成案例把它钉住 ——
   * 这正是分支顺序会露馅、而现有案例覆盖不到的地方。
   */
  const P1: Factor = { id: 'p1', tex: 'x', at: (t) => t, d: () => 1, F: (t) => (t * t) / 2, degree: 1 };
  const P2: Factor = { id: 'p2', tex: 'x^2', at: (t) => t * t, d: (t) => 2 * t, F: (t) => (t ** 3) / 3, degree: 2 };

  it('两边都是多项式时,原式次数是两者之和', () => {
    const both: Case = {
      id: 'both-poly', left: P1, right: P2, a: 0, b: 1,
      integrandTex: 'x\\cdot x^2', exactTex: '',
    };
    expect(originalDegree(both)).toBe(3);
  });

  it('⭐ 两边都是多项式时,分部积分**根本降不了总次数** —— 所以那时它没有用', () => {
    /**
     * ⚠️ 写这条时我先在注释里断言"两种顺序会给出不同答案",然后自己的断言
     * 又都写着 3 —— 注释和代码打架。真相是**都等于 3**,而且这不是巧合:
     *     deg(u′v) = (deg u − 1) + (deg dv + 1) = deg u + deg dv
     * 总次数与选法无关,恒等于原式的次数。
     * 换句话说:两个多项式相乘时,分部积分怎么选都推不动 ——
     * 那种题就该直接乘开,不该用分部积分。**这本身就是一条值得讲的结论。**
     */
    expect(degreeAfter(P1, P2)).toBe(3);
    expect(degreeAfter(P2, P1)).toBe(3);
    const both: Case = { id: 'bp', left: P1, right: P2, a: 0, b: 1, integrandTex: '', exactTex: '' };
    expect(degreeAfter(P1, P2)).toBe(originalDegree(both));   // 一点没降
    // 只有一个多项式时,退化成原来的行为
    const nonPoly: Factor = { id: 'e', tex: 'e^x', at: Math.exp, d: Math.exp, F: Math.exp, degree: null };
    expect(degreeAfter(P1, nonPoly)).toBe(0);
    expect(degreeAfter(nonPoly, P1)).toBe(2);
  });

  it('两边都不是多项式时仍然是 null', () => {
    const e: Factor = { id: 'e', tex: 'e^x', at: Math.exp, d: Math.exp, F: Math.exp, degree: null };
    const s: Factor = { id: 's', tex: '\\sin x', at: Math.sin, d: Math.cos, F: (t) => -Math.cos(t), degree: null };
    expect(degreeAfter(e, s)).toBeNull();
  });
});
