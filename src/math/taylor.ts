/**
 * MATH — Taylor / Maclaurin 级数:**多项式不是越加越准,是只在一段区间里越加越准。**
 *
 * ⭐⭐ BC 自由作答题的第 6 题永远考这一块,而学生最常见的误解只有一句:
 *     「项数越多越接近」。
 *   这句话**在收敛半径以外是彻底错的** —— 不是慢一点,是**反着走**:
 *   加得越多,离得越远。这一课的反例就是它。
 *
 *     `1/(1−x)` 在 `x = 2` 处:1, 3, 7, 15, 31, 63 … 而真值是 **−1**。
 *     每加一项,误差翻倍。
 *
 * ⭐ 第二件事:**Lagrange 余项不是装饰,是一条真的上界。**
 *   `|Rₙ(x)| ≤ max|f⁽ⁿ⁺¹⁾| · |x|ⁿ⁺¹ / (n+1)!`
 *   页面要把**真实误差**和**这条上界**画在一起,让学生看见上界确实罩得住 ——
 *   而且看见它有多松,因为"罩得住"和"贴得紧"是两回事。
 *
 * ⭐ 第三件事:**交错级数的误差就是下一项。** 这是 BC 最好用的一条,
 *   但前提是**交错且项的绝对值单调递减**,两条缺一不可。
 *
 * ⚠️ 收敛半径的**来历**:`R` = 中心到最近的"爆掉的地方"的距离。
 *   `1/(1−x)` 在 `x = 1` 爆,所以 `R = 1`;`ln(1+x)` 在 `x = −1` 爆,所以也是 1;
 *   `eˣ` 和 `sin x` 哪儿都不爆,所以 `R = ∞`。
 *   (严格说那个距离要在复平面上量 —— 这也正是下面第二条路径的来历。)
 *
 * ⭐ 两条互不相干的路径求同一批系数:
 *   ① `coeffClosed` —— 直接写出通项(`1/k!`、`(−1)ᵏ⁻¹/k` …),纯公式;
 *   ② `coeffCauchy` —— **Cauchy 积分公式**:在复平面上绕中心画一个小圆,
 *      `aₖ = (1/2πi)∮ f(z)/z^{k+1} dz`,用梯形法算。
 *      它**只知道 f 本身**,完全不知道通项长什么样。
 *   两者一致,才说明通项没写错。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import { showNumber } from './format';

/* ══ 复数:只为第二条路径准备,够用就行 ══════════════════════════ */

export interface Cx { readonly re: number; readonly im: number }

export const cx = (re: number, im = 0): Cx => ({ re, im });
export const cAdd = (a: Cx, b: Cx): Cx => ({ re: a.re + b.re, im: a.im + b.im });
export const cSub = (a: Cx, b: Cx): Cx => ({ re: a.re - b.re, im: a.im - b.im });
export const cMul = (a: Cx, b: Cx): Cx =>
  ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
export const cAbs = (a: Cx): number => Math.hypot(a.re, a.im);

export function cDiv(a: Cx, b: Cx): Cx {
  const d = b.re * b.re + b.im * b.im;
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
}

export function cExp(a: Cx): Cx {
  const m = Math.exp(a.re);
  return { re: m * Math.cos(a.im), im: m * Math.sin(a.im) };
}

/** `sin z = (e^{iz} − e^{−iz}) / 2i` */
export function cSin(a: Cx): Cx {
  const p = cExp({ re: -a.im, im: a.re });
  const q = cExp({ re: a.im, im: -a.re });
  return cDiv(cSub(p, q), { re: 0, im: 2 });
}

/** 主支 `log z = ln|z| + i·arg z` */
export function cLog(a: Cx): Cx {
  return { re: Math.log(cAbs(a)), im: Math.atan2(a.im, a.re) };
}

/* ══ 级数 ══════════════════════════════════════════════════════════ */

export interface Series {
  readonly id: string;
  readonly label: string;
  readonly f: (x: number) => number;
  /** 复数版,只给 Cauchy 那条路径用 */
  readonly fc: (z: Cx) => Cx;
  /** 通项 aₖ(中心在 0) */
  readonly coeff: (k: number) => number;
  /** 收敛半径。`Infinity` 表示处处收敛。 */
  readonly radius: number;
  /** 端点 `x = ±R` 上到底收不收敛 —— 这是单独的一问,不能想当然 */
  readonly convergesAtRight: boolean;
  readonly convergesAtLeft: boolean;
  /** `max |f⁽ⁿ⁺¹⁾|` 在 0 与 x 之间的闭式(Lagrange 余项要用) */
  readonly maxDerivAbs: (n: number, x: number) => number;
  /**
   * 函数**爆掉**的地方。
   * ⚠️⚠️ 这不是装饰:Taylor 定理要求 f 在 0 与 x **之间处处可导**。
   *   `1/(1−x)` 在 x = 1 处根本没有定义,所以在 x = 2 处
   *   **Lagrange 余项这条定理压根不适用** —— 那里不存在什么"上界"。
   *   第一版没有这个字段,`maxDerivAbs` 照样算出一个有限数(32),
   *   而真实误差**也**是 32,于是屏幕上写着"✓ 上界成立",看起来一切正常。
   *   **一个不适用的定理给出一个碰巧相等的数,比给出错的数更危险。**
   */
  readonly singularities: readonly number[];
  /** 这个级数是交错的吗(对正的 x 而言) */
  readonly alternating: boolean;
  /** 为什么半径是这个数 —— 页面上要讲出来 */
  readonly why: string;
  readonly tex: string;
  readonly xRange: readonly [number, number];
  readonly startX: number;
  /**
   * 画图时纵轴的半高。
   * ⚠️ 第一版用 `|y| < 40` 过滤样本来定范围 —— 那个 40 没有来历,
   *   而且几何级数在 x → 1 附近能取到几十,于是纵轴被拉到 ±40,
   *   整条曲线在屏幕上压成了一条缝。**范围要按这个函数自己的量级给。**
   */
  readonly yCap: number;
}

function factorial(k: number): number {
  let r = 1;
  for (let i = 2; i <= k; i += 1) r *= i;
  return r;
}

export const SERIES: readonly Series[] = [
  {
    /** ⭐⭐ 这一课的反例就靠它:`R = 1`,而 `x` 可以拖到 2。 */
    id: 'geometric',
    singularities: [1],
    yCap: 4,
    label: '1 / (1 − x)',
    f: (x) => 1 / (1 - x),
    fc: (z) => cDiv(cx(1), cSub(cx(1), z)),
    coeff: () => 1,
    radius: 1,
    convergesAtRight: false,              // x = 1:1+1+1+… 发散
    convergesAtLeft: false,               // x = −1:1−1+1−… 不收敛
    maxDerivAbs: (n, x) => factorial(n + 1) / Math.abs(1 - Math.max(0, x)) ** (n + 2),
    alternating: false,
    why: 'The function blows up at x = 1, and the radius can never reach past a blow-up. Distance from 0 to 1 is 1, so R = 1.',
    tex: '\\frac{1}{1-x} = \\sum_{k=0}^{\\infty} x^k',
    xRange: [-2.4, 2.4],
    // ⭐ 默认就停在 x = 2:那里部分和是 1, 3, 7, 15…,每加一项误差**翻一倍**。
    //   这一课的反例不该等人拖三下滑块才撞见。
    startX: 2,
  },
  {
    id: 'exp',
    singularities: [],
    yCap: 12,
    label: 'eˣ',
    f: Math.exp,
    fc: cExp,
    coeff: (k) => 1 / factorial(k),
    radius: Number.POSITIVE_INFINITY,
    convergesAtRight: true,
    convergesAtLeft: true,
    maxDerivAbs: (_n, x) => Math.exp(Math.max(0, x)),
    alternating: false,
    why: 'e^x never blows up anywhere, so there is nothing for the radius to run into. R is infinite.',
    tex: 'e^x = \\sum_{k=0}^{\\infty} \\frac{x^k}{k!}',
    xRange: [-6, 6],
    startX: 2.5,
  },
  {
    id: 'sin',
    singularities: [],
    yCap: 1.6,
    label: 'sin x',
    f: Math.sin,
    fc: cSin,
    coeff: (k) => (k % 2 === 0 ? 0 : ((-1) ** ((k - 1) / 2)) / factorial(k)),
    radius: Number.POSITIVE_INFINITY,
    convergesAtRight: true,
    convergesAtLeft: true,
    maxDerivAbs: () => 1,                 // 所有阶导数都是 ±sin 或 ±cos
    alternating: true,
    why: 'Every derivative of sin x is another sine or cosine, so nothing ever blows up. R is infinite.',
    tex: '\\sin x = \\sum_{k=0}^{\\infty} \\frac{(-1)^k x^{2k+1}}{(2k+1)!}',
    xRange: [-11, 11],
    startX: 4.2,
  },
  {
    /** ⭐ 端点是单独一问:右端 `x = 1` 收敛(交错调和),左端 `x = −1` 发散。 */
    id: 'ln1p',
    singularities: [-1],
    yCap: 2.6,
    label: 'ln(1 + x)',
    f: (x) => Math.log(1 + x),
    fc: (z) => cLog(cAdd(cx(1), z)),
    coeff: (k) => (k === 0 ? 0 : ((-1) ** (k - 1)) / k),
    radius: 1,
    convergesAtRight: true,               // x = 1:交错调和级数,收敛到 ln 2
    convergesAtLeft: false,               // x = −1:−调和级数,发散
    maxDerivAbs: (n, x) => factorial(n) / (1 + Math.min(0, x)) ** (n + 1),
    alternating: true,
    why: 'ln(1 + x) blows up at x = −1, one unit to the left of the centre, so R = 1 — even though the function itself is perfectly fine far to the right.',
    tex: '\\ln(1+x) = \\sum_{k=1}^{\\infty} \\frac{(-1)^{k-1} x^k}{k}',
    xRange: [-1.6, 2.4],
    startX: 0.8,
  },
] as const;

export function seriesOf(id: string): Series {
  return SERIES.find((s) => s.id === id) ?? SERIES[0]!;
}

/* ══ 路径 ① —— 通项闭式 ═══════════════════════════════════════════ */

export function coeffClosed(s: Series, k: number): number {
  return s.coeff(k);
}

/* ══ 路径 ② —— Cauchy 积分公式(只认识 f 本身) ═══════════════════ */

/**
 * ⭐ `aₖ = (1/2πi) ∮ f(z)/z^{k+1} dz`,沿半径 `r` 的圆用梯形法积。
 *   展开成实数形式就是:`aₖ = (1/N) Σⱼ f(r e^{iθⱼ}) e^{−ikθⱼ} / rᵏ`。
 *
 * ⚠️ `r` 必须**小于收敛半径** —— 圆一旦套住奇点,这条公式就不成立了。
 *   这不是数值问题,是定理的前提。
 */
export function coeffCauchy(s: Series, k: number, r?: number, N = 512): number {
  const rad = r ?? (Number.isFinite(s.radius) ? s.radius * 0.55 : 1.2);
  let re = 0;
  let visited = 0;
  for (let j = 0; j < N; j += 1) {
    const th = (2 * Math.PI * j) / N;
    const z = cx(rad * Math.cos(th), rad * Math.sin(th));
    const fz = s.fc(z);
    // f(z) · e^{−ikθ} 的实部
    const c = Math.cos(k * th);
    const sn = Math.sin(k * th);
    re += fz.re * c + fz.im * sn;
    visited += 1;
  }
  if (visited !== N) throw new Error('cauchy loop never ran');
  return re / N / rad ** k;
}

/* ══ 部分和 ═══════════════════════════════════════════════════════ */

/** `Sₙ(x) = Σ_{k=0}^{n} aₖ xᵏ`。n 是**最高次数**,不是项数。 */
export function partialSum(s: Series, n: number, x: number): number {
  let sum = 0;
  let visited = 0;
  for (let k = 0; k <= n; k += 1) {
    sum += s.coeff(k) * x ** k;
    visited += 1;
  }
  if (visited !== n + 1) throw new Error('partial sum loop never ran');
  return sum;
}

/** `S₀, S₁, …, Sₙ` 这一串 —— 用来看它到底是**落下去**还是**飞出去**。 */
export function partialSumTrail(s: Series, x: number, n: number): readonly number[] {
  const out: number[] = [];
  let sum = 0;
  for (let k = 0; k <= n; k += 1) {
    sum += s.coeff(k) * x ** k;
    out.push(sum);
  }
  return out;
}

/* ══ 收敛与否 ═════════════════════════════════════════════════════ */

export type Verdict = 'inside' | 'endpoint-converges' | 'endpoint-diverges' | 'outside';

/**
 * ⭐ 这个 x 处级数收敛吗。
 * ⚠️ 端点是**单独一问** —— `|x| = R` 时两边可以一边收敛一边发散
 *   (`ln(1+x)` 正是如此:`x = 1` 收敛,`x = −1` 发散)。
 *   把端点并进"里面"或"外面"都是错的。
 */
export function verdictAt(s: Series, x: number, tol = 1e-9): Verdict {
  if (!Number.isFinite(s.radius)) return 'inside';
  const d = Math.abs(x) - s.radius;
  if (d < -tol) return 'inside';
  if (d > tol) return 'outside';
  const ok = x > 0 ? s.convergesAtRight : s.convergesAtLeft;
  return ok ? 'endpoint-converges' : 'endpoint-diverges';
}

export function converges(s: Series, x: number): boolean {
  const v = verdictAt(s, x);
  return v === 'inside' || v === 'endpoint-converges';
}

/* ══ 误差与上界 ═══════════════════════════════════════════════════ */

/** 真实误差 `|f(x) − Sₙ(x)|`。f 本身没定义时返回 null。 */
export function trueError(s: Series, n: number, x: number): number | null {
  const fx = s.f(x);
  if (!Number.isFinite(fx)) return null;
  const sn = partialSum(s, n, x);
  if (!Number.isFinite(sn)) return null;
  return Math.abs(fx - sn);
}

/**
 * ⭐⭐ Taylor 定理在这个 x 处**适用**吗。
 *
 * ⚠️ 前提是 f 在 0 与 x 之间(闭区间)处处可导。
 *   中间夹着一个奇点,定理就不成立 —— 这时**没有**什么 Lagrange 上界可言,
 *   不是"上界很大",是这句话本身没有意义。
 */
export function taylorApplies(s: Series, x: number): boolean {
  const lo = Math.min(0, x);
  const hi = Math.max(0, x);
  return !s.singularities.some((p) => p >= lo && p <= hi);
}

/**
 * ⭐⭐ Lagrange 余项上界:`max|f⁽ⁿ⁺¹⁾| · |x|ⁿ⁺¹ / (n+1)!`
 *
 * ⚠️ 它是**上界**,不是误差本身。页面必须把两个数并排显示,
 *   让学生看见"罩得住"和"贴得紧"是两回事。
 *
 * ⚠️⚠️ 而 0 与 x 之间夹着奇点时返回 `null` —— 定理不适用,就不该给数。
 */
export function lagrangeBound(s: Series, n: number, x: number): number | null {
  if (!taylorApplies(s, x)) return null;
  const m = s.maxDerivAbs(n, x);
  if (!Number.isFinite(m) || m < 0) return null;
  const b = (m * Math.abs(x) ** (n + 1)) / factorial(n + 1);
  return Number.isFinite(b) ? b : null;
}

/**
 * 从 k 开始(含)第一个**非零**项的绝对值,以及它的次数。
 *
 * ⚠️⚠️ 这个辅助函数是被一个真实的 bug 逼出来的:
 *   `sin x` 的级数在**所有偶次**上系数为 0。第一版直接取 `a_{n+1}x^{n+1}`,
 *   于是 n 取偶数时"下一项"正好落在一个 0 上,**上界报成 0,而真实误差不是 0**。
 *   一条恒等于 0 的上界比没有上界更糟 —— 它看起来像"已经精确了"。
 *
 * ⭐ 交错级数判别法说的从来是**非零项**那一串:`x − x³/3! + x⁵/5! − …`。
 *   中间那些 0 是书写方式,不是级数的项。
 */
function nextNonzeroTerm(s: Series, k: number, x: number, lookahead = 64): { deg: number; mag: number } | null {
  for (let d = k; d <= k + lookahead; d += 1) {
    const c = s.coeff(d);
    if (c === 0) continue;
    const mag = Math.abs(c * x ** d);
    return Number.isFinite(mag) ? { deg: d, mag } : null;
  }
  return null;
}

/**
 * ⭐ 交错级数的误差上界 = **下一个非零项**的绝对值。
 * ⚠️ 两个前提缺一不可:级数交错,**且**非零项的绝对值单调递减。
 *   前提不成立时返回 `null` —— 绝不硬给一个数。
 */
export function alternatingBound(s: Series, n: number, x: number): number | null {
  if (!s.alternating || !converges(s, x)) return null;
  if (x === 0) return 0;
  const next = nextNonzeroTerm(s, n + 1, x);
  if (next === null) return null;
  // 单调递减这一条要当场验,不能假设:拿**再下一个**非零项和它比
  const after = nextNonzeroTerm(s, next.deg + 1, x);
  if (after !== null && after.mag > next.mag) return null;
  return next.mag;
}

/* ══ 画图 ═════════════════════════════════════════════════════════ */

export function sampleF(s: Series, n = 320): readonly { x: number; y: number }[] {
  const [lo, hi] = s.xRange;
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i <= n; i += 1) {
    const x = lo + ((hi - lo) * i) / n;
    const y = s.f(x);
    if (Number.isFinite(y)) out.push({ x, y });
  }
  return out;
}

export function sampleSn(s: Series, deg: number, n = 320): readonly { x: number; y: number }[] {
  const [lo, hi] = s.xRange;
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i <= n; i += 1) {
    const x = lo + ((hi - lo) * i) / n;
    const y = partialSum(s, deg, x);
    if (Number.isFinite(y)) out.push({ x, y });
  }
  return out;
}

export function clampX(s: Series, x: number): number {
  if (!Number.isFinite(x)) return s.startX;
  return Math.min(Math.max(x, s.xRange[0]), s.xRange[1]);
}

/* ══ 显示 ═════════════════════════════════════════════════════════ */

export const HEADLINE = 'More Terms Is Not the Same as More Accurate';
export const MAIN_IDEA =
  'A Taylor polynomial improves as you add terms only inside the radius of convergence. Outside it, every extra term makes the answer worse — not slightly worse, but doubling-away worse.';

export const DIVERGE_NOTE =
  'Watch the running total. It is not creeping toward the true value and falling short; it is walking away from it, and each new term doubles the distance. No number of terms will fix this, because the series simply does not converge here.';

export const NO_THEOREM_NOTE =
  'There is no Lagrange bound to quote here. The theorem asks for f to be differentiable everywhere between 0 and x, and a blow-up sits in the way. A bound is not merely large in this situation — the statement does not apply at all, so any number would be decoration.';

export const BOUND_NOTE =
  'The Lagrange remainder is an upper bound on the error, not the error. Being much larger than the true error is not a flaw in it — a bound that is never exceeded is doing its job. What would be a flaw is the error ever crossing above it.';

export const ENDPOINT_NOTE =
  'At exactly |x| = R the radius tells you nothing — the two ends have to be settled separately, and they can disagree. For ln(1 + x) the right end converges and the left end does not.';

export function show(v: number | null, places = 4): string {
  return v === null || !Number.isFinite(v) ? 'undefined' : showNumber(v, places);
}
