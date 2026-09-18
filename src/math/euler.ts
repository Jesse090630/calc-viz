/**
 * MATH — 欧拉法:**它不会告诉你它错了。**
 *
 * ⭐⭐ 这一课接着 `#/slope-field`。那一课说"解是顺着方向走出来的那条线";
 *   欧拉法就是真的照着走 —— 一步一个方向,走出一条折线。
 *   BC 只考这一个数值方法,而学生对它有三个想当然:
 *
 *   ❶ **"误差是随机的,走长了会互相抵消。"**
 *      不会。`y' = y` 的解是凸的,每一步的切线都在曲线**下方**,
 *      于是每一步都偏低,而且**一直朝同一个方向偏**。那是**系统偏差**,不是噪声。
 *      ⚠️ 但也不能反过来说成定律:`y' = sin x` 在 `[0, 2π]` 上二阶导会变号,偏差就真的会抵消。
 *      所以页面上两个都要有,不然"凸性决定偏向"这句话就成了空话。
 *
 *   ❷ **"步长小一点就准了。"**
 *      欧拉法是**一阶**的:步长减半,误差只减一半。
 *      想多要一位小数,得多走十倍的步。这个"慢"要让学生自己在表里看出来 ——
 *      比值那一列全是 2,而不是 4、不是 16。
 *
 *   ❸ ⭐⭐⭐ **"再不济也就是不太准。"**
 *      这条错得最厉害。`y' = −20(y − 1)` 的真解单调地趋向 1,
 *      而欧拉法在 `h > 0.1` 时会**上下震荡并炸开** ——
 *      它给出的不是"不准的答案",是**定性上相反的行为**,
 *      而且过程中每一个数看起来都很正常。
 *      放大因子是 `|1 + hλ|`,λ 是 `∂f/∂y`。这是一条能算的判据,不是感觉。
 *
 *   ❹ 还有一个同族的毛病:`y' = y²` 过 `(0,1)` 的解在 `x = 1` 处**不再存在**,
 *      而欧拉法照样一步步走过去,递给你一串有限的数。
 *      (`#/slope-field` 里 RK4 跨过 `y = 0` 落到圆的下半圈,是同一种病。)
 *
 * ⭐ 两条互不相干的路径求同一个"真解":
 *   ① `exactAt`    —— 闭式;
 *   ② `accurateAt` —— 极小步长的 RK4,只用 `f`,完全不碰闭式。
 *   欧拉法本身是**被研究的对象**,不是验证手段。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import { showNumber } from './format';

export type Pt = readonly [number, number];

/* ══ 方程 ══════════════════════════════════════════════════════════ */

export interface Eq {
  readonly id: string;
  readonly label: string;
  readonly tex: string;
  readonly f: (x: number, y: number) => number;
  /** 闭式解;**超出这条解的定义域返回 `null`**。 */
  readonly exact: (x: number) => number | null;
  readonly exactTex: string;
  readonly x0: number;
  readonly y0: number;
  /** 表格与读数统一在这个 x 上比 —— 所有 h 都能正好落在上面。 */
  readonly checkAt: number;
  /** 画框 `[x0, x1, y0, y1]` */
  readonly window: readonly [number, number, number, number];
  /** 滑块能选的步长 `[最小, 最大, 步进]` */
  readonly hRange: readonly [number, number, number];
  /**
   * `∂f/∂y`(在这一课关心的那条解附近是常数的话就写它),否则 `null`。
   * ⭐ 只有常系数的那一个才谈得上干净的稳定性判据。
   */
  readonly lambda: number | null;
  /** 这条解**到此为止**(`y' = y²` 在 x = 1 处),没有就是 `null`。 */
  readonly validUntil: number | null;
  readonly note: string;
}

export const EQS: readonly Eq[] = [
  {
    /** ❶ 凸 ⇒ 切线永远在下方 ⇒ 每一步都偏低。**偏差同向,不抵消。** */
    id: 'exp',
    label: "y′ = y — every step lands low, and they never cancel",
    tex: String.raw`y' = y,\quad y(0) = 1`,
    f: (_x, y) => y,
    exact: (x) => Math.exp(x),
    exactTex: String.raw`y = e^{x}`,
    x0: 0, y0: 1,
    checkAt: 1,
    window: [0, 1, 0.8, 3.1],
    hRange: [0.05, 0.5, 0.05],
    lambda: 1,
    validUntil: null,
    note: 'The solution is concave up, so every tangent line sits below the curve, so every step lands below where it should. The errors all point the same way and pile up. This is a bias, not noise, and no amount of averaging removes it.',
  },
  {
    /**
     * ⚠️ 反过来的例子:二阶导**变号**,偏差就真的会抵消。
     *
     * ⚠️⚠️ 第一版写的是 `y' = cos x` 在 `[0, π/2]` 上 —— 那是错的:
     *   `sin` 在那一段上全程凹,切线**始终在上方**,偏差一次也不变号。
     *   要让它变号,得让 `f(x)` 越过 `f(x₀)`:左端点求和的误差约是
     *   `(h/2)(f(x₀) − f(x))`,`f = sin`、`f(0) = 0` 时它在 `x = π` 处换符号。
     *   所以换成 `y' = sin x` 并把区间放到 `[0, 2π]`。
     */
    id: 'wave',
    label: 'y′ = sin x — here the errors really do cancel',
    tex: String.raw`y' = \sin x,\quad y(0) = 0`,
    f: (x) => Math.sin(x),
    exact: (x) => 1 - Math.cos(x),
    exactTex: String.raw`y = 1 - \cos x`,
    x0: 0, y0: 0,
    checkAt: (3 * Math.PI) / 2,
    window: [0, 2 * Math.PI, -0.15, 2.25],
    hRange: [0.05, 0.4, 0.05],
    lambda: 0,
    validUntil: null,
    note: 'The concavity changes sign partway along, so the polygon runs below the curve on one stretch and above it on the next, and the two errors eat into each other. Whether the errors pile up or cancel is decided by the second derivative of the solution, not by the method — which is what makes the previous case a fact about that equation rather than a law about Euler.',
  },
  {
    /**
     * ⚠️⚠️ 第三种偏向:**凹** ⇒ 切线永远在上方 ⇒ 每一步都偏高。
     *
     * 加这一个不是为了凑数。没有它,`biasOf` 的 `'above'` 那一支
     * **从界面上根本走不到** —— 前面三个方程的解要么凸(偏低)、
     * 要么凹凸变号(mixed)。这个项目已经在"写了警告状态却没有路径到达"
     * 上栽过四次,这次在建之前就查了一遍。
     * ⭐ 而且凑齐三种之后,"凹凸性决定偏向"这句话才算被演完:
     *   凸 → 全在下方,凹 → 全在上方,变号 → 两边都有。
     */
    id: 'log',
    label: 'y′ = 1/(1 + x) — concave, so every step lands high',
    tex: String.raw`y' = \frac{1}{1 + x},\quad y(0) = 0`,
    f: (x) => 1 / (1 + x),
    exact: (x) => Math.log(1 + x),
    exactTex: String.raw`y = \ln(1 + x)`,
    x0: 0, y0: 0,
    checkAt: 2,
    window: [0, 3, -0.1, 1.55],
    hRange: [0.05, 0.5, 0.05],
    lambda: 0,
    validUntil: null,
    note: 'This solution is concave down, so every tangent line sits above the curve and every step lands high. Same method, same kind of systematic error, opposite direction — which is the point: the sign is a fact about the solution\u2019s concavity, and the method has no say in it.',
  },
  {
    /**
     * ⭐⭐⭐ 整课的重头。`|1 + hλ| > 1` 时数值解震荡并炸开,
     * 而真解安安静静地趋向 1。**定性相反,而不是不准。**
     */
    id: 'stiff',
    label: 'y′ = −20(y − 1) — past h = 0.1 the answer flips sign every step',
    tex: String.raw`y' = -20(y - 1),\quad y(0) = 2`,
    f: (_x, y) => -20 * (y - 1),
    exact: (x) => 1 + Math.exp(-20 * x),
    exactTex: String.raw`y = 1 + e^{-20x}`,
    x0: 0, y0: 2,
    /**
     * ⚠️⚠️ `checkAt` 不能放在 0.5:那里真解已经等于 1(差 e^{−10} ≈ 4.5e−5),
     *   误差被这个"离平衡还有多远"支配,而不是被方法支配 ——
     *   表里的比值会是 1.0 而不是 2,看上去像是欧拉法突然变成零阶了。
     *   放在 0.1(真解 1 + e^{−2} ≈ 1.135)才落在真正的一阶区间里。
     */
    checkAt: 0.1,
    /**
     * 画框要装得下震荡的头几步(2 → −1 → 5),又要让真解那条还看得清。
     * ⚠️ 横向到 0.4 就够:h = 0.15 时第三步已经出框,再宽只是留一片空白。
     */
    window: [0, 0.4, -3, 5],
    hRange: [0.02, 0.2, 0.005],
    lambda: -20,
    validUntil: null,
    note: 'The true solution drops to 1 and stays there. Each Euler step multiplies the distance from 1 by 1 + hλ, so once |1 + hλ| exceeds 1 the polygon swings past the target and overshoots further every step. The failure is not that the numbers are off — it is that they describe the opposite behaviour, one plausible-looking value at a time.',
  },
  {
    /** ❹ 真解在 x = 1 处不再存在,而欧拉法照样递给你有限的数。 */
    id: 'blowup',
    label: 'y′ = y² — the solution stops existing and Euler keeps answering',
    tex: String.raw`y' = y^2,\quad y(0) = 1`,
    f: (_x, y) => y * y,
    /**
     * ⚠️ 这里只写**闭式本身**,定义域交给 `validUntil` 管。
     *   `1/(1 − 1.2) = −5` 是个正正经经的有限数,属于另一支;
     *   把"到此为止"混进公式里,就分不清"公式算不出来"和
     *   "这条初值问题的解到此为止"这两件不一样的事了。
     */
    exact: (x) => (x === 1 ? null : 1 / (1 - x)),
    exactTex: String.raw`y = \frac{1}{1 - x}`,
    x0: 0, y0: 1,
    checkAt: 0.5,
    window: [0, 1.4, 0, 12],
    hRange: [0.05, 0.35, 0.05],
    lambda: null,
    validUntil: 1,
    note: 'This solution exists only up to x = 1; past that there is nothing to approximate. Euler does not know and does not stop. It walks across the vertical asymptote and hands back ordinary-looking numbers for a function that is no longer there.',
  },
] as const;

export function eqOf(id: string): Eq {
  return EQS.find((e) => e.id === id) ?? EQS[0]!;
}

/* ══ 欧拉法本身 ════════════════════════════════════════════════════ */

export interface Stepped {
  readonly pts: readonly Pt[];
  /** 走出画框(或者数值爆掉)而提前停了吗 */
  readonly cut: boolean;
}

/**
 * 从 `(x0, y0)` 走 `n` 步,每步 `h`。
 *
 * ⚠️ **不做任何自适应、不做任何刹车。** 这一课的主角就是"它不会喊停":
 *   `#/slope-field` 里那个 RK4 加了步长加倍法做判据,是因为那里要的是**正确的解**;
 *   这里要的是**欧拉法的真实行为**,给它装刹车就等于把要讲的东西藏起来。
 *   唯一的中止是画框和非有限值 —— 那只是没法画,不是算法自己知道错了。
 */
export function eulerPath(e: Eq, h: number, steps?: number): Stepped {
  const [, xEnd, ylo, yhi] = e.window;
  const n = steps ?? Math.max(1, Math.round((xEnd - e.x0) / h));
  const pts: Pt[] = [[e.x0, e.y0]];
  let x = e.x0;
  let y = e.y0;
  for (let i = 0; i < n; i += 1) {
    const slope = e.f(x, y);
    if (!Number.isFinite(slope)) return { pts, cut: true };
    y += h * slope;
    x += h;
    if (!Number.isFinite(y) || y < ylo || y > yhi || x > xEnd + 1e-12) {
      return { pts, cut: true };
    }
    pts.push([x, y]);
  }
  return { pts, cut: false };
}

/** 欧拉法在 `e.checkAt` 处给出的值。步数取整,保证正好落在那一点上。 */
export function eulerAt(e: Eq, n: number): number {
  const h = (e.checkAt - e.x0) / n;
  let y = e.y0;
  let x = e.x0;
  for (let i = 0; i < n; i += 1) {
    y += h * e.f(x, y);
    x += h;
  }
  return y;
}

/* ══ 真解:两条互不相干的路径 ═════════════════════════════════════ */

/** 路径 ① —— 闭式。超出这条解的定义域返回 `null`。 */
export function exactAt(e: Eq, x: number): number | null {
  if (e.validUntil !== null && x >= e.validUntil) return null;
  const v = e.exact(x);
  return v === null || !Number.isFinite(v) ? null : v;
}

/**
 * 路径 ② —— 极小步长的 RK4,**只用 `f`**,完全不碰闭式。
 * ⚠️ 走到没法走(非有限)就返回 `null`,不许硬撑出一个数来。
 */
export function accurateAt(e: Eq, x: number, perUnit = 20_000): number | null {
  const span = x - e.x0;
  const n = Math.max(1, Math.ceil(Math.abs(span) * perUnit));
  const h = span / n;
  let y = e.y0;
  let t = e.x0;
  for (let i = 0; i < n; i += 1) {
    const k1 = e.f(t, y);
    const k2 = e.f(t + h / 2, y + (h / 2) * k1);
    const k3 = e.f(t + h / 2, y + (h / 2) * k2);
    const k4 = e.f(t + h, y + h * k3);
    y += (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
    t += h;
    if (!Number.isFinite(y) || Math.abs(y) > 1e12) return null;
  }
  return y;
}

/** 真解在画框里的取样;`null` 表示抬笔(解到此为止)。 */
export function exactPath(e: Eq, n = 400): readonly (Pt | null)[] {
  const [, xEnd, ylo, yhi] = e.window;
  const out: (Pt | null)[] = [];
  for (let i = 0; i <= n; i += 1) {
    const x = e.x0 + ((xEnd - e.x0) * i) / n;
    const y = exactAt(e, x);
    if (y === null || y < ylo || y > yhi) { out.push(null); continue; }
    out.push([x, y]);
  }
  return out;
}

/* ══ ❶ 偏向:误差抵不抵消 ═════════════════════════════════════════ */

export type Bias = 'below' | 'above' | 'mixed';

/**
 * ⭐ 欧拉折线整条在真解**下方**、**上方**,还是两边都有。
 *
 * ⚠️ 这是"误差会不会抵消"这句话的精确版本。
 *   `y' = y`(凸)全程 below;`y' = cos x`(凹凸变号)mixed。
 *   容差取真解自己的量级,不是绝对数 —— 起点上两者本来就相等。
 */
export function biasOf(e: Eq, h: number): Bias {
  const { pts } = eulerPath(e, h);
  let low = 0;
  let high = 0;
  for (const [x, y] of pts) {
    const t = exactAt(e, x);
    if (t === null) continue;
    const d = y - t;
    const scale = Math.max(Math.abs(t), 1) * 1e-9;
    if (d < -scale) low += 1;
    else if (d > scale) high += 1;
  }
  if (low > 0 && high > 0) return 'mixed';
  if (low > 0) return 'below';
  return 'above';
}

/* ══ ❷ 阶:步长减半,误差只减一半 ═════════════════════════════════ */

export interface Row {
  readonly n: number;
  readonly h: number;
  readonly value: number;
  readonly error: number;
  /** 上一行误差 ÷ 这一行误差。⚠️ 第一行没有上一行,是 `null`。 */
  readonly ratio: number | null;
}

export const STEP_COUNTS: readonly number[] = [10, 20, 40, 80, 160];

/**
 * ⭐⭐ 步数翻倍表。比值那一列**全是 2**,这就是"一阶"的意思。
 *
 * ⚠️ 误差拿闭式做基准 —— 拿更小步长的欧拉法当基准就是自己验自己。
 */
export function orderTable(e: Eq, counts = STEP_COUNTS): readonly Row[] {
  const truth = exactAt(e, e.checkAt);
  if (truth === null) return [];
  const out: Row[] = [];
  let prev: number | null = null;
  for (const n of counts) {
    const value = eulerAt(e, n);
    const error = Math.abs(value - truth);
    out.push({
      n,
      h: (e.checkAt - e.x0) / n,
      value,
      error,
      ratio: prev === null || error === 0 ? null : prev / error,
    });
    prev = error;
  }
  return out;
}

/**
 * 由表估出来的收敛阶(比值取以 2 为底的对数,再平均)。
 * ⭐ 欧拉法应该给出 ≈ 1。这是**量出来的**,不是写死的。
 */
export function observedOrder(e: Eq): number | null {
  const rows = orderTable(e).filter((r) => r.ratio !== null && r.ratio > 0);
  if (rows.length === 0) return null;
  const sum = rows.reduce((a, r) => a + Math.log2(r.ratio!), 0);
  return sum / rows.length;
}

/* ══ ❸ 稳定性:能算的判据 ═════════════════════════════════════════ */

export type Stability = 'stable' | 'marginal' | 'unstable' | 'n/a';

/** 每走一步,离平衡的距离被乘上的倍数 `|1 + hλ|`。 */
export function amplification(e: Eq, h: number): number | null {
  return e.lambda === null ? null : Math.abs(1 + h * e.lambda);
}

/**
 * ⭐⭐⭐ 这一课最该被记住的一句话有个数值形式。
 * ⚠️ `marginal`(恰好等于 1)是**真的存在**的一档,滑块也走得到,
 *   所以不能把它并进 stable 里 —— 并进去就是在页面上说谎。
 */
export function stabilityOf(e: Eq, h: number, tol = 1e-12): Stability {
  const a = amplification(e, h);
  if (a === null) return 'n/a';
  if (Math.abs(a - 1) <= tol) return 'marginal';
  return a < 1 ? 'stable' : 'unstable';
}

/** 稳定的步长上界:`|1 + hλ| ≤ 1` ⇒ `h ≤ 2/|λ|`(λ < 0 时)。 */
export function stableLimit(e: Eq): number | null {
  if (e.lambda === null || e.lambda >= 0) return null;
  return 2 / Math.abs(e.lambda);
}

/* ══ ❹ 真解已经没了,而它还在答 ═══════════════════════════════════ */

/**
 * 欧拉折线里,**落在真解定义域之外**的那些点。
 * ⭐ 非空就意味着:屏幕上那一段折线对应的函数根本不存在。
 */
export function pastTheEnd(e: Eq, h: number): readonly Pt[] {
  if (e.validUntil === null) return [];
  return eulerPath(e, h).pts.filter(([x]) => x >= e.validUntil!);
}

/* ══ 说明 ═════════════════════════════════════════════════════════ */

export interface Claim {
  readonly n: string;
  readonly said: string;
  readonly truth: string;
}

/** ⭐ 论点前置:学生对欧拉法的三个想当然,以及各自错在哪。 */
export const CLAIMS: readonly Claim[] = [
  {
    n: '1',
    said: 'the errors average out',
    truth: 'Concavity decides the sign of every step’s error at once. On a curve that is concave up, every step lands low and they add.',
  },
  {
    n: '2',
    said: 'a smaller step fixes it',
    truth: 'Halving h halves the error and nothing more. One extra decimal place costs ten times the steps.',
  },
  {
    n: '3',
    said: 'at worst it is a bit off',
    truth: 'Past |1 + h·∂f/∂y| = 1 the polygon oscillates and grows while the true solution settles. That is the opposite behaviour, not a loose answer.',
  },
] as const;

export const HEADLINE = 'It Will Not Tell You It Is Wrong';
export const MAIN_IDEA =
  'Euler’s method walks along the direction field one straight step at a time. Every value it returns looks like an ordinary number, including the ones describing a curve that bends the other way, and the ones describing a solution that no longer exists.';

export const ORDER_NOTE =
  'Each row halves the step. For a first-order method the error ratio settles at 2 — not 4, not 16. That is the whole cost of the method stated in one column.';

export function show(v: number | null, places = 4): string {
  return v === null || !Number.isFinite(v) ? 'undefined' : showNumber(v, places);
}
