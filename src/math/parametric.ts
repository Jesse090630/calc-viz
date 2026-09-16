/**
 * MATH — 参数方程:**`dy/dx` 和 `dy/dt` 是两回事。**
 *
 * ⭐⭐ BC 的自由作答题第 2 题几乎永远考这一块,而学生最常见的错只有一句:
 *     **拿 `dy/dt` 当斜率。**
 *
 *   `dy/dt` 说的是"y 随时间变多快",`dx/dt` 说的是"x 随时间变多快"。
 *   曲线的斜率问的是**另一个问题**:走一小段,y 变了多少 **比上** x 变了多少。
 *
 *         dy/dx = (dy/dt) / (dx/dt)
 *
 * ⚠️⚠️ 两个必须让学生**亲眼看到**的反例:
 *
 *   ① **`dx/dt = 0` 时切线是竖直的,斜率不存在** —— 而 `dy/dt` 好端端的。
 *      椭圆最左最右两点就是这样:粒子跑得飞快(速度不为零),斜率却没有定义。
 *      **"还在动"和"有斜率"是两件事。**
 *
 *   ② **`d²y/dx² ≠ (d²y/dt²) / (d²x/dt²)`。** 这是 BC 最常错的一步。
 *      正确的写法是先求出 `dy/dx` 这个**关于 t 的函数**,再对 t 求导、除以 `dx/dt`:
 *
 *         d²y/dx² = [d/dt (dy/dx)] / (dx/dt)
 *
 *      椭圆在 `t = π/4` 处:正确答案约 **−0.63**,而那个想当然的写法给出 **+0.67** ——
 *      **连符号都是反的。**
 *
 * ⭐ 两条互不相干的路径算同一个斜率:
 *   ① `slope`         —— `(dy/dt)/(dx/dt)`,用解析导数,走的是链式法则那条路;
 *   ② `slopeBySecant` —— 在曲线上取 `t ± h` 两个**点**,直接算 `Δy/Δx`。
 *      它根本不知道什么叫参数求导,只是量两点之间的割线。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import { showNumber } from './format';

/* ══ 曲线 ══════════════════════════════════════════════════════════ */

export interface Curve {
  readonly id: string;
  readonly label: string;
  readonly x: (t: number) => number;
  readonly y: (t: number) => number;
  /** 解析一阶导 */
  readonly dx: (t: number) => number;
  readonly dy: (t: number) => number;
  /** 解析二阶导 —— 只用来演示那个**错误**写法,好让它和正确答案摆在一起 */
  readonly d2x: (t: number) => number;
  readonly d2y: (t: number) => number;
  readonly tRange: readonly [number, number];
  readonly startT: number;
  readonly xTex: string;
  readonly yTex: string;
  /** 这条曲线要讲的那件事 */
  readonly note: string;
  /**
   * ⭐ 值得停下来看的那几个 t(竖直切线、尖点)。
   * ⚠️ 它们**必须落在 `tRange` 之内** —— 点不到的例外等于没有。
   */
  readonly marks: readonly { readonly t: number; readonly why: string }[];
}

const TAU = 2 * Math.PI;

export const CURVES: readonly Curve[] = [
  {
    /** ⭐ 竖直切线:`dx/dt = 0` 而 `dy/dt ≠ 0`。斜率不存在,粒子却跑得最快。 */
    id: 'ellipse',
    label: 'An ellipse, traced by a moving point',
    x: (t) => 3 * Math.cos(t),
    y: (t) => 2 * Math.sin(t),
    dx: (t) => -3 * Math.sin(t),
    dy: (t) => 2 * Math.cos(t),
    d2x: (t) => -3 * Math.cos(t),
    d2y: (t) => -2 * Math.sin(t),
    tRange: [0, TAU],
    startT: Math.PI / 4,
    xTex: 'x(t) = 3\\cos t',
    yTex: 'y(t) = 2\\sin t',
    note: 'At t = 0 and t = π the point is at the far right and far left. There dx/dt is zero while dy/dt is at its largest — the particle is moving as fast as it ever does, straight up or straight down, and the tangent is vertical. Moving and having a slope are not the same thing.',
    marks: [
      { t: 0, why: 'dx/dt = 0 — vertical tangent, yet the point is moving at full speed' },
      { t: Math.PI, why: 'the other vertical tangent' },
      { t: Math.PI / 2, why: 'dy/dt = 0 — here the tangent is horizontal' },
    ],
  },
  {
    /** ⭐⭐ 尖点:`dx/dt` 和 `dy/dt` **同时**为零,粒子真的停了一瞬。 */
    id: 'cycloid',
    label: 'A cycloid — the path of a point on a rolling wheel',
    x: (t) => t - Math.sin(t),
    y: (t) => 1 - Math.cos(t),
    dx: (t) => 1 - Math.cos(t),
    dy: (t) => Math.sin(t),
    d2x: (t) => Math.sin(t),
    d2y: (t) => Math.cos(t),
    tRange: [0.0001, 2 * TAU],
    startT: 1.2,
    xTex: 'x(t) = t - \\sin t',
    yTex: 'y(t) = 1 - \\cos t',
    note: 'At t = 2π both dx/dt and dy/dt hit zero at the same moment. The point on the rim of a rolling wheel actually stops dead when it touches the ground, and the path has a sharp corner there rather than a tangent line.',
    marks: [
      { t: TAU, why: 'both derivatives are 0 — the point stops, and the path has a cusp' },
      { t: Math.PI, why: 'top of the arch — dy/dt = 0, horizontal tangent' },
    ],
  },
  {
    /**
     * ⭐ 也是尖点,但**斜率有极限**:`dy/dx = 3t/2 → 0`。
     * ⚠️ 和旋轮线对照着看:同样是"两个导数都为零",一个有切线方向,一个没有。
     */
    id: 'cusp',
    label: 'x = t², y = t³ — a cusp with a limiting direction',
    x: (t) => t * t,
    y: (t) => t * t * t,
    dx: (t) => 2 * t,
    dy: (t) => 3 * t * t,
    d2x: () => 2,
    d2y: (t) => 6 * t,
    tRange: [-2, 2],
    startT: 0.9,
    xTex: 'x(t) = t^2',
    yTex: 'y(t) = t^3',
    note: 'At t = 0 both derivatives vanish again, but here dy/dx = 3t/2 settles to 0 as t → 0. Two curves can both have every derivative equal zero at a moment and still behave completely differently — the quotient is what matters, not the two pieces separately.',
    marks: [
      { t: 0, why: 'both derivatives are 0, yet dy/dx = 3t/2 approaches 0' },
    ],
  },
] as const;

export function curveOf(id: string): Curve {
  return CURVES.find((c) => c.id === id) ?? CURVES[0]!;
}

/* ══ 速度:和斜率是两件事 ═════════════════════════════════════════ */

/** 速度向量的长度。⚠️ 竖直切线处它**不为零** —— 这正是反例的要点。 */
export function speed(c: Curve, t: number): number {
  return Math.hypot(c.dx(t), c.dy(t));
}

/* ══ 路径 ① —— 解析:(dy/dt)/(dx/dt) ═════════════════════════════ */

/**
 * ⭐ 曲线的斜率。
 * ⚠️ `dx/dt = 0` 时返回 `null`(切线竖直,斜率**不存在**),绝不返回 Infinity。
 */
export function slope(c: Curve, t: number, tol = 1e-12): number | null {
  const d = c.dx(t);
  if (Math.abs(d) <= tol) return null;
  const v = c.dy(t) / d;
  return Number.isFinite(v) ? v : null;
}

/* ══ 路径 ② —— 割线:只量两个点,不碰参数求导 ═══════════════════ */

/**
 * ⭐⭐ 在曲线上取 `t ± h` 两个点,直接量 `Δy / Δx`。
 *
 * 它**完全不知道**什么叫"对 t 求导再相除" —— 只是两点连线的斜率。
 * 所以它和路径 ① 一致,是对 `dy/dx = (dy/dt)/(dx/dt)` 这条公式的一次真检验。
 *
 * ⚠️ 两点的 x 几乎相等时(竖直切线附近)返回 `null`,不硬除。
 */
export function slopeBySecant(c: Curve, t: number, h = 1e-5): number | null {
  const dxv = c.x(t + h) - c.x(t - h);
  const dyv = c.y(t + h) - c.y(t - h);
  if (Math.abs(dxv) < 1e-13) return null;
  const v = dyv / dxv;
  return Number.isFinite(v) ? v : null;
}

/* ══ 二阶导:这一课的第二个反例 ═══════════════════════════════════ */

/**
 * ⭐⭐ **正确**的二阶导:先把 `dy/dx` 看成 t 的函数,对 t 求导,再除以 `dx/dt`。
 *
 *      d²y/dx² = [d/dt (dy/dx)] / (dx/dt)
 *
 * ⚠️ 这里对 `dy/dx` 用数值求导而不是再写一遍解析式 ——
 *   解析式每条曲线都不一样,手写四遍就是四次出错的机会。
 */
export function secondDeriv(c: Curve, t: number, h = 1e-4): number | null {
  const d = c.dx(t);
  if (Math.abs(d) <= 1e-9) return null;
  const a = slope(c, t + h);
  const b = slope(c, t - h);
  if (a === null || b === null) return null;
  const v = ((a - b) / (2 * h)) / d;
  return Number.isFinite(v) ? v : null;
}

/**
 * ⚠️⚠️ **学生最常写错的那个式子**:`(d²y/dt²) / (d²x/dt²)`。
 *
 * 它**不是**二阶导。这个函数存在的唯一目的,是把它和正确答案并排放在屏幕上,
 * 让人看见两者差得有多远 —— 椭圆在 `t = π/4` 处连正负号都相反。
 */
export function naiveSecond(c: Curve, t: number): number | null {
  const d = c.d2x(t);
  if (Math.abs(d) <= 1e-12) return null;
  const v = c.d2y(t) / d;
  return Number.isFinite(v) ? v : null;
}

/** 独立路径:沿曲线本身量二阶差商,不碰任何参数求导公式。 */
export function secondBySecant(c: Curve, t: number, h = 2e-3): number | null {
  const s1 = slopeBySecant(c, t + h, h / 4);
  const s0 = slopeBySecant(c, t - h, h / 4);
  const dxv = c.x(t + h) - c.x(t - h);
  if (s1 === null || s0 === null || Math.abs(dxv) < 1e-10) return null;
  const v = (s1 - s0) / dxv;
  return Number.isFinite(v) ? v : null;
}

/* ══ 这一刻是什么情况 ═════════════════════════════════════════════ */

export type State = 'smooth' | 'vertical' | 'horizontal' | 'stopped';

/**
 * ⭐ 把四种情形分开。
 * ⚠️ `stopped`(两个导数同时为零)要**先**判 —— 否则它会被误当成竖直切线。
 */
export function stateAt(c: Curve, t: number, tol = 1e-6): State {
  const a = Math.abs(c.dx(t));
  const b = Math.abs(c.dy(t));
  if (a <= tol && b <= tol) return 'stopped';
  if (a <= tol) return 'vertical';
  if (b <= tol) return 'horizontal';
  return 'smooth';
}

/* ══ 画图 ═════════════════════════════════════════════════════════ */

export function samplePath(c: Curve, n = 600): readonly { x: number; y: number }[] {
  const [lo, hi] = c.tRange;
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i <= n; i += 1) {
    const t = lo + ((hi - lo) * i) / n;
    const x = c.x(t);
    const y = c.y(t);
    if (Number.isFinite(x) && Number.isFinite(y)) out.push({ x, y });
  }
  return out;
}

/** 画框。⚠️ 从**取样**求,不写死 —— 三条曲线的尺度差很远。 */
export function bounds(c: Curve): readonly [number, number, number, number] {
  const pts = samplePath(c, 400);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const padX = (Math.max(...xs) - Math.min(...xs)) * 0.12 || 1;
  const padY = (Math.max(...ys) - Math.min(...ys)) * 0.18 || 1;
  return [Math.min(...xs) - padX, Math.max(...xs) + padX,
    Math.min(...ys) - padY, Math.max(...ys) + padY];
}

export function clampT(c: Curve, t: number): number {
  if (!Number.isFinite(t)) return c.startT;
  return Math.min(Math.max(t, c.tRange[0]), c.tRange[1]);
}

/* ══ 显示 ═════════════════════════════════════════════════════════ */

export const HEADLINE = 'dy/dt Is Not the Slope';
export const MAIN_IDEA =
  'dy/dt says how fast y changes with time. The slope of the curve asks a different question — how much y changes compared with how much x changes — and that is the quotient of the two rates, not either one on its own.';

export const VERTICAL_NOTE =
  'dx/dt is zero here, so there is no slope — the tangent is vertical. Notice that the speed is not zero: the point is moving as fast as it ever does. Still moving and having a slope are separate questions.';

export const STOPPED_NOTE =
  'Both rates are zero at this instant, so the quotient is 0/0 and the formula says nothing. The particle has genuinely stopped. Whether the path has a corner here depends on how the two rates approach zero, not on the fact that they do.';

export const SECOND_TRAP =
  'The second derivative is not the second derivatives divided. To get d²y/dx² you differentiate dy/dx with respect to t and then divide by dx/dt once more. The two columns below are usually not even close, and often differ in sign.';

export function show(v: number | null, places = 4): string {
  return v === null || !Number.isFinite(v) ? 'undefined' : showNumber(v, places);
}
