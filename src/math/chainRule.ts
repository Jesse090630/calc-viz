/**
 * MATH — 链式法则:`(f∘g)′(x) = f′(g(x)) · g′(x)`。
 *
 * ⭐⭐ 这一课要讲的**不是**那个公式长什么样,是**为什么是乘法**。
 *
 *   x 动一点点,u = g(x) 跟着动;u 动一点点,y = f(u) 跟着动。
 *   如果 u 变化的速度是 x 的 k 倍,而 y 变化的速度是 u 的 m 倍,
 *   那么 y 相对 x 就是 k·m 倍 —— **两级放大,倍率相乘**。
 *
 * ⭐ 关键在于:在取极限**之前**,这件事就已经是**恒等式**了:
 *
 *       Δy   Δy   Δu
 *       ── = ── · ──          (只要 Δu ≠ 0,这就是把同一个分式拆开再乘回去)
 *       Δx   Δu   Δx
 *
 *   右边两个因子各自趋于 `f′(u)` 和 `g′(x)`,于是乘积趋于 `f′(g(x))·g′(x)`。
 *   **公式不是被规定的,是被这条恒等式逼出来的。**
 *
 * ⚠️⚠️ 但那条恒等式有一个**真实的漏洞**,几乎所有教科书都把它藏起来了:
 *   `Δu` 可能**恰好是 0**(比如 g 在这一点是局部平的,或者干脆是常数)。
 *   那时 `Δy/Δu` 是 `0/0`,**根本没有定义** —— 不是"等于某个数",是不存在。
 *   这个课件必须把它显示成"没有定义",不能显示成 NaN、不能悄悄跳过、
 *   更不能假装乘法照常成立。结论本身仍然对(链式法则对 g′=0 的点照样成立),
 *   但**这条特定的证明路径在那里断了**,得换一种说法。
 *   `stretchFactors` 因此在 `Δu === 0` 时把 `outer` 和 `product` 返回 `null`。
 *
 * ⭐ 两条互不相干的路径算同一个导数:
 *   ① `byChainRule`   —— 用两个解析导数相乘(公式);
 *   ② `byNumericLimit` —— 只把复合函数当黑箱,做中心差商(定义)。
 *   两条必须一致。① 用了链式法则,② 完全没有 —— 所以它们一致这件事本身
 *   就是对链式法则的一次数值验证,不是同义反复。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import { showNumber } from './format';

/* ══ 函数对 ════════════════════════════════════════════════════════ */

export interface Fn {
  /** 稳定 id */
  readonly id: string;
  /** 人类可读,如 "u²" */
  readonly label: string;
  /** KaTeX 源码 */
  readonly tex: string;
  readonly at: (t: number) => number;
  /** 解析导数 */
  readonly d: (t: number) => number;
}

export interface Pair {
  readonly id: string;
  /** 内层 u = g(x) */
  readonly inner: Fn;
  /** 外层 y = f(u) */
  readonly outer: Fn;
  /** 复合之后化简的样子,给"验算"用 */
  readonly composedTex: string;
  /** 默认停在哪个 x */
  readonly startX: number;
}

const DOUBLE: Fn = { id: 'double', label: '2x', tex: '2x', at: (t) => 2 * t, d: () => 2 };
const SQUARE: Fn = { id: 'square', label: 'u²', tex: 'u^2', at: (t) => t * t, d: (t) => 2 * t };
const SINE: Fn = { id: 'sine', label: 'sin u', tex: '\\sin u', at: Math.sin, d: Math.cos };
const INNER_SINE: Fn = { id: 'inner-sine', label: 'sin x', tex: '\\sin x', at: Math.sin, d: Math.cos };
const AFFINE: Fn = { id: 'affine', label: '3x + 1', tex: '3x + 1', at: (t) => 3 * t + 1, d: () => 3 };
const ROOT: Fn = {
  id: 'root',
  label: '√u',
  tex: '\\sqrt{u}',
  at: (t) => Math.sqrt(t),
  // ⚠️ u = 0 处导数发散,这是数学事实,不是 bug。调用方负责不在那里取值。
  d: (t) => 1 / (2 * Math.sqrt(t)),
};
/**
 * ⚠️ 内层是**常数**。这一对不是凑数的,它是这条推导路径的**反例**:
 * 内层完全不动 → `Δu` 精确为 0 → `Δy/Δu` 是 0/0,那条恒等式在这里断了。
 * 结论(导数为 0)照样对,但要换个说法。
 * 不把它摆出来,`FLAT_WARNING` 就是一段谁也走不到的死界面 ——
 * 而"把例外摆出来给人看"是这个站一贯的做法(等比级数的 r = 1 也是这么处理的)。
 */
const FROZEN: Fn = { id: 'frozen', label: '1', tex: '1', at: () => 1, d: () => 0 };

const INNER_SQUARE: Fn = { id: 'inner-square', label: 'x²', tex: 'x^2', at: (t) => t * t, d: (t) => 2 * t };

export const PAIRS: readonly Pair[] = [
  {
    id: 'double-then-square',
    inner: DOUBLE,
    outer: SQUARE,
    composedTex: 'y = (2x)^2 = 4x^2',
    startX: 0.9,
  },
  {
    id: 'square-then-sine',
    inner: INNER_SQUARE,
    outer: SINE,
    composedTex: 'y = \\sin(x^2)',
    startX: 1.1,
  },
  {
    id: 'sine-then-square',
    inner: INNER_SINE,
    outer: SQUARE,
    composedTex: 'y = \\sin^2 x',
    startX: 0.8,
  },
  {
    id: 'affine-then-root',
    inner: AFFINE,
    outer: ROOT,
    composedTex: 'y = \\sqrt{3x + 1}',
    startX: 1.0,
  },
  {
    id: 'frozen-then-square',
    inner: FROZEN,
    outer: SQUARE,
    composedTex: 'y = 1^2 = 1',
    startX: 0.5,
  },
] as const;

export function pairOf(id: string): Pair {
  return PAIRS.find((p) => p.id === id) ?? PAIRS[0]!;
}

/** 复合函数本身。⚠️ 这是**黑箱**:数值路径只准用它,不准偷看里面。 */
export function composed(pair: Pair): (x: number) => number {
  return (x) => pair.outer.at(pair.inner.at(x));
}

/* ══ 两条独立路径 ══════════════════════════════════════════════════ */

/** 路径 ① —— 链式法则:两个解析导数相乘。 */
export function byChainRule(pair: Pair, x: number): number {
  return pair.outer.d(pair.inner.at(x)) * pair.inner.d(x);
}

/**
 * 路径 ② —— **只看复合函数**,做中心差商。完全没有用到链式法则。
 * 所以 ① 与 ② 一致,是对链式法则的一次真实数值检验,不是同义反复。
 *
 * ⚠️ 用中心差商(误差 O(h²))而不是前向差商(O(h)) ——
 * 否则要取到很小的 h 才准,而很小的 h 会把浮点误差放大回来。
 */
export function byNumericLimit(pair: Pair, x: number, h = 1e-5): number {
  const f = composed(pair);
  return (f(x + h) - f(x - h)) / (2 * h);
}

/* ══ 两级放大 ══════════════════════════════════════════════════════ */

export interface Stretch {
  /** Δx */
  readonly dx: number;
  /** Δu = g(x+Δx) − g(x) */
  readonly du: number;
  /** Δy = f(u+Δu) − f(u) */
  readonly dy: number;
  /** 内层倍率 Δu/Δx */
  readonly inner: number;
  /** 外层倍率 Δy/Δu。⚠️ Δu = 0 时**没有定义**,返回 null。 */
  readonly outer: number | null;
  /** 两级相乘。Δu = 0 时同样没有定义。 */
  readonly product: number | null;
  /** 直接量的总倍率 Δy/Δx。⚠️ 这个**永远有定义**(只要 Δx ≠ 0)。 */
  readonly direct: number;
  /**
   * 那条恒等式在这一步成不成立。
   * ⚠️ Δu = 0 时它是 `false` —— 不是因为数学错了,是因为**这条路径断了**。
   */
  readonly identityHolds: boolean;
}

/**
 * 量出两级倍率。
 *
 * ⚠️ 这里**不做极限**,只做一次有限的 Δx。整节课的支点就是:
 * `Δy/Δx = (Δy/Δu)·(Δu/Δx)` 在取极限**之前**就已经成立了(只要 Δu ≠ 0)。
 * 极限只是最后一步,不是这条等式成立的理由。
 */
export function stretchFactors(pair: Pair, x: number, dx: number): Stretch | null {
  if (!Number.isFinite(x) || !Number.isFinite(dx) || dx === 0) return null;
  const u = pair.inner.at(x);
  const u2 = pair.inner.at(x + dx);
  const y = pair.outer.at(u);
  const y2 = pair.outer.at(u2);
  if (![u, u2, y, y2].every(Number.isFinite)) return null;

  const du = u2 - u;
  const dy = y2 - y;
  const inner = du / dx;
  const direct = dy / dx;

  // ⚠️ 这里是整个文件最容易写错的一行。
  //    `du === 0` 时 `dy/du` 是 0/0 —— 必须是 null,不能是 NaN、不能是 0、不能跳过。
  const outer = du === 0 ? null : dy / du;
  const product = outer === null ? null : outer * inner;

  return {
    dx,
    du,
    dy,
    inner,
    outer,
    product,
    direct,
    identityHolds: product !== null && Math.abs(product - direct) <= 1e-9 * Math.max(1, Math.abs(direct)),
  };
}

/** Δu 会不会恰好是 0 —— 界面上要**主动**把这种情况找出来给学生看。 */
export function innerIsFlat(pair: Pair, x: number, dx: number): boolean {
  return pair.inner.at(x + dx) === pair.inner.at(x);
}

/* ══ 收敛:让 Δx 缩下去 ═══════════════════════════════════════════ */

/** 界面上那把梯子。⚠️ 不要更小 —— 再小下去中心差商会被浮点噪声吃掉。 */
export const DX_LADDER: readonly number[] = [0.5, 0.2, 0.1, 0.05, 0.02, 0.01, 0.005, 0.001];

export interface Rung {
  readonly dx: number;
  readonly inner: number;
  readonly outer: number | null;
  readonly product: number | null;
}

export function ladder(pair: Pair, x: number): readonly Rung[] {
  return DX_LADDER.map((dx) => {
    const s = stretchFactors(pair, x, dx);
    return { dx, inner: s?.inner ?? Number.NaN, outer: s?.outer ?? null, product: s?.product ?? null };
  });
}

/**
 * 梯子确实在往那个答案上收 —— 用**构造**证明,不是"看着像"。
 * 给一个容差,返回第一个把误差压到容差以下的 Δx;做不到就 null。
 */
export function settlesBelow(pair: Pair, x: number, tol: number): number | null {
  const target = byChainRule(pair, x);
  for (const dx of DX_LADDER) {
    const s = stretchFactors(pair, x, dx);
    if (s?.product != null && Math.abs(s.product - target) < tol) return dx;
  }
  return null;
}

/* ══ 那个常见的错答案 ═════════════════════════════════════════════ */

/**
 * ⭐ 学生最常写的错答案:**只对外层求导,忘了乘内层**。
 * 这一课开头就把它摆出来,然后用数字打掉 —— 比事后叮嘱有用得多。
 */
export function forgettingInner(pair: Pair, x: number): number {
  return pair.outer.d(pair.inner.at(x));
}

/** 忘了乘内层会差多少倍。⚠️ 内层导数为 0 时这个比值没有意义,返回 null。 */
export function missingFactor(pair: Pair, x: number): number | null {
  const g = pair.inner.d(x);
  return g === 0 ? null : g;
}

/* ══ 取值 ══════════════════════════════════════════════════════════ */

export const X_RANGE = { min: -2, max: 2 } as const;

export function clampX(x: number): number {
  if (!Number.isFinite(x)) return 1;
  return Math.min(Math.max(Math.round(x * 1000) / 1000, X_RANGE.min), X_RANGE.max);
}

/**
 * 这一对函数在这个 x 上能不能算。
 * ⚠️ `√u` 在 u < 0 上没有实值,`√u` 的导数在 u = 0 处发散 —— 都要挡住。
 */
export function isUsable(pair: Pair, x: number): boolean {
  const u = pair.inner.at(x);
  return [u, pair.outer.at(u), pair.outer.d(u), pair.inner.d(x)].every(Number.isFinite);
}

/* ══ 显示 ══════════════════════════════════════════════════════════ */

export const HEADLINE = 'Rates Multiply';
export const MAIN_IDEA =
  'Two stages of stretching. The total stretch is the product, not the sum.';

export function show(value: number | null, places = 4): string {
  return value === null ? 'undefined' : showNumber(value, places);
}

export function chainTex(pair: Pair): string {
  return `\\frac{dy}{dx} = \\underbrace{${pair.outer.tex.replace(/u/g, 'u')}'}_{\\text{outer}} \\cdot \\underbrace{g'(x)}_{\\text{inner}}`;
}

/** `Δy/Δx = (Δy/Δu)·(Δu/Δx)` —— 这一课的支点,写成 TeX。 */
export const IDENTITY_TEX =
  '\\frac{\\Delta y}{\\Delta x} = \\frac{\\Delta y}{\\Delta u}\\cdot\\frac{\\Delta u}{\\Delta x}';

export const LIMIT_TEX =
  "\\frac{dy}{dx} = f'(g(x))\\cdot g'(x)";

/** Δu = 0 时那句必须说出来的话。 */
export const FLAT_WARNING =
  'Δu is exactly zero here, so Δy/Δu is 0/0 — undefined. The identity above needs Δu ≠ 0, so this particular route breaks at this point. The chain rule itself still holds; it just needs a different argument here.';
