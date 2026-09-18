/**
 * MATH — 斜率场与分离变量:**被除掉的那个解。**
 *
 * ⭐⭐ 单元 7 在这个网站上一课都没有,而它年年出现在 BC 自由作答里。
 *   这一课的支点是学生做分离变量时闭着眼睛做的那一步:
 *
 *     dy/dx = y   →   dy/y = dx   →   ln|y| = x + c   →   y = Ce^x
 *                      ↑
 *                两边同除以 y。可 y = 0 呢?
 *
 *   `y = 0` 本身就是一个解(左边 0,右边 0),而它恰好是被这一步除掉的那个。
 *   ⚠️ 在 `dy/dx = y` 上学生**蒙混过关**了 —— `C = 0` 正好把它补回来。
 *   于是所有人都以为"通解涵盖一切",再也不检查。
 *
 * ⭐⭐⭐ 真正的反例是 `dy/dx = y²`:
 *   通解 `y = −1/(x + C)`,而 `y = 0` **没有任何有限的 C 能给出来**。
 *   `C → ∞` 时它无限接近 0,却永远到不了。**那个解真的被丢了。**
 *
 * ⭐⭐ 而 logistic 方程 `dy/dx = y(1 − y)` 一个人就演完了两边:
 *   通解 `y = 1/(1 + Ce^{−x})`,
 *     · 承载量 `y = 1` 在通解里(`C = 0`);
 *     · 灭绝解 `y = 0` **不在**(又是 `C → ∞`)。
 *   **同一个方程,两个平衡解,一个捡得回来一个捡不回来。**
 *
 * ⭐ 另一条线索:斜率场**不在乎你会不会解**。
 *   `dy/dx = x − y` 分不了离,斜率场照画,解曲线照看得见。
 *
 * ⭐ 两条互不相干的路径求同一条解曲线:
 *   ① `curveByFormula`  —— 用初值定出 C,再代通解(纯代数);
 *   ② `curveBySteppin`  —— 只用 `f` 沿方向走 RK4(纯数值,完全不碰通解)。
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
  /** `dy/dx = f(x, y)`。⚠️ 没有定义的地方返回 `null`,绝不返回 Infinity。 */
  readonly f: (x: number, y: number) => number | null;
  /** 分离变量做得动吗 */
  readonly separable: boolean;
  /** 通解 `y(x; C)`;超出定义域返回 `null`。 */
  readonly family: (x: number, C: number) => number | null;
  readonly familyTex: string;
  /**
   * 由初值定出的 `C`。
   * ⚠️⚠️ **平衡解上会返回 `null`** —— 那正是这一课要看见的事:
   *   解明明存在,通解里却没有它的位置。
   */
  readonly cFrom: (p: Pt) => number | null;
  /** 常数解(平衡解):`f(x, k) = 0` 对每个 x 都成立。 */
  readonly equilibria: readonly number[];
  /** 画框 `[x0, x1, y0, y1]` */
  readonly window: readonly [number, number, number, number];
  /** 可点的初值点 */
  readonly starts: readonly Pt[];
  readonly note: string;
}

export const EQS: readonly Eq[] = [
  {
    /** ⚠️ 学生蒙混过关的那一个:丢掉的解正好被 C = 0 补回来。 */
    id: 'exp',
    label: "dy/dx = y — the one everybody gets away with",
    tex: String.raw`\frac{dy}{dx} = y`,
    f: (_x, y) => y,
    separable: true,
    family: (x, C) => C * Math.exp(x),
    familyTex: String.raw`y = Ce^{x}`,
    cFrom: ([x0, y0]) => y0 * Math.exp(-x0),
    equilibria: [0],
    window: [-3, 3, -3, 3],
    starts: [[0, 1], [0, -1], [0, 0.35], [0, 0]],
    note: 'Separating variables divides both sides by y, which is not allowed where y = 0 — and y = 0 solves the equation. Here the loss is invisible: C = 0 hands it straight back. Getting away with it once is why the step stops being checked.',
  },
  {
    /** ⭐⭐⭐ 同一步骤,同样丢掉 y = 0 —— 这一次捡不回来了。 */
    id: 'square',
    label: 'dy/dx = y² — the same step, and now the solution is gone',
    tex: String.raw`\frac{dy}{dx} = y^2`,
    f: (_x, y) => y * y,
    separable: true,
    family: (x, C) => {
      const d = x + C;
      return d === 0 ? null : -1 / d;
    },
    familyTex: String.raw`y = \frac{-1}{x + C}`,
    cFrom: ([x0, y0]) => (y0 === 0 ? null : -1 / y0 - x0),
    equilibria: [0],
    window: [-3, 3, -3, 3],
    starts: [[0, 1], [0, -1], [0, 0.4], [0, 0]],
    note: 'Exactly the same division by y, and y = 0 is still a solution. But no finite C makes −1/(x + C) the zero function. Large C brings the curve close to the axis and never puts it there. This solution is not hiding in the general formula — it was thrown away and never came back.',
  },
  {
    /**
     * ⭐⭐ 一个方程演完两边:一个平衡解在通解里,另一个不在。
     * BC 明确考 logistic,所以这一屏值两分。
     */
    id: 'logistic',
    label: 'dy/dx = y(1 − y) — two equilibria, only one of them in the formula',
    tex: String.raw`\frac{dy}{dx} = y(1 - y)`,
    f: (_x, y) => y * (1 - y),
    separable: true,
    family: (x, C) => {
      const d = 1 + C * Math.exp(-x);
      return d === 0 ? null : 1 / d;
    },
    familyTex: String.raw`y = \frac{1}{1 + Ce^{-x}}`,
    cFrom: ([x0, y0]) => (y0 === 0 ? null : (1 / y0 - 1) * Math.exp(x0)),
    equilibria: [0, 1],
    window: [-4, 4, -0.6, 1.9],
    /**
     * ⚠️ 第一个是**默认打开**的那条。放 `(0, 0.5)` 而不是 `(0, 0.08)`:
     *   后者的解曲线左半段几乎贴着 `y = 0`,和那条红色的平衡线叠在一起,
     *   一进页面就分不清"过 (0, 0.08) 的解"和"常数解 y = 0"是两回事。
     *   `(0, 0.5)` 给出的是干干净净的 S 形,上下各一条平衡线,一眼能读。
     */
    starts: [[0, 0.5], [0, 0.08], [0, 1.6], [0, 1], [0, 0]],
    note: 'The carrying capacity y = 1 comes out of the formula at C = 0. The extinction solution y = 0 does not come out of it at all, for the same reason as before. One equation, two constant solutions, and the general formula covers exactly one of them.',
  },
  {
    /**
     * ⭐ 解曲线**不一定是整条直线上的函数**,而且会到头。
     * 斜率场在 y = 0 那一行什么也画不出来 —— 那是方向垂直的地方。
     */
    id: 'circles',
    label: 'dy/dx = −x/y — solution curves that end',
    tex: String.raw`\frac{dy}{dx} = -\frac{x}{y}`,
    f: (x, y) => (y === 0 ? null : -x / y),
    separable: true,
    family: (x, C) => {
      const r2 = C - x * x;
      if (r2 <= 0) return null;
      return Math.sqrt(r2);
    },
    familyTex: String.raw`x^2 + y^2 = C`,
    cFrom: ([x0, y0]) => (y0 <= 0 ? null : x0 * x0 + y0 * y0),
    equilibria: [],
    /**
     * ⚠️⚠️ 纵向**必须对称**,而且 `field` 的默认 `ny` 必须是奇数。
     *   否则没有哪一行格点正好落在 `y = 0` 上,而 `y = 0` 是这个方程
     *   唯一没有定义的地方 —— `dir: null` 那一支就成了**走不到的死分支**,
     *   "那一行是空的"这个论点也就没有画面作证。
     *   `ny = 13` 时 `j = 6` 给出的正是中点,对称窗口下中点就是 0。
     */
    window: [-3, 3, -2.2, 2.2],
    starts: [[0, 2], [0, 1.2], [1, 1]],
    note: 'The solutions are circles, so a solution through a point is only a function on part of the line — it stops where the circle turns vertical. The slope field shows this before any algebra does: along y = 0 there is no direction to draw, because the direction there is straight up.',
  },
  {
    /** ⭐ 斜率场不在乎你会不会分离变量。 */
    id: 'linear',
    label: 'dy/dx = x − y — not separable, and the field does not care',
    tex: String.raw`\frac{dy}{dx} = x - y`,
    f: (x, y) => x - y,
    separable: false,
    family: (x, C) => x - 1 + C * Math.exp(-x),
    familyTex: String.raw`y = x - 1 + Ce^{-x}`,
    cFrom: ([x0, y0]) => (y0 - x0 + 1) * Math.exp(x0),
    equilibria: [],
    window: [-2, 4, -3, 4],
    starts: [[0, 2], [0, -2], [0, -1]],
    note: 'Nothing separates here, so the recipe does not start. The slope field is unaffected: every point still has a direction, and the solution through a point is still the curve that follows them. Reading a slope field is not a consolation prize for failing to solve the equation.',
  },
] as const;

export function eqOf(id: string): Eq {
  return EQS.find((e) => e.id === id) ?? EQS[0]!;
}

/* ══ 平衡解 ════════════════════════════════════════════════════════ */

/**
 * 通解取这个 `C` 时,是不是**恒等于**常数 `k`。
 *
 * ⚠️⚠️ 判据必须是**精确相等**,不许写成"差得够小"。
 *   `−1/(x + 10⁹)` 处处都在 0 的 1e−9 之内,而它**永远不是** 0 ——
 *   这一课的全部分量就压在这个区别上。判据一放宽,这一课就没了。
 *
 * ⭐ 单独抽出来,是因为留在 `constantC` 里面它测不到:
 *   现有五个方程的 `cFrom` 只要给得出有限的 C,通解就确实是那条常数解,
 *   于是这个检查从来没否决过任何东西 —— 变异体照样活。
 *   抽出来之后可以直接喂给它"很接近但不相等"的 C(见测试)。
 */
export function isConstantSolution(e: Eq, k: number, C: number, n = 40): boolean {
  const [x0, x1] = e.window;
  for (let i = 0; i <= n; i += 1) {
    const x = x0 + ((x1 - x0) * i) / n;
    const v = e.family(x, C);
    // ⚠️ `!==`,不是"差得够小"。差 1e−9 和差 0 在这一课里是**两回事**。
    if (v === null || v !== k) return false;
  }
  return true;
}

export function constantC(e: Eq, k: number): number | null {
  const C = e.cFrom([0, k]);
  if (C === null || !Number.isFinite(C)) return null;
  return isConstantSolution(e, k, C) ? C : null;
}

/** 平衡解里,通解**够不到**的那些。这一课的主角。 */
export function lostEquilibria(e: Eq): readonly number[] {
  return e.equilibria.filter((k) => constantC(e, k) === null);
}

/* ══ 斜率场 ════════════════════════════════════════════════════════ */

export interface Tick {
  readonly at: Pt;
  /** 单位方向向量。⚠️ 长度恒为 1 —— 见下面的说明。 */
  readonly dir: Pt | null;
  readonly slope: number | null;
}

/**
 * 斜率场:每个格点上一小段**等长**的线。
 *
 * ⚠️⚠️ 线段长度绝不能随斜率大小变化。
 *   斜率场要表达的只有**方向**;让陡的地方线也长,等于在图上多说了一件
 *   方程根本没说的事,而且陡的区域会糊成一片。所以这里返回**单位向量**。
 *
 * ⚠️ 没有定义的格点返回 `dir: null`(比如 `−x/y` 在 `y = 0` 那一行)——
 *   那一行空着本身就是信息:方向在那里是竖直的,斜率不存在。
 */
export function field(e: Eq, nx = 17, ny = 13): readonly Tick[] {
  const [x0, x1, y0, y1] = e.window;
  const out: Tick[] = [];
  for (let i = 0; i < nx; i += 1) {
    for (let j = 0; j < ny; j += 1) {
      const x = x0 + ((x1 - x0) * (i + 0.5)) / nx;
      const y = y0 + ((y1 - y0) * (j + 0.5)) / ny;
      const s = e.f(x, y);
      if (s === null || !Number.isFinite(s)) {
        out.push({ at: [x, y], dir: null, slope: null });
        continue;
      }
      const n = Math.hypot(1, s);
      out.push({ at: [x, y], dir: [1 / n, s / n], slope: s });
    }
  }
  return out;
}

/* ══ 路径 ① —— 代数 ═══════════════════════════════════════════════ */

/**
 * 用初值定出 C,再代通解。
 * ⚠️ 走出画框就抬笔(`null`),不要把一条冲到 1e6 的线硬拽回框里 ——
 *   那会画出一条根本不存在的近似竖直的边。
 */
export function curveByFormula(e: Eq, p: Pt, n = 400): readonly (Pt | null)[] {
  const C = e.cFrom(p);
  if (C === null || !Number.isFinite(C)) return [];
  const [x0, x1, ylo, yhi] = e.window;
  const out: (Pt | null)[] = [];
  for (let i = 0; i <= n; i += 1) {
    const x = x0 + ((x1 - x0) * i) / n;
    const y = e.family(x, C);
    if (y === null || !Number.isFinite(y) || y < ylo || y > yhi) { out.push(null); continue; }
    out.push([x, y]);
  }
  return out;
}

/* ══ 路径 ② —— 沿方向走 ═══════════════════════════════════════════ */

/** 一步 RK4。任何一级没有定义就返回 `null`。 */
function rk4(e: Eq, x: number, y: number, d: number): number | null {
  const k1 = e.f(x, y);
  if (k1 === null) return null;
  const k2 = e.f(x + d / 2, y + (d / 2) * k1);
  if (k2 === null) return null;
  const k3 = e.f(x + d / 2, y + (d / 2) * k2);
  if (k3 === null) return null;
  const k4 = e.f(x + d, y + d * k3);
  if (k4 === null) return null;
  const ny = y + (d / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
  return Number.isFinite(ny) ? ny : null;
}

/**
 * ⭐⭐ 只用 `f` 沿方向走 RK4,**完全不碰通解**。从 `p` 向两边各走一趟。
 *
 * ⚠️⚠️ 停下来的条件里,最要紧的一条是**步长已经跟不上曲线了**。
 *
 *   `dy/dx = −x/y` 过 `(0, 2)` 的解是那个圆的上半段,它在 `x = ±2` 处
 *   转成竖直,**作为 x 的函数就到此为止了**。可是定步长的 RK4 不会喊停:
 *   它照走不误,一步跨过 `y = 0`,落到下半圈上,然后一路画回来 ——
 *   于是屏幕上出现一条完整的圆,而"解曲线会到头"这个论点被它抹掉了。
 *   ⭐ 这和 MVT 那一课里差商在尖点上编答案是同一种病:
 *     **数值方法不会大声报错,它会递给你一个看起来很合理的东西。**
 *
 * ⚠️ 判据不许是"斜率大于几就停"那种拍脑袋的阈值。这里用**步长加倍法**:
 *   同一段既走一整步、又走两个半步,两者之差就是本步误差的估计。
 *   曲线转竖直时这个差会炸开,而在光滑处它小得看不见。
 *   容差取画框高度的一万分之一 —— 比一个像素还小两个数量级,
 *   所以"因为误差太大而停"和"看得出来画歪了"绝不会同时发生。
 */
export function stepTol(e: Eq): number {
  return (e.window[3] - e.window[2]) / 10_000;
}

export function curveByStepping(e: Eq, p: Pt, h = 0.004): readonly Pt[] {
  const [x0, x1] = e.window;
  const [, , ylo, yhi] = e.window;
  const tol = stepTol(e);
  const step = (from: Pt, dir: 1 | -1): Pt[] => {
    const pts: Pt[] = [];
    let [x, y] = from;
    const d = dir * h;
    for (let i = 0; i < 4000; i += 1) {
      const whole = rk4(e, x, y, d);
      if (whole === null) break;
      // 步长加倍:两个半步
      const mid = rk4(e, x, y, d / 2);
      if (mid === null) break;
      const halves = rk4(e, x + d / 2, mid, d / 2);
      if (halves === null) break;
      if (Math.abs(halves - whole) > tol) break;   // ⭐ 跟不上了,停
      // ⓘ 两个值里取 `halves`:它是更准的那个,而且已经算出来了,白拿。
      //   改成用 `whole` 不算错,只是**略差一点**(RK4 四阶,差一个 16 倍),
      //   本模块里没有哪个阈值紧到看得出这个差,硬造一个反而脆。
      //   这是个**精度等价变异体**,记在这里,别再花时间去杀它。
      const nx = x + d;
      if (nx < x0 || nx > x1 || halves < ylo || halves > yhi) break;
      x = nx; y = halves;
      pts.push([x, y]);
    }
    return pts;
  };
  const back = step(p, -1).reverse();
  return [...back, p, ...step(p, 1)];
}

/**
 * 两条路径在同一批 x 上的最大差。
 * ⚠️ 只在**两边都有值**的 x 上比 —— 一条到头了另一条还在跑的地方不算。
 * 返回 `null` 表示没有可比的重叠(调用处要把它当"没验成",不是"验过了")。
 * `minOverlap` 露在外面,是为了让那条守卫测得到 —— 要一个比实际重叠还多的数,
 * 它就必须返回 `null`。不然那一支永远走不到。
 */
export function pathGap(e: Eq, p: Pt, minOverlap = 50): number | null {
  const C = e.cFrom(p);
  if (C === null) return null;
  const walked = curveByStepping(e, p);
  let worst = 0;
  let seen = 0;
  for (const [x, y] of walked) {
    const v = e.family(x, C);
    if (v === null || !Number.isFinite(v)) continue;
    // ⚠️ 取**最大**差,不是最后一个差。误差常常在中途最大 ——
    //   `y²` 过 (0, −1) 那条上,峰值是末点的三千多倍。
    worst = Math.max(worst, Math.abs(v - y));
    seen += 1;
  }
  return seen < minOverlap ? null : worst;
}

/* ══ 画图 ═════════════════════════════════════════════════════════ */

/** 把一个点夹回画框里。 */
export function clampTo(e: Eq, p: Pt): Pt {
  const [x0, x1, y0, y1] = e.window;
  const x = Number.isFinite(p[0]) ? Math.min(Math.max(p[0], x0), x1) : (x0 + x1) / 2;
  const y = Number.isFinite(p[1]) ? Math.min(Math.max(p[1], y0), y1) : (y0 + y1) / 2;
  return [x, y];
}

/** 这个点是不是(几乎)落在某个平衡解上。 */
export function equilibriumAt(e: Eq, p: Pt, tol = 1e-9): number | null {
  for (const k of e.equilibria) if (Math.abs(p[1] - k) <= tol) return k;
  return null;
}

/* ══ 说明 ═════════════════════════════════════════════════════════ */

export interface Step {
  readonly n: string;
  readonly what: string;
  /** ⚠️ 这一步有没有偷偷排除掉什么 */
  readonly cost: string | null;
}

/** ⭐ 分离变量的四步,把有代价的那一步**单独标出来**。 */
export const SEPARATION: readonly Step[] = [
  { n: '1', what: 'write dy/dx = g(y)h(x)', cost: null },
  {
    n: '2',
    what: 'divide both sides by g(y)',
    cost: 'Only legal where g(y) ≠ 0. Every root of g is a constant solution, and this is the step that discards them.',
  },
  { n: '3', what: 'integrate both sides', cost: null },
  { n: '4', what: 'solve for y and name the constant C', cost: null },
] as const;

export const HEADLINE = 'The Solution You Divided Away';
export const MAIN_IDEA =
  'Separating variables begins by dividing by a function of y. Wherever that function is zero, the equation has a constant solution, and the division is exactly what removes it. Sometimes C brings it back. Sometimes nothing does.';

export const FIELD_NOTE =
  'A differential equation does not hand you a curve. It hands you a direction at every point. A solution is any curve that follows them, and which one you get is decided entirely by where you start.';

export const RECOVERED = 'the general formula does produce this one, at C = 0';
export const LOST =
  'no finite C produces this one — large C only brings the curve near it';

export function show(v: number | null, places = 4): string {
  return v === null || !Number.isFinite(v) ? 'undefined' : showNumber(v, places);
}
