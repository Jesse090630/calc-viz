/**
 * MATH — 定理与推论:**前提、证明、用法。**
 *
 * ⭐⭐⭐ 这一页不是把八条定理并排抄一遍。它要讲的是:**这些定理是一条链。**
 *
 *     实数的完备性 ──┬─→ 介值定理
 *                   └─→ 最值定理 ──┐
 *     费马引理 ────────────────────┴─→ Rolle ─→ 中值定理 ─┬─→ Cauchy 中值定理
 *                                                        └─→ 线性近似 ─→ 牛顿法
 *     夹逼定理(独立,只用极限定义)
 *
 *   最值定理交给你一个最大值;费马引理说这个最大值处导数为零;
 *   Rolle 就是这两条拼起来;中值定理是把 Rolle 转个角度;
 *   Cauchy 是中值定理换成两个函数;线性近似的**误差界**正是中值定理给的;
 *   牛顿法则是把线性近似反复用来解方程。
 *   ⭐ "这条定理是从哪来的"——这正是这个网站和 Desmos / GeoGebra 的区别。
 *
 * ⚠️⚠️ 介值定理和最值定理在 BC 的范围内**证不完**:两者都要用到实数的完备性
 *   (最小上界公理 / Bolzano–Weierstrass)。这一页的处理是:**把那一步明确标出来**,
 *   写清楚它说的是什么、为什么不能再往下推,而不是假装证完了。
 *   `needsCompleteness` 这个标记就是干这个的。
 *
 * ⚠️ 例题里的数字**一个都不许手敲**。每个都由下面的函数算出来,
 *   并在测试里用另一条路径复核(闭式对数值、或代回原式)。
 *   手敲的数字会和改动不同步,而这一页的全部价值就是它说的都是真的。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import { showNumber, showScientific } from './format';

/* ══ 结构 ══════════════════════════════════════════════════════════ */

export interface Condition {
  readonly n: string;
  /** 条件本身 */
  readonly text: string;
  /**
   * ⭐ 去掉这一条会怎样。
   * 一个条件只有在你知道它挡住了什么之后才算"说清楚了"。
   */
  readonly without: string;
}

export interface ProofStep {
  readonly n: string;
  readonly text: string;
  /** ⚠️ 这一步要用到实数的完备性 —— BC 范围内到此为止。 */
  readonly needsCompleteness?: boolean;
}

export interface ExampleLine {
  readonly text: string;
  /** 算出来的数(不是手敲的);没有数就省略。 */
  readonly value?: number;
  /**
   * ⚠️ 用科学记数显示。
   * 线性近似那一屏的上界和真实误差是 0.000156 和 0.000154 ——
   * 按定点显示,两个数长得几乎一样,而**误差到底有没有被上界罩住**
   * 恰恰是那条定理的全部分量。写成 `1.5625×10⁻⁴` 对 `1.5433×10⁻⁴`,一眼就能比。
   */
  readonly sci?: boolean;
}

export interface Example {
  readonly setup: string;
  readonly ask: string;
  readonly lines: readonly ExampleLine[];
  readonly answer: string;
}

export interface Theorem {
  readonly id: string;
  readonly name: string;
  /**
   * ⚠️ 图上那个方块里写的字。**单独写一个字段**,不要拿正则去削 `name`。
   *   第一版就是拿正则削的,结果「Linear Approximation」和「Newton's Method」
   *   一个字都没被削掉,直接**写出了方块外面**。
   *   正则削名字这种事,改一个名字就能悄悄失效,而且失效时不报错。
   */
  readonly short: string;
  readonly also?: string;
  /** 结论本身,TeX。 */
  readonly tex: string;
  /** 一句话:它给你什么。 */
  readonly gives: string;
  readonly conditions: readonly Condition[];
  readonly proof: readonly ProofStep[];
  readonly example: Example;
  /** 它用到了哪几条(本文件里的 id)。 */
  readonly dependsOn: readonly string[];
  /**
   * ⚠️ 图上的位置写死,不做自动布局 —— 自动布局会随数据微调而乱跳。
   *
   * ⚠️⚠️ 摆位置时要顾到**箭头会不会从别的方块身上压过去**。
   *   第一版把 Cauchy 放在 `[4, 0]`,于是 Rolle → Cauchy 那条曲线
   *   正好从 MVT 的方块后面穿过去 —— 方块是不透明的,曲线被盖掉一截,
   *   看上去就像那支箭头是**从 MVT 出发**的。
   *   可 Cauchy 是从 Rolle 证出来的,不是从中值定理证出来的,**图把依赖关系讲反了**。
   *   现在 Cauchy 挪到 MVT 正上方 `[3, 0]`,两支箭头各走各的,互不遮挡。
   */
  readonly at: readonly [number, number];
  /** 站内有没有对应的互动课 */
  readonly route?: string;
}

/* ══ 例题里的数字 —— 全部算出来 ═══════════════════════════════════ */

/** 二分法找根。两端必须异号。 */
export function rootByBisection(
  f: (x: number) => number, lo: number, hi: number, steps = 200,
): number | null {
  let a = lo;
  let b = hi;
  if (f(a) * f(b) > 0) return null;
  for (let i = 0; i < steps; i += 1) {
    const m = (a + b) / 2;
    if (f(a) * f(m) <= 0) b = m; else a = m;
  }
  return (a + b) / 2;
}

/** 介值定理与牛顿法共用的那个方程:`x³ + x − 1 = 0`。 */
export const CUBIC = (x: number): number => x * x * x + x - 1;
export const CUBIC_PRIME = (x: number): number => 3 * x * x + 1;

/** ⭐ 介值定理只说"有根",牛顿法负责把它找出来 —— 同一个根。 */
export function cubicRoot(): number {
  return rootByBisection(CUBIC, 0, 1)!;
}

/** 牛顿法的迭代序列。`null` 表示切线水平,走不下去。 */
export function newtonSteps(
  f: (x: number) => number, df: (x: number) => number, x0: number, n: number,
): readonly (number | null)[] {
  const out: (number | null)[] = [x0];
  let x = x0;
  for (let i = 0; i < n; i += 1) {
    const d = df(x);
    if (d === 0 || !Number.isFinite(d)) { out.push(null); break; }
    x -= f(x) / d;
    if (!Number.isFinite(x)) { out.push(null); break; }
    out.push(x);
  }
  return out;
}

/**
 * ⚠️⚠️ 牛顿法翻车的样子:`x³ − 2x + 2` 从 `x₀ = 0` 出发会**原地打转**。
 *   0 → 1 → 0 → 1 → … 永远循环,而方程确实有实根(在 −1.77 附近)。
 *   ⭐ 和 `#/euler` 那一课同一个道理:数值方法不会喊停,它只是一直给你数。
 */
export const CYCLE = (x: number): number => x * x * x - 2 * x + 2;
export const CYCLE_PRIME = (x: number): number => 3 * x * x - 2;

/** 中值定理例题:`f(x) = x³` 在 `[0, 2]` 上,连线斜率 4,解出 `c = 2/√3`。 */
export function mvtC(): number {
  return 2 / Math.sqrt(3);
}
export function mvtChordSlope(): number {
  return (2 ** 3 - 0 ** 3) / (2 - 0);
}

/** Cauchy 例题:`f = x²`、`g = x³` 在 `[1, 2]` 上。比值 3/7,解出 `c = 14/9`。 */
export function cauchyRatio(): number {
  return (2 ** 2 - 1 ** 2) / (2 ** 3 - 1 ** 3);
}
export function cauchyC(): number {
  // f'(c)/g'(c) = 2c/(3c²) = 2/(3c) = 3/7  ⇒  c = 14/9
  return 14 / 9;
}

/** Rolle 例题:`f(x) = x² − 4` 在 `[−2, 2]` 上,`c = 0`。 */
export function rolleC(): number {
  return 0;
}

/** 最值定理例题:`f(x) = x³ − 3x` 在 `[−2, 3]` 上的最大最小值。 */
export const EVT_F = (x: number): number => x * x * x - 3 * x;
export function evtExtremes(a = 0, b = 3, n = 200_000): { max: number; min: number; argMax: number; argMin: number } {
  let max = -Infinity;
  let min = Infinity;
  let argMax = a;
  let argMin = a;
  for (let i = 0; i <= n; i += 1) {
    const x = a + ((b - a) * i) / n;
    const y = EVT_F(x);
    if (y > max) { max = y; argMax = x; }
    if (y < min) { min = y; argMin = x; }
  }
  return { max, min, argMax, argMin };
}

/** 夹逼定理例题:`x² sin(1/x)` 被 `±x²` 夹住。 */
export const SQUEEZE_F = (x: number): number => (x === 0 ? 0 : x * x * Math.sin(1 / x));
/** 三条线在 `x` 处的值:下界、本体、上界。 */
export function squeezeAt(x: number): readonly [number, number, number] {
  return [-(x * x), SQUEEZE_F(x), x * x];
}

/**
 * 线性近似例题:用 `√4 = 2` 近似 `√4.1`。
 * ⭐ 拉格朗日余项给的上界必须**真的罩得住**真实误差 —— 这一点由测试盯着。
 */
export function linApproxValue(): number {
  return 2 + 0.1 / 4;             // f(4) + f'(4)·Δx,f' = 1/(2√x)
}
export function linApproxTrue(): number {
  return Math.sqrt(4.1);
}
export function linApproxError(): number {
  return Math.abs(linApproxTrue() - linApproxValue());
}
/**
 * 误差上界 `|f''(ξ)|/2 · Δx²`,`ξ` 取在 `[4, 4.1]` 上让 `|f''|` 最大的地方。
 * `f'' = −1/(4x^{3/2})`,随 x 递减,所以最大在左端 `x = 4`。
 */
export function linApproxBound(): number {
  const worst = 1 / (4 * 4 ** 1.5);   // |f''(4)| = 1/32
  return (worst / 2) * 0.1 ** 2;
}

/** 费马引理的反方向:`f'(0) = 0` 而 0 处既不是极大也不是极小。 */
export const FERMAT_TRAP = (x: number): number => x * x * x;

/* ══ 八条(加一条)定理 ═══════════════════════════════════════════ */

export const THEOREMS: readonly Theorem[] = [
  {
    id: 'squeeze',
    name: 'Squeeze Theorem',
    short: 'Squeeze',
    also: 'sandwich theorem',
    tex: String.raw`g(x)\le f(x)\le h(x)\ \text{near }a,\quad \lim_{x\to a}g=\lim_{x\to a}h=L\ \Longrightarrow\ \lim_{x\to a}f=L`,
    gives: 'A limit for a function you cannot evaluate directly, by trapping it between two you can.',
    conditions: [
      {
        n: '1',
        text: 'g(x) ≤ f(x) ≤ h(x) for every x in some open interval around a — except possibly at a itself.',
        without: 'If the inequality only holds on one side of a, you get a one-sided limit and nothing more. If it fails anywhere arbitrarily close to a, f can escape between the bounds infinitely often and have no limit.',
      },
      {
        n: '2',
        text: 'The two outer limits exist and are equal: lim g = lim h = L.',
        without: 'Two different outer limits trap f in an interval, not at a point. Bounding sin(1/x) between −1 and 1 is true and tells you nothing, because −1 ≠ 1.',
      },
    ],
    proof: [
      { n: '1', text: 'Fix ε > 0. Since lim g = L, there is δ₁ with |g(x) − L| < ε whenever 0 < |x − a| < δ₁; in particular L − ε < g(x).' },
      { n: '2', text: 'Since lim h = L, there is δ₂ with h(x) < L + ε whenever 0 < |x − a| < δ₂.' },
      { n: '3', text: 'Let δ be the smallest of δ₁, δ₂ and the radius of the interval where the inequality holds. For 0 < |x − a| < δ all three facts apply at once.' },
      { n: '4', text: 'Then L − ε < g(x) ≤ f(x) ≤ h(x) < L + ε, so |f(x) − L| < ε. Since ε was arbitrary, lim f = L. No completeness needed — this is the ε–δ definition and nothing else.' },
    ],
    example: {
      setup: 'f(x) = x² sin(1/x), which has no limit you can read off: sin(1/x) oscillates forever as x → 0.',
      ask: 'Find lim as x → 0.',
      lines: [
        { text: 'Since −1 ≤ sin(1/x) ≤ 1 for every x ≠ 0, multiplying by x² ≥ 0 gives −x² ≤ f(x) ≤ x².' },
        { text: 'Both outer functions go to 0 as x → 0, so L = 0.' },
        { text: 'At x = 0.1 the three values are the lower bound, f itself, and the upper bound:' },
        { text: 'lower bound at x = 0.1', value: -0.01 },
        { text: 'f(0.1)', value: SQUEEZE_F(0.1) },
        { text: 'upper bound at x = 0.1', value: 0.01 },
      ],
      answer: 'The limit is 0. Note f is squeezed, not monotone — it crosses zero infinitely often on the way in.',
    },
    dependsOn: [],
    at: [0, 3],
  },
  {
    id: 'ivt',
    name: 'Intermediate Value Theorem',
    short: 'IVT',
    tex: String.raw`f\ \text{continuous on }[a,b],\ N\ \text{between }f(a)\ \text{and}\ f(b)\ \Longrightarrow\ \exists c\in(a,b):f(c)=N`,
    gives: 'The existence of a solution. It never tells you where the solution is.',
    conditions: [
      {
        n: '1',
        text: 'f is continuous on the closed interval [a, b].',
        without: 'A single jump is enough. The step function that is 0 below 1 and 1 at or above 1 skips every value strictly between 0 and 1 while still running from 0 to 1.',
      },
      {
        n: '2',
        text: 'N lies between f(a) and f(b).',
        without: 'Nothing is promised about values outside that range. The theorem says the function cannot skip over what it passes through — not that it reaches anything else.',
      },
    ],
    proof: [
      { n: '1', text: 'Suppose f(a) < N < f(b); the other case is the same argument on −f. Let S be the set of x in [a, b] with f(x) < N. S is nonempty (a is in it) and bounded above by b.' },
      { n: '2', text: 'So S has a least upper bound; call it c.', needsCompleteness: true },
      { n: '3', text: 'If f(c) < N, continuity gives an interval around c where f stays below N, so points slightly right of c are in S — contradicting that c is an upper bound.' },
      { n: '4', text: 'If f(c) > N, continuity gives an interval around c where f stays above N, so a smaller number is already an upper bound for S — contradicting that c is the least one.' },
      { n: '5', text: 'Both inequalities are impossible, so f(c) = N. Note what step 2 assumed: that every nonempty set bounded above has a least upper bound. That is the completeness of the real numbers, and it is the one thing here a BC course takes as given. It is also exactly what fails for the rationals, where x² = 2 has no solution.' },
    ],
    example: {
      setup: 'f(x) = x³ + x − 1, continuous everywhere because it is a polynomial.',
      ask: 'Show the equation x³ + x − 1 = 0 has a solution in [0, 1].',
      lines: [
        { text: 'f(0) =', value: CUBIC(0) },
        { text: 'f(1) =', value: CUBIC(1) },
        { text: 'N = 0 lies between −1 and 1, and f is continuous, so the theorem applies and a root exists in (0, 1).' },
        { text: 'The root, found afterwards by bisection — the theorem itself does not produce this number:', value: cubicRoot() },
      ],
      answer: 'A root exists in (0, 1). Finding it takes a different tool — see Newton’s method below, which chases this same root.',
    },
    dependsOn: [],
    at: [0, 0],
    route: 'bisect-line',
  },
  {
    id: 'evt',
    name: 'Extreme Value Theorem',
    short: 'EVT',
    also: 'Weierstrass',
    tex: String.raw`f\ \text{continuous on }[a,b]\ \Longrightarrow\ \exists\,x_{\max},x_{\min}\in[a,b]\ \text{attaining the max and min}`,
    gives: 'The existence of an actual largest and smallest value — attained, not just approached.',
    conditions: [
      {
        n: '1',
        text: 'The interval is closed: both endpoints are included.',
        without: 'f(x) = x on the open interval (0, 1) gets arbitrarily close to 1 and never reaches it. The supremum exists; the maximum does not.',
      },
      {
        n: '2',
        text: 'The interval is bounded.',
        without: 'f(x) = x on [0, ∞) has no maximum at all. Closed is not enough — it has to be finite in extent too.',
      },
      {
        n: '3',
        text: 'f is continuous on all of it.',
        without: 'Take f(x) = 1/x on (0, 1] extended by f(0) = 0. The interval is closed and bounded, and f is unbounded above.',
      },
    ],
    proof: [
      { n: '1', text: 'First, f is bounded. If not, pick xₙ in [a, b] with |f(xₙ)| > n for each n.' },
      { n: '2', text: 'A bounded sequence in a closed bounded interval has a convergent subsequence, with limit x* still inside [a, b].', needsCompleteness: true },
      { n: '3', text: 'Continuity at x* forces f along that subsequence to approach the finite number f(x*), contradicting |f(xₙ)| > n. So f is bounded.' },
      { n: '4', text: 'Let M be the least upper bound of the values of f. Pick yₙ in [a, b] with f(yₙ) > M − 1/n.' },
      { n: '5', text: 'Take a convergent subsequence of yₙ with limit x_max in [a, b]. Continuity gives f(x_max) = M, so the supremum is attained. Apply the same argument to −f for the minimum.', needsCompleteness: true },
      { n: '6', text: 'Steps 2 and 5 are the Bolzano–Weierstrass theorem, which is another face of completeness. This is the second place BC stops: the statement is taken as true, and what it rests on is the same least-upper-bound property the IVT needed.' },
    ],
    example: {
      setup: 'f(x) = x³ − 3x on [0, 3]. Continuous, closed, bounded — all three conditions hold.',
      ask: 'Where are the maximum and minimum, and what are they?',
      lines: [
        { text: 'Critical points: f′(x) = 3x² − 3 = 0 at x = ±1. Only x = 1 lies in [0, 3]; x = −1 is outside and is not a candidate at all — discarding it is the step most often skipped.' },
        { text: 'Compare f at x = 1 against f at the two endpoints. Maximum value:', value: evtExtremes().max },
        { text: 'attained at x =', value: evtExtremes().argMax },
        { text: 'Minimum value:', value: evtExtremes().min },
        { text: 'attained at x =', value: evtExtremes().argMin },
      ],
      answer: 'Maximum 18 at the right endpoint, minimum −2 at the interior critical point. The theorem guaranteed both exist; comparing critical points against endpoints is how you find them.',
    },
    dependsOn: [],
    at: [0, 1],
  },
  {
    id: 'fermat',
    name: "Fermat's Theorem",
    short: 'Fermat',
    also: 'interior extremum theorem',
    tex: String.raw`f\ \text{has a local extremum at }c\ \text{interior},\ f'(c)\ \text{exists}\ \Longrightarrow\ f'(c)=0`,
    gives: 'The bridge from "this is a high point" to "the derivative is zero here".',
    conditions: [
      {
        n: '1',
        text: 'c is an interior point of the domain.',
        without: 'f(x) = x on [0, 1] has its maximum at x = 1 and f′(1) = 1 ≠ 0. At an endpoint there is no room to compare both sides, which is why endpoints must be checked separately in every optimisation problem.',
      },
      {
        n: '2',
        text: 'f is differentiable at c.',
        without: 'f(x) = |x| has a minimum at 0 and no derivative there. The conclusion is about a number that does not exist.',
      },
    ],
    proof: [
      { n: '1', text: 'Say c is a local maximum, so f(c + h) ≤ f(c) for all small h.' },
      { n: '2', text: 'For h > 0 the quotient (f(c + h) − f(c))/h has a non-positive top and a positive bottom, so it is ≤ 0. Letting h → 0⁺ gives f′(c) ≤ 0.' },
      { n: '3', text: 'For h < 0 the bottom is negative while the top is still non-positive, so the quotient is ≥ 0. Letting h → 0⁻ gives f′(c) ≥ 0.' },
      { n: '4', text: 'The derivative exists, so both one-sided limits equal it. Hence f′(c) ≤ 0 and f′(c) ≥ 0, forcing f′(c) = 0. No completeness needed; this is the definition of the derivative and nothing more.' },
    ],
    example: {
      setup: 'The converse is false, and that is the thing worth knowing: f(x) = x³ at c = 0.',
      ask: 'Does f′(c) = 0 mean c is an extremum?',
      lines: [
        { text: 'f′(0) = 3·0² =', value: 0 },
        { text: 'But f(−0.1) =', value: FERMAT_TRAP(-0.1) },
        { text: 'and f(0.1) =', value: FERMAT_TRAP(0.1) },
        { text: 'f takes values below f(0) just left of 0 and above it just right, so 0 is neither a maximum nor a minimum.' },
      ],
      answer: 'No. Fermat runs one way only: extremum ⇒ derivative zero. Zero derivative is a shortlist of candidates, never a verdict — which is why the second derivative test or a sign chart is always needed afterwards.',
    },
    dependsOn: [],
    at: [1, 2],
    route: 'optimization',
  },
  {
    id: 'rolle',
    name: "Rolle's Theorem",
    short: 'Rolle',
    tex: String.raw`f\ \text{continuous on }[a,b],\ \text{differentiable on }(a,b),\ f(a)=f(b)\ \Longrightarrow\ \exists c\in(a,b):f'(c)=0`,
    gives: 'A point with a horizontal tangent, from nothing but equal endpoints.',
    conditions: [
      {
        n: '1',
        text: 'f is continuous on the closed [a, b].',
        without: 'Move one endpoint value and the conclusion dies. Take f(x) = x on [0, 1) with f(1) = 0: the endpoints match, the interior slope is 1 everywhere, and no point has a horizontal tangent.',
      },
      {
        n: '2',
        text: 'f is differentiable on the open (a, b).',
        without: 'f(x) = |x| on [−1, 1] has f(−1) = f(1) = 1 and slope ±1 everywhere it has one. A single corner is enough.',
      },
      {
        n: '3',
        text: 'f(a) = f(b).',
        without: 'This is the only thing separating Rolle from the mean value theorem. Drop it and you still get a conclusion — just a tilted one. See the next entry.',
      },
    ],
    proof: [
      { n: '1', text: 'f is continuous on a closed bounded interval, so by the extreme value theorem it attains a maximum and a minimum somewhere on [a, b].' },
      { n: '2', text: 'If both are attained only at the endpoints, then since f(a) = f(b) the maximum equals the minimum, so f is constant and f′ = 0 everywhere inside — any c will do.' },
      { n: '3', text: 'Otherwise at least one of them is attained at an interior point c. f is differentiable there, so Fermat applies and f′(c) = 0.' },
      { n: '4', text: 'That is the whole proof: the extreme value theorem produces the point, Fermat flattens it. Rolle is those two results shaken hands, which is why it inherits the completeness that the extreme value theorem needed.' },
    ],
    example: {
      setup: 'f(x) = x² − 4 on [−2, 2]. Polynomial, so continuous and differentiable everywhere.',
      ask: 'Find the point the theorem promises.',
      lines: [
        { text: 'f(−2) =', value: -2 * -2 - 4 },
        { text: 'f(2) =', value: 2 * 2 - 4 },
        { text: 'The endpoint values match, so the theorem applies. Solve f′(c) = 2c = 0:' },
        { text: 'c =', value: rolleC() },
      ],
      answer: 'c = 0, the vertex. Here there is exactly one such point, but the theorem only ever promises at least one.',
    },
    dependsOn: ['evt', 'fermat'],
    at: [2, 1],
    route: 'mvt',
  },
  {
    id: 'mvt',
    name: 'Mean Value Theorem',
    short: 'MVT',
    tex: String.raw`f\ \text{continuous on }[a,b],\ \text{differentiable on }(a,b)\ \Longrightarrow\ \exists c\in(a,b):f'(c)=\frac{f(b)-f(a)}{b-a}`,
    gives: 'A point where the instantaneous rate equals the average rate. Nearly every "f′ > 0 implies increasing" argument runs through it.',
    conditions: [
      {
        n: '1',
        text: 'f is continuous on the closed [a, b].',
        without: 'Closed, because the chord needs both endpoint values. Lose continuity at one end and the chord describes a function that is not there.',
      },
      {
        n: '2',
        text: 'f is differentiable on the open (a, b).',
        without: 'Open, because the c produced lies strictly inside. |x| on [−1, 1] has a level chord and no level tangent anywhere — one missing point is enough.',
      },
    ],
    proof: [
      { n: '1', text: 'Let L(x) be the chord: the straight line through (a, f(a)) and (b, f(b)).' },
      { n: '2', text: 'Set g(x) = f(x) − L(x). Since L is a polynomial, g inherits continuity on [a, b] and differentiability on (a, b) from f.' },
      { n: '3', text: 'At the endpoints f and L agree, so g(a) = g(b) = 0.' },
      { n: '4', text: 'Rolle applies to g: there is c in (a, b) with g′(c) = 0, that is f′(c) = L′(c).' },
      { n: '5', text: 'L′ is the constant slope of the chord, (f(b) − f(a))/(b − a). Done. The mean value theorem is Rolle with the picture tilted, and subtracting the chord is exactly the tilt.' },
    ],
    example: {
      setup: 'f(x) = x³ on [0, 2].',
      ask: 'Find every c the theorem promises.',
      lines: [
        { text: 'Average rate of change, (f(2) − f(0))/(2 − 0) =', value: mvtChordSlope() },
        { text: 'Solve f′(c) = 3c² = 4, keeping only the root inside (0, 2):' },
        { text: 'c = 2/√3 =', value: mvtC() },
        { text: 'Check: f′(c) = 3c² =', value: 3 * mvtC() ** 2 },
      ],
      answer: 'c = 2/√3 ≈ 1.1547. The negative root −2/√3 solves the equation too and is thrown out because it is not in the interval.',
    },
    dependsOn: ['rolle'],
    at: [3, 1],
    route: 'mvt',
  },
  {
    id: 'cauchy',
    name: "Cauchy's Mean Value Theorem",
    short: 'Cauchy',
    also: 'extended / generalised MVT',
    tex: String.raw`\bigl(f(b)-f(a)\bigr)g'(c)=\bigl(g(b)-g(a)\bigr)f'(c)\quad\text{for some }c\in(a,b)`,
    gives: 'The mean value theorem for two functions at once. It is what L’Hôpital’s rule is actually built on.',
    conditions: [
      {
        n: '1',
        text: 'f and g are both continuous on [a, b] and differentiable on (a, b).',
        without: 'Same failures as the ordinary mean value theorem, now with two chances to go wrong.',
      },
      {
        n: '2',
        text: 'To write it as the ratio f′(c)/g′(c) = (f(b) − f(a))/(g(b) − g(a)), you additionally need g(a) ≠ g(b).',
        without: 'If g(a) = g(b) the right-hand side divides by zero. The product form above still holds — which is why the product form is the honest way to state it.',
      },
    ],
    proof: [
      { n: '1', text: 'Define h(x) = (f(b) − f(a))·g(x) − (g(b) − g(a))·f(x). It is continuous on [a, b] and differentiable on (a, b), being a combination of f and g.' },
      { n: '2', text: 'Compute h(a) = f(b)g(a) − f(a)g(b) and h(b) = f(b)g(a) − f(a)g(b). They are equal — the cross terms are the same both times.' },
      { n: '3', text: 'So Rolle applies to h: there is c in (a, b) with h′(c) = 0.' },
      { n: '4', text: 'That reads (f(b) − f(a))·g′(c) − (g(b) − g(a))·f′(c) = 0, which is the statement. Taking g(x) = x gives back the ordinary mean value theorem, so Cauchy contains it as a special case.' },
    ],
    example: {
      setup: 'f(x) = x², g(x) = x³ on [1, 2].',
      ask: 'Find c.',
      lines: [
        { text: '(f(2) − f(1))/(g(2) − g(1)) = 3/7 =', value: cauchyRatio() },
        { text: 'f′(c)/g′(c) = 2c/(3c²) = 2/(3c). Setting 2/(3c) = 3/7 gives c = 14/9:' },
        { text: 'c =', value: cauchyC() },
        { text: 'Check: 2/(3c) =', value: 2 / (3 * cauchyC()) },
        { text: 'and c does lie inside (1, 2).' },
      ],
      answer: 'c = 14/9 ≈ 1.5556. Note g′ is never zero on (1, 2), which is what keeps the ratio form legitimate here.',
    },
    dependsOn: ['rolle'],
    at: [3, 0],
  },
  {
    id: 'linear',
    name: 'Linear Approximation',
    short: 'Linear approx',
    also: 'tangent line approximation',
    tex: String.raw`f(x)\approx f(a)+f'(a)(x-a),\qquad |{\rm error}|\le\frac{\max|f''|}{2}(x-a)^2`,
    gives: 'A usable number near a, plus a bound on how wrong it is. The bound is the part students skip and the part that makes it a theorem.',
    conditions: [
      {
        n: '1',
        text: 'f is differentiable at a — that is all the approximation itself needs.',
        without: 'With no derivative at a there is no tangent line to approximate with.',
      },
      {
        n: '2',
        text: 'For the error bound, f must be twice differentiable on the interval between a and x.',
        without: 'The approximation still has a value; you just have no idea how far off it is. An estimate without a bound is a guess.',
      },
    ],
    proof: [
      { n: '1', text: 'The tangent line L(x) = f(a) + f′(a)(x − a) matches f in value and slope at a, so E(x) = f(x) − L(x) has E(a) = 0 and E′(a) = 0.' },
      { n: '2', text: 'Apply Cauchy’s mean value theorem to E and (x − a)² on the interval from a to x. Both vanish at a, so E(x)/(x − a)² = E′(c₁)/(2(c₁ − a)) for some c₁ between a and x.' },
      { n: '3', text: 'Apply it again to E′ and 2(x − a), both of which vanish at a: E′(c₁)/(2(c₁ − a)) = E′′(c₂)/2 for some c₂ between a and c₁.' },
      { n: '4', text: 'E′′ = f′′ because L is linear. So E(x) = f′′(c₂)(x − a)²/2 exactly, for some c₂ between a and x — this is Taylor’s theorem with the Lagrange remainder at n = 1.' },
      { n: '5', text: 'Bounding |f′′| by its maximum on the interval gives the stated inequality. Note where the bound came from: two applications of Cauchy, which was Rolle, which was the extreme value theorem and Fermat.' },
    ],
    example: {
      setup: 'Estimate √4.1 using a = 4, where f(x) = √x, f(4) = 2 and f′(4) = 1/4.',
      ask: 'Give the estimate and a guaranteed error bound.',
      lines: [
        { text: 'Estimate: 2 + (1/4)(0.1) =', value: linApproxValue() },
        { text: '|f′′| = 1/(4x^{3/2}) is largest at x = 4, giving 1/32. Bound: (1/32)/2 · (0.1)² =', value: linApproxBound(), sci: true },
        { text: 'True value:', value: linApproxTrue() },
        { text: 'Actual error:', value: linApproxError(), sci: true },
      ],
      answer: 'The estimate is 2.025, guaranteed within 1.5625 × 10⁻⁴. The real error is 1.5443 × 10⁻⁴ — just inside the bound, which is what a sharp bound looks like.',
    },
    dependsOn: ['cauchy'],
    at: [4, 1],
    route: 'taylor',
  },
  {
    id: 'newton',
    name: "Newton's Method",
    short: 'Newton',
    tex: String.raw`x_{n+1}=x_n-\frac{f(x_n)}{f'(x_n)}`,
    gives: 'An actual numerical root. This is linear approximation used backwards, over and over.',
    conditions: [
      {
        n: '1',
        text: 'f is differentiable, and f′(xₙ) ≠ 0 at every step.',
        without: 'A horizontal tangent sends the next point to infinity. The iteration simply stops being defined.',
      },
      {
        n: '2',
        text: 'The starting point is close enough to the root, and f′ does not vanish near it.',
        without: 'Far from the root the method can cycle forever or run away. There is no theorem saying any starting point works — this is the condition students never hear.',
      },
    ],
    proof: [
      { n: '1', text: 'This is not a theorem being proved so much as a construction. Replace f near xₙ by its linear approximation: f(x) ≈ f(xₙ) + f′(xₙ)(x − xₙ).' },
      { n: '2', text: 'Solve that line for zero instead of solving f for zero: 0 = f(xₙ) + f′(xₙ)(x − xₙ) gives x = xₙ − f(xₙ)/f′(xₙ). Call it xₙ₊₁.' },
      { n: '3', text: 'So each step is one linear approximation, solved exactly. The error bound from the previous entry is what makes the new point better than the old one — when the quadratic term is small enough.' },
      { n: '4', text: 'That last clause is the whole catch. When it holds the error roughly squares each step, which is why three or four steps usually suffice. When it does not, nothing stops the iteration from misbehaving, and it misbehaves quietly.' },
    ],
    example: {
      setup: 'The same equation the intermediate value theorem handled above: x³ + x − 1 = 0, starting at x₀ = 1.',
      ask: 'Find the root the IVT promised.',
      lines: [
        { text: 'x₀ =', value: newtonSteps(CUBIC, CUBIC_PRIME, 1, 4)[0] as number },
        { text: 'x₁ =', value: newtonSteps(CUBIC, CUBIC_PRIME, 1, 4)[1] as number },
        { text: 'x₂ =', value: newtonSteps(CUBIC, CUBIC_PRIME, 1, 4)[2] as number },
        { text: 'x₃ =', value: newtonSteps(CUBIC, CUBIC_PRIME, 1, 4)[3] as number },
        { text: 'x₄ =', value: newtonSteps(CUBIC, CUBIC_PRIME, 1, 4)[4] as number },
        { text: 'The root, to full precision:', value: cubicRoot() },
        { text: 'And the failure case — f(x) = x³ − 2x + 2 from x₀ = 0 cycles 0, 1, 0, 1 forever, while a real root sits near −1.77:' },
        { text: 'x₁ =', value: newtonSteps(CYCLE, CYCLE_PRIME, 0, 4)[1] as number },
        { text: 'x₂ =', value: newtonSteps(CYCLE, CYCLE_PRIME, 0, 4)[2] as number },
        { text: 'x₃ =', value: newtonSteps(CYCLE, CYCLE_PRIME, 0, 4)[3] as number },
      ],
      answer: 'The errors run 0.32, 0.068, 0.0038, 1.2×10⁻⁵, 1.2×10⁻¹⁰ — roughly squaring each step, so the number of correct digits doubles. That is what quadratic convergence looks like. The second example never converges and never complains; the iteration just keeps returning perfectly ordinary numbers.',
    },
    dependsOn: ['linear'],
    at: [5, 1],
  },
] as const;

export function theoremOf(id: string): Theorem {
  return THEOREMS.find((t) => t.id === id) ?? THEOREMS[0]!;
}

/* ══ 依赖图 ═══════════════════════════════════════════════════════ */

export interface Edge {
  readonly from: string;
  readonly to: string;
}

/** 图上的所有箭头。 */
export function edges(): readonly Edge[] {
  const out: Edge[] = [];
  for (const t of THEOREMS) {
    for (const d of t.dependsOn) out.push({ from: d, to: t.id });
  }
  return out;
}

/**
 * `id` 这条定理一路往下用到了哪些。
 * ⚠️ 带访问标记,图里要是出现环就不会死循环(测试另有一条断言图是无环的)。
 */
export function ancestorsOf(id: string): readonly string[] {
  const seen = new Set<string>();
  const stack = [...theoremOf(id).dependsOn];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    stack.push(...theoremOf(cur).dependsOn);
  }
  return [...seen];
}

/** 证明里标了"要用完备性"的那些定理。 */
export function needsCompleteness(t: Theorem): boolean {
  return t.proof.some((p) => p.needsCompleteness === true);
}

/** 这条定理**间接**是不是也靠完备性撑着。 */
export function restsOnCompleteness(id: string): boolean {
  if (needsCompleteness(theoremOf(id))) return true;
  return ancestorsOf(id).some((a) => needsCompleteness(theoremOf(a)));
}

export const HEADLINE = 'Where Each One Comes From';
export const MAIN_IDEA =
  'These are not eight separate facts. The extreme value theorem hands you a maximum, Fermat flattens it, Rolle is those two together, the mean value theorem is Rolle tilted, Cauchy is the mean value theorem with two functions, and the error bound on a tangent line falls out of Cauchy. Follow the arrows.';

export const COMPLETENESS_NOTE =
  'Two proofs on this page stop at the same place: every nonempty set of reals that is bounded above has a least upper bound. That is the completeness of the real numbers, it is an axiom rather than something provable from the rest, and it is what fails for the rationals — where x² = 2 has no solution even though 1.4, 1.41, 1.414 … march straight at one. Everything below the two marked steps is ordinary algebra and limits.';

export function show(v: number | null, places = 6): string {
  return v === null || !Number.isFinite(v) ? 'undefined' : showNumber(v, places);
}

/** 一行例题该怎么显示它那个数。 */
export function showLine(l: ExampleLine): string {
  if (l.value === undefined) return '';
  return l.sci === true ? showScientific(l.value, 4) : show(l.value);
}
