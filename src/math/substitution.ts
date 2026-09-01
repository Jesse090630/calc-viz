/**
 * MATH — u-换元:`∫ f(g(x))·g′(x) dx = F(g(x)) + C`。
 *
 * ⭐⭐ 这一课要回答的是学生真正卡住的那一个问题:**那个 `g′(x)` 是从哪冒出来的?**
 *   (换个说法:「为什么 `du = g′(x) dx`,而不是 `du = dx`?」)
 *
 * 答案不是"规定",是**宽度换算**:
 *   把变量从 x 换成 u,每一条竖条的**宽度也跟着变了**。
 *   x 上宽 `Δx` 的一条,映到 u 上宽 `Δu ≈ g′(x)·Δx`。
 *   所以要让两边算出同一块面积,被积函数上必须补一个 `g′(x)` —— 它不是装饰,是**换算因子**。
 *   忘了它,你积的就是**另一块面积**(而且这一课把那块面积的数字直接摆出来)。
 *
 * ⭐ 这就是链式法则倒过来读:`d/dx F(g(x)) = f(g(x))·g′(x)`。
 *   换元不是新规则,是同一条规则换个方向用。
 *
 * ⭐ 两条互不相干的路径算同一个定积分:
 *   ① `bySubstitution` —— 换元 + 原函数,`F(g(b)) − F(g(a))`,一次求值,没有任何数值积分;
 *   ② `byQuadrature`   —— **完全不换元**,直接对 `f(g(x))·g′(x)` 在 x 上做自适应 Simpson。
 *   ② 从头到尾不知道有换元这回事,所以两者一致是对换元法的真实检验。
 *
 * ⚠️ 一个真实的陷阱,这一课必须显示而不是回避:
 *   换元之后积分**上下限也要换**(`a → g(a)`,`b → g(b)`)。
 *   如果 `g` 在区间上不单调,`g(a)` 与 `g(b)` 可能相等甚至掉头 ——
 *   这时"u 上的那块面积"必须按**有向**积分理解,不能当成几何面积。
 *   `limitsFor` 把换后的上下限原样给出来,`limitsCollapse` 标出它们相等的情形。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import { showNumber } from './format';
import { adaptiveSimpson } from './quadrature';
import type { Fn } from './chainRule';

/* ══ 被积的组合 ════════════════════════════════════════════════════ */

/** 外层需要**原函数**,所以比 `chainRule.Fn` 多一个 `F`。 */
export interface OuterFn extends Fn {
  /** f 的一个原函数 */
  readonly F: (t: number) => number;
}

export interface Case {
  readonly id: string;
  /** 内层 u = g(x) */
  readonly inner: Fn;
  /** 外层 f(u) */
  readonly outer: OuterFn;
  /** 积分区间 */
  readonly a: number;
  readonly b: number;
  /** 被积式写成 TeX(x 的语言) */
  readonly integrandTex: string;
  /** 换元之后的样子(u 的语言) */
  readonly substitutedTex: string;
}

const SQUARE_INNER: Fn = { id: 'x2', label: 'x²', tex: 'x^2', at: (t) => t * t, d: (t) => 2 * t };
const AFFINE_INNER: Fn = { id: '3x1', label: '3x + 1', tex: '3x+1', at: (t) => 3 * t + 1, d: () => 3 };
const SIN_INNER: Fn = { id: 'sinx', label: 'sin x', tex: '\\sin x', at: Math.sin, d: Math.cos };

const COS_OUTER: OuterFn = {
  id: 'cos', label: 'cos u', tex: '\\cos u',
  at: Math.cos, d: (t) => -Math.sin(t), F: Math.sin,
};
const SQ_OUTER: OuterFn = {
  id: 'u2', label: 'u²', tex: 'u^2',
  at: (t) => t * t, d: (t) => 2 * t, F: (t) => (t * t * t) / 3,
};
const ROOT_OUTER: OuterFn = {
  id: 'sqrtu', label: '√u', tex: '\\sqrt{u}',
  at: Math.sqrt, d: (t) => 1 / (2 * Math.sqrt(t)), F: (t) => (2 / 3) * Math.pow(t, 1.5),
};

export const CASES: readonly Case[] = [
  {
    id: 'cos-of-square',
    inner: SQUARE_INNER,
    outer: COS_OUTER,
    a: 0,
    b: 1.2,
    integrandTex: '\\cos(x^2)\\cdot 2x',
    substitutedTex: '\\cos u',
  },
  {
    id: 'root-of-affine',
    inner: AFFINE_INNER,
    outer: ROOT_OUTER,
    a: 0,
    b: 1,
    integrandTex: '\\sqrt{3x+1}\\cdot 3',
    substitutedTex: '\\sqrt{u}',
  },
  {
    id: 'square-of-sine',
    inner: SIN_INNER,
    outer: SQ_OUTER,
    a: 0,
    b: 1.3,
    integrandTex: '\\sin^2 x\\cdot\\cos x',
    substitutedTex: 'u^2',
  },
  {
    /**
     * ⚠️ 特意放的**掉头**案例:g = sin x 在 [0, π] 上先升后降,`g(0) = g(π) = 0`。
     * 换元之后上下限**重合**,u 上的积分是 0 —— 而 x 上那条曲线明明有起伏。
     * 这不是错,是"有向积分"的真面目:正负相消。不摆出来,学生只会背"换上下限"。
     */
    id: 'turning-back',
    inner: SIN_INNER,
    outer: SQ_OUTER,
    a: 0,
    b: Math.PI,
    integrandTex: '\\sin^2 x\\cdot\\cos x',
    substitutedTex: 'u^2',
  },
] as const;

export function caseOf(id: string): Case {
  return CASES.find((c) => c.id === id) ?? CASES[0]!;
}

/** 被积函数本身(x 的语言):`f(g(x))·g′(x)`。 */
export function integrand(c: Case): (x: number) => number {
  return (x) => c.outer.at(c.inner.at(x)) * c.inner.d(x);
}

/** ⭐ **忘了乘 g′(x)** 的那个式子 —— 学生最常写错的一步。 */
export function integrandWithoutJacobian(c: Case): (x: number) => number {
  return (x) => c.outer.at(c.inner.at(x));
}

/* ══ 换元之后的上下限 ═════════════════════════════════════════════ */

export interface Limits {
  readonly uLow: number;
  readonly uHigh: number;
}

/** ⚠️ 原样给出,**不排序**。换元后的上下限本来就可能是 uHigh < uLow。 */
export function limitsFor(c: Case): Limits {
  return { uLow: c.inner.at(c.a), uHigh: c.inner.at(c.b) };
}

/**
 * 上下限换完之后重合了吗 —— 掉头案例要靠它把话说出来。
 *
 * ⚠️ 不能用 `===`。`sin(π)` 在浮点里是 `1.2246e-16`,不是 0 ——
 * 数学上 `g(0) = g(π)` 千真万确,而严格相等在机器里根本不成立。
 * 判据必须相对于这一段 u 的**尺度**来定,不能拿绝对零去卡。
 */
export function limitsCollapse(c: Case): boolean {
  const { uLow, uHigh } = limitsFor(c);
  // 用 g 在区间上的振幅当尺度:上下限之差比它小上十几个数量级,才叫重合
  const scale = Math.max(
    Math.abs(uLow),
    Math.abs(uHigh),
    Math.abs(c.inner.at((c.a + c.b) / 2)),
    1,
  );
  return Math.abs(uHigh - uLow) <= 1e-12 * scale;
}

/* ══ 两条独立路径 ══════════════════════════════════════════════════ */

/** 路径 ① —— 换元 + 原函数。⚠️ 一次求值,不做任何数值积分。 */
export function bySubstitution(c: Case): number {
  const { uLow, uHigh } = limitsFor(c);
  return c.outer.F(uHigh) - c.outer.F(uLow);
}

/**
 * 路径 ② —— **完全不换元**,直接在 x 上做自适应 Simpson。
 * 它不知道有换元这回事,所以与 ① 一致是对换元法的真实检验。
 */
export function byQuadrature(c: Case): number {
  return adaptiveSimpson(integrand(c), c.a, c.b, 1e-11);
}

/** 忘了 `g′(x)` 时算出来的那个(错的)数。 */
export function withoutJacobian(c: Case): number {
  return adaptiveSimpson(integrandWithoutJacobian(c), c.a, c.b, 1e-11);
}

/**
 * 忘了乘 `g′` 会差多少(**差**,不是比值)。
 *
 * ⚠️ 第一版这里写了个 `right === 0 ? null : …` 的守卫 —— 是错的:
 * 这个函数里**根本没有除法**,差永远有定义。那个守卫是从别处照搬来的条件反射,
 * 而且在掉头案例上还因为浮点(`sin π ≠ 0`)判错了边。**别为不存在的除法设防。**
 */
export function jacobianGap(c: Case): number {
  return withoutJacobian(c) - bySubstitution(c);
}

/* ══ 一条一条的竖条:宽度是怎么换算的 ═════════════════════════════ */

export interface Slice {
  readonly index: number;
  /** x 上这一条的左右端 */
  readonly x0: number;
  readonly x1: number;
  /** 映到 u 上的左右端 */
  readonly u0: number;
  readonly u1: number;
  /** x 上的宽 */
  readonly dx: number;
  /** u 上的宽(有向:g 递减时是负的) */
  readonly du: number;
  /** 宽度换算的**实际**倍率 Δu/Δx */
  readonly ratio: number;
  /** 中点处的 g′ —— 极限里那个换算因子 */
  readonly jacobian: number;
}

export function slices(c: Case, n: number): readonly Slice[] {
  if (!Number.isInteger(n) || n < 1) return [];
  const dx = (c.b - c.a) / n;
  return Array.from({ length: n }, (_, i) => {
    const x0 = c.a + i * dx;
    const x1 = x0 + dx;
    const u0 = c.inner.at(x0);
    const u1 = c.inner.at(x1);
    const du = u1 - u0;
    return {
      index: i,
      x0, x1, u0, u1, dx, du,
      ratio: du / dx,
      // 中点法:和全站其他地方一致(见 AGENTS.md 第 2 节)
      jacobian: c.inner.d(x0 + dx / 2),
    };
  });
}

/**
 * ⭐⭐ 这一课的支点:**每条竖条的宽度换算倍率,趋于中点处的 `g′`**。
 * 也就是说 `du = g′(x)dx` 不是记号游戏,是宽度真的按这个比例变。
 * 返回所有条里"实际倍率 vs g′"的最大偏差 —— 条数越多,它必须越小。
 */
export function widthMismatch(c: Case, n: number): number {
  return slices(c, n).reduce((worst, s) => Math.max(worst, Math.abs(s.ratio - s.jacobian)), 0);
}

/* ══ 两张图各自的面积 —— 这一课的落点 ═════════════════════════════ */

/**
 * ⭐⭐ **两张图画的是同一块面积**,这是整节课的落点,必须能读出数字来。
 *
 * 在 x 上:每条高 `f(g(x))·g′(x)`、宽 `Δx`;
 * 在 u 上:每条高 `f(u)`、宽 `Δu`。
 * 两者逐条相等(到 `Δu = g′Δx` 的精度为止),所以总和也相等 ——
 * 这正是「换元合法」的全部内容。
 *
 * ⚠️ 两个都用**中点**取高,和全站其他地方一致(AGENTS.md 第 2 节)。
 */
export function riemannInX(c: Case, n: number): number {
  const f = integrand(c);
  return slices(c, n).reduce((sum, s) => sum + f((s.x0 + s.x1) / 2) * s.dx, 0);
}

/** 同一批条,改用 u 上的高与**有向**宽度。 */
export function riemannInU(c: Case, n: number): number {
  return slices(c, n).reduce((sum, s) => sum + c.outer.at((s.u0 + s.u1) / 2) * s.du, 0);
}

/**
 * ⭐ 宽度换算什么时候是**精确**的?
 *
 * `Δu/Δx` 是 g 在这一条上的割线斜率;而我们拿来比的是**中点处**的 `g′`。
 * 对**至多二次**的 g,这两者恒等 —— 割线斜率 = 中点导数,是恒等式不是近似:
 *   g(x) = x² 时,(x₁² − x₀²)/(x₁ − x₀) = x₀ + x₁ = 2·中点 = g′(中点)。
 * 所以线性和二次的内层,偏差恒为 0(到浮点为止);
 * 只有更高次或超越函数(如 sin)才有真正的 O(Δx²) 误差。
 *
 * ⚠️ 这也是「中点法」在全站被反复选用的同一个理由(见 AGENTS.md 第 2 节)。
 */
export function widthIsExact(c: Case): boolean {
  return c.inner.id === '3x1' || c.inner.id === 'x2';
}

/** 界面上那把梯子:条数逐档翻倍。 */
export const SLICE_LADDER: readonly number[] = [4, 8, 16, 32, 64, 128];

/* ══ 取值 ══════════════════════════════════════════════════════════ */

export function clampSliceCount(n: number): number {
  if (!Number.isFinite(n)) return 8;
  return Math.min(Math.max(Math.round(n), 1), 256);
}

/** 这个案例在整段区间上算不算得动(`√u` 要求 u ≥ 0)。 */
export function isUsable(c: Case): boolean {
  const probe = [c.a, (c.a + c.b) / 2, c.b].map((x) => integrand(c)(x));
  return probe.every(Number.isFinite);
}

/* ══ 显示 ══════════════════════════════════════════════════════════ */

export const HEADLINE = 'Where the du Comes From';
export const MAIN_IDEA =
  'Changing the variable changes the width of every strip. That factor is the g′(x).';

export function show(value: number | null, places = 6): string {
  return value === null ? 'undefined' : showNumber(value, places);
}

export const RULE_TEX = "\\int_a^b f(g(x))\\,g'(x)\\,dx = \\int_{g(a)}^{g(b)} f(u)\\,du";
export const WIDTH_TEX = "du = g'(x)\\,dx";
export const BACKWARDS_TEX = "\\frac{d}{dx}F(g(x)) = f(g(x))\\cdot g'(x)";

export const COLLAPSE_NOTE =
  'The two limits landed on the same u. The substituted integral is therefore exactly 0 — not because nothing happened, but because the path went out and came back. A signed integral counts the return trip as negative.';
