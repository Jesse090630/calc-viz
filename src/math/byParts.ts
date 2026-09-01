/**
 * MATH — 分部积分:`∫ₐᵇ u·v′ = [u·v]ₐᵇ − ∫ₐᵇ u′·v`。
 *
 * ⭐⭐ 它不是一条新规则,是**乘积法则被积分之后挪了个位置**:
 *
 *     (uv)′ = u′v + uv′          ← 乘积法则
 *     [uv]ₐᵇ = ∫u′v + ∫uv′       ← 两边积分
 *     ∫uv′ = [uv]ₐᵇ − ∫u′v       ← 挪一项过去
 *
 *   所以"分部积分"这四个字底下没有任何新东西。
 *
 * ⭐⭐ **这一课真正的论点**:选错 u **不是错的,是没用的**。
 *
 *   课本通常给一句 "LIATE" 让人背。可事实是:两种选法**都满足那条恒等式** ——
 *   分部积分对哪一种选法都成立。区别只在于换来的新积分是**更简单**还是**更难**。
 *   对 `∫x·eˣ`:选 `u = x`,剩下 `∫eˣ`(次数 1 → 0,做完了);
 *              选 `u = eˣ`,剩下 `∫(x²/2)eˣ`(次数 1 → 2,更糟了)。
 *   两条路都合法,一条通向答案,一条通向更深的坑。
 *   **把两条都算给学生看,比让他背一个首字母缩写有用。**
 *
 * ⭐ 两条互不相干的路径算同一个定积分:
 *   ① `byPartsFormula` —— 用分部积分的闭形式,一次求值;
 *   ② `byQuadrature`   —— 自适应 Simpson 直接积原式,完全不知道分部积分这回事。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import { showNumber } from './format';
import { adaptiveSimpson } from './quadrature';

/* ══ 因子 ══════════════════════════════════════════════════════════ */

export interface Factor {
  readonly id: string;
  readonly tex: string;
  readonly at: (t: number) => number;
  /** 导数 */
  readonly d: (t: number) => number;
  /** 一个原函数 */
  readonly F: (t: number) => number;
  /**
   * 多项式次数;非多项式(eˣ、sin、ln)记 `null`。
   * ⚠️ 这是用来**客观衡量"新积分变简单了还是变难了"**的,不是装饰:
   *    多项式因子的次数降了 = 离做完更近一步。
   */
  readonly degree: number | null;
}

const X: Factor = { id: 'x', tex: 'x', at: (t) => t, d: () => 1, F: (t) => (t * t) / 2, degree: 1 };
const X2: Factor = { id: 'x2', tex: 'x^2', at: (t) => t * t, d: (t) => 2 * t, F: (t) => (t ** 3) / 3, degree: 2 };
const EXP: Factor = { id: 'exp', tex: 'e^{x}', at: Math.exp, d: Math.exp, F: Math.exp, degree: null };
const SIN: Factor = { id: 'sin', tex: '\\sin x', at: Math.sin, d: Math.cos, F: (t) => -Math.cos(t), degree: null };
const LN: Factor = {
  id: 'ln', tex: '\\ln x', at: Math.log, d: (t) => 1 / t, F: (t) => t * Math.log(t) - t, degree: null,
};
const ONE: Factor = { id: 'one', tex: '1', at: () => 1, d: () => 0, F: (t) => t, degree: 0 };

/* ══ 案例 ══════════════════════════════════════════════════════════ */

export type ChoiceId = 'first' | 'second';

export interface Case {
  readonly id: string;
  /** 被积式的两个因子,原式就是它们的乘积 */
  readonly left: Factor;
  readonly right: Factor;
  readonly a: number;
  readonly b: number;
  readonly integrandTex: string;
  /** 手算的答案,写在这里当锚 */
  readonly exactTex: string;
}

export const CASES: readonly Case[] = [
  {
    id: 'x-times-exp',
    left: X, right: EXP, a: 0, b: 1,
    integrandTex: 'x\\,e^{x}',
    exactTex: '\\left[e^{x}(x-1)\\right]_0^1 = 1',
  },
  {
    id: 'x-times-sin',
    left: X, right: SIN, a: 0, b: Math.PI,
    integrandTex: 'x\\,\\sin x',
    exactTex: '\\left[\\sin x - x\\cos x\\right]_0^{\\pi} = \\pi',
  },
  {
    /** ⚠️ 只有"一个"因子的经典случай:把 1 当作另一个因子。 */
    id: 'ln-alone',
    left: LN, right: ONE, a: 1, b: Math.E,
    integrandTex: '\\ln x',
    exactTex: '\\left[x\\ln x - x\\right]_1^{e} = 1',
  },
  {
    /** ⚠️ 要做**两轮**才收尾 —— 次数 2 → 1 → 0。 */
    id: 'x2-times-exp',
    left: X2, right: EXP, a: 0, b: 1,
    integrandTex: 'x^{2}e^{x}',
    exactTex: '\\left[e^{x}(x^{2}-2x+2)\\right]_0^1 = e-2',
  },
] as const;

export function caseOf(id: string): Case {
  return CASES.find((c) => c.id === id) ?? CASES[0]!;
}

/** 原被积函数:两个因子相乘。 */
export function integrand(c: Case): (x: number) => number {
  return (x) => c.left.at(x) * c.right.at(x);
}

/* ══ 一次分部 ══════════════════════════════════════════════════════ */

export interface Split {
  readonly choice: ChoiceId;
  /** 被选作 u 的那个 */
  readonly u: Factor;
  /** 另一个,它充当 v′ */
  readonly dv: Factor;
  /** v = ∫dv */
  readonly vAt: (t: number) => number;
  /** 边界项 `[u·v]ₐᵇ` */
  readonly boundary: number;
  /** 剩下那个积分 `∫ₐᵇ u′v` 的值 */
  readonly remaining: number;
  /** 剩下那个被积函数 */
  readonly remainingAt: (t: number) => number;
  /**
   * 剩下那个被积函数里多项式因子的次数(没有多项式因子时 null)。
   * ⚠️ 这是"变简单了还是变难了"的**客观**度量。
   */
  readonly remainingDegree: number | null;
}

/** 按某种选法做一次分部。 */
export function split(c: Case, choice: ChoiceId): Split {
  const u = choice === 'first' ? c.left : c.right;
  const dv = choice === 'first' ? c.right : c.left;
  const vAt = dv.F;
  const boundary = u.at(c.b) * vAt(c.b) - u.at(c.a) * vAt(c.a);
  const remainingAt = (t: number) => u.d(t) * vAt(t);
  return {
    choice,
    u,
    dv,
    vAt,
    boundary,
    remaining: adaptiveSimpson(remainingAt, c.a, c.b, 1e-11),
    remainingAt,
    // u 求导让多项式次数降 1;dv 积分让它升 1。两者作用在不同因子上。
    remainingDegree: degreeAfter(u, dv),
  };
}

/**
 * 一次分部之后,剩下那个被积函数里的多项式次数。
 *
 * `∫u′v`:u 被求导(多项式次数 −1),dv 被积分(多项式次数 +1)。
 * ⚠️ 两个因子里至多有一个是多项式,所以这里不会两边同时变。
 */
export function degreeAfter(u: Factor, dv: Factor): number | null {
  /**
   * ⚠️ 第一版写成两个先后的 `if`,于是"两支互换"这个变异**活了下来** ——
   * 因为现有案例里至多有一个因子是多项式,另一支永远不执行,顺序看不出来。
   * 那是"靠不变量侥幸成立",不是"写对了":哪天有人加一个两边都是多项式的案例,
   * 结果就取决于分支顺序,而没有任何东西会报警。
   *
   * 现在按定义算,顺序无关紧要:`u′v` 里 u 被求导(次数 −1)、v 是 dv 的原函数
   * (次数 +1),两个次数**相加**。只有一个多项式时,另一个记作 0,退化成原来的行为。
   */
  if (u.degree === null && dv.degree === null) return null;
  const fromU = u.degree === null ? 0 : Math.max(u.degree - 1, 0);
  const fromV = dv.degree === null ? 0 : dv.degree + 1;
  return fromU + fromV;
}

/**
 * ⭐⭐ 恒等式对**两种选法都成立** —— 这才是这一课的论点。
 * 返回 `[uv]ₐᵇ − ∫u′v`,它必须等于原积分,无论选哪个当 u。
 */
export function byPartsFormula(c: Case, choice: ChoiceId): number {
  const s = split(c, choice);
  return s.boundary - s.remaining;
}

/** 路径 ② —— 直接数值积原式,完全不知道分部积分这回事。 */
export function byQuadrature(c: Case): number {
  return adaptiveSimpson(integrand(c), c.a, c.b, 1e-11);
}

/* ══ 哪种选法有用 ═════════════════════════════════════════════════ */

/**
 * ⭐ 这种选法把问题**推进**了吗?
 *
 * 判据不是"背 LIATE",是一件可以量的事:剩下那个积分里的多项式次数
 * 比原来**低**,就是推进了;更高,就是退步了。
 */
export function isProgress(c: Case, choice: ChoiceId): boolean {
  const before = originalDegree(c);
  const after = split(c, choice).remainingDegree;
  if (before === null || after === null) return before === null && after === null;
  return after < before;
}

/** 原被积式里的多项式次数。 */
export function originalDegree(c: Case): number | null {
  // ⚠️ 同上:按定义相加,不靠分支顺序。乘积的次数就是两个次数之和。
  if (c.left.degree === null && c.right.degree === null) return null;
  return (c.left.degree ?? 0) + (c.right.degree ?? 0);
}

/** ⭐ 有用的那种选法。两种都不推进时返回 null(比如 ∫ln x 那种)。 */
export function betterChoice(c: Case): ChoiceId | null {
  const first = isProgress(c, 'first');
  const second = isProgress(c, 'second');
  if (first === second) return null;
  return first ? 'first' : 'second';
}

/** 还要再做几轮才收尾 —— 多项式次数就是轮数。 */
export function roundsNeeded(c: Case): number {
  return originalDegree(c) ?? 1;
}

/* ══ 取值与显示 ═══════════════════════════════════════════════════ */

export function show(value: number | null, places = 6): string {
  return value === null || !Number.isFinite(value) ? 'undefined' : showNumber(value, places);
}

export const HEADLINE = 'The Product Rule, Rearranged';
export const MAIN_IDEA =
  'Both choices of u are legal. Only one of them leaves an easier integral.';

export const DERIVATION_TEX = [
  "(uv)' = u'v + uv'",
  "[uv]_a^b = \\int_a^b u'v + \\int_a^b uv'",
  "\\int_a^b uv' = [uv]_a^b - \\int_a^b u'v",
] as const;

export const RULE_TEX = "\\int_a^b u\\,v' = \\left[uv\\right]_a^b - \\int_a^b u'\\,v";

export const NO_PROGRESS_NOTE =
  'This choice is not wrong — the identity still holds exactly. It just hands back a harder integral than the one you started with, so it gets you nowhere.';
