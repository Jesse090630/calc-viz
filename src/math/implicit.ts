/**
 * MATH — 隐函数求导:`F(x, y) = 0` 上的 `dy/dx`。
 *
 * ⭐⭐ 这一课的论点:**隐函数求导不是一门新技术,它就是链式法则**。
 *
 *   学生真正卡住的是那个凭空冒出来的 `dy/dx`:
 *   为什么 `x²` 求导得 `2x`,而 `y²` 求导得 `2y·(dy/dx)`?
 *
 *   因为 **y 本身是 x 的函数**。`y²` 是一个复合:外层平方、内层 y(x)。
 *   链式法则说外层导数乘内层导数 —— 内层导数就是 `dy/dx`。
 *   **那个因子不是记号约定,它就是链式法则里的内层导数。**
 *   (对照 `#/chain-rule` 那一课:两级放大,倍率相乘。)
 *
 * ⭐ 于是整条式子对 x 求导、把带 `dy/dx` 的项收到一边,就得到
 *
 *       dy/dx = −Fₓ / F_y
 *
 * ⚠️⚠️ 而这里有一个**必须显示出来**的真实例外:`F_y = 0` 时切线是**竖直**的,
 *   `dy/dx` **不存在**(不是"很大",是没有定义)。
 *   圆 `x² + y² = r²` 的最左最右两点就是这样。
 *   本模块在那里返回 `null`,绝不返回 Infinity 或 NaN ——
 *   一个竖直切线在屏幕上要画成竖线,不该显示成 `1e16`。
 *
 * ⭐ 两条互不相干的路径算同一个斜率:
 *   ① `slopeImplicit`  —— `−Fₓ/F_y`,只用隐式关系,从不解出 y;
 *   ② `slopeOnBranch`  —— 把显式分支 `y(x)` 拿来做中心差商,完全不碰隐式那套。
 *   两者必须一致 —— 这就是对隐函数求导的一次真实检验。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import { showNumber } from './format';

/* ══ 曲线 ══════════════════════════════════════════════════════════ */

export type BranchId = 'upper' | 'lower';

export interface Curve {
  readonly id: string;
  readonly label: string;
  /** `F(x, y) = 0` 的左边 */
  readonly F: (x: number, y: number) => number;
  /** ∂F/∂x(解析) */
  readonly Fx: (x: number, y: number) => number;
  /** ∂F/∂y(解析) */
  readonly Fy: (x: number, y: number) => number;
  /**
   * 显式分支 `y(x)`。⚠️ 只是**局部**存在 —— 这正是要用隐函数求导的理由。
   * 超出定义域时返回 null。
   */
  readonly branch: (x: number, which: BranchId) => number | null;
  /** x 能取到的范围(画图与取样用) */
  readonly xRange: readonly [number, number];
  readonly yRange: readonly [number, number];
  readonly relationTex: string;
  readonly slopeTex: string;
  /** 打开时停在哪个点 */
  readonly startX: number;
  readonly startBranch: BranchId;
}

const R = 5;

export const CURVES: readonly Curve[] = [
  {
    id: 'circle',
    label: 'x² + y² = 25',
    F: (x, y) => x * x + y * y - R * R,
    Fx: (x) => 2 * x,
    Fy: (_x, y) => 2 * y,
    branch: (x, which) => {
      const inside = R * R - x * x;
      if (inside < 0) return null;
      const root = Math.sqrt(inside);
      return which === 'upper' ? root : -root;
    },
    xRange: [-R, R],
    yRange: [-R, R],
    relationTex: 'x^2 + y^2 = 25',
    slopeTex: '\\frac{dy}{dx} = -\\frac{x}{y}',
    startX: 3,
    startBranch: 'upper',
  },
  {
    id: 'ellipse',
    label: 'x²/9 + y²/4 = 1',
    F: (x, y) => (x * x) / 9 + (y * y) / 4 - 1,
    Fx: (x) => (2 * x) / 9,
    Fy: (_x, y) => y / 2,
    branch: (x, which) => {
      const inside = 1 - (x * x) / 9;
      if (inside < 0) return null;
      const root = 2 * Math.sqrt(inside);
      return which === 'upper' ? root : -root;
    },
    xRange: [-3, 3],
    yRange: [-2, 2],
    relationTex: '\\frac{x^2}{9} + \\frac{y^2}{4} = 1',
    slopeTex: '\\frac{dy}{dx} = -\\frac{4x}{9y}',
    startX: 1.8,
    startBranch: 'upper',
  },
] as const;

export function curveOf(id: string): Curve {
  return CURVES.find((c) => c.id === id) ?? CURVES[0]!;
}

/* ══ 点是否真的在曲线上 ═══════════════════════════════════════════ */

/** ⚠️ 一切结论的前提。不在曲线上的点谈斜率没有意义。 */
export function isOnCurve(c: Curve, x: number, y: number, tol = 1e-9): boolean {
  return Number.isFinite(x) && Number.isFinite(y) && Math.abs(c.F(x, y)) <= tol;
}

/** 取分支上的点。超出定义域返回 null。 */
export function pointOn(c: Curve, x: number, which: BranchId): { x: number; y: number } | null {
  const y = c.branch(x, which);
  return y === null ? null : { x, y };
}

/* ══ 两条独立路径 ══════════════════════════════════════════════════ */

/**
 * 路径 ① —— 隐式:`dy/dx = −Fₓ/F_y`。**从不解出 y**。
 * ⚠️ `F_y = 0` 时切线竖直,导数不存在 → `null`,不是 Infinity。
 */
export function slopeImplicit(c: Curve, x: number, y: number): number | null {
  const fy = c.Fy(x, y);
  if (fy === 0) return null;
  const value = -c.Fx(x, y) / fy;
  return Number.isFinite(value) ? value : null;
}

/**
 * 路径 ② —— 显式:把分支 `y(x)` 做中心差商。**完全不碰隐式那套**。
 * 所以 ① 与 ② 一致,是对隐函数求导的一次真实数值检验。
 *
 * ⚠️ 靠近端点时中心差商会踩出定义域,那时返回 null 而不是瞎猜。
 */
export function slopeOnBranch(c: Curve, x: number, which: BranchId, h = 1e-6): number | null {
  const left = c.branch(x - h, which);
  const right = c.branch(x + h, which);
  if (left === null || right === null) return null;
  const value = (right - left) / (2 * h);
  return Number.isFinite(value) ? value : null;
}

/* ══ 竖直切线 ═════════════════════════════════════════════════════ */

/** ⭐ 切线竖直吗 —— 也就是 `F_y = 0`。 */
export function isVerticalTangent(c: Curve, x: number, y: number): boolean {
  return c.Fy(x, y) === 0;
}

/**
 * ⭐ 这条曲线上切线竖直的那些点。
 * ⚠️ 用**构造**求,不是扫描取样:`F_y = 0` 且在曲线上。
 * 这两条曲线的 `F_y` 都正比于 y,所以就是 `y = 0` 与关系式的交点。
 */
export function verticalTangentPoints(c: Curve): readonly { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (const x of [c.xRange[0], c.xRange[1]]) {
    if (isOnCurve(c, x, 0, 1e-9) && isVerticalTangent(c, x, 0)) out.push({ x, y: 0 });
  }
  return out;
}

/* ══ 那个 dy/dx 从哪来:把链式法则那一步单独摆出来 ═══════════════ */

export interface ChainStep {
  /** 原式里的这一项,如 `y^2` */
  readonly termTex: string;
  /** 对 x 求导之后,如 `2y\frac{dy}{dx}` */
  readonly afterTex: string;
  /** 这一项里有没有那个 dy/dx 因子 */
  readonly carriesDydx: boolean;
  /** 一句话解释 */
  readonly why: string;
}

/**
 * ⭐⭐ 这一课的支点:**逐项**说明 `dy/dx` 是怎么冒出来的。
 * 含 y 的项才带 `dy/dx`,因为只有它们是复合函数。
 */
export function chainSteps(c: Curve): readonly ChainStep[] {
  if (c.id === 'ellipse') {
    return [
      { termTex: '\\frac{x^2}{9}', afterTex: '\\frac{2x}{9}', carriesDydx: false,
        why: 'x differentiated with respect to x. Nothing composite here.' },
      { termTex: '\\frac{y^2}{4}', afterTex: '\\frac{y}{2}\\cdot\\frac{dy}{dx}', carriesDydx: true,
        why: 'y is itself a function of x, so this is a composition — the chain rule attaches the inner derivative dy/dx.' },
      { termTex: '1', afterTex: '0', carriesDydx: false, why: 'A constant does not change.' },
    ];
  }
  return [
    { termTex: 'x^2', afterTex: '2x', carriesDydx: false,
      why: 'x differentiated with respect to x. Nothing composite here.' },
    { termTex: 'y^2', afterTex: '2y\\cdot\\frac{dy}{dx}', carriesDydx: true,
      why: 'y is itself a function of x, so this is a composition — the chain rule attaches the inner derivative dy/dx.' },
    { termTex: '25', afterTex: '0', carriesDydx: false, why: 'A constant does not change.' },
  ];
}

/** ⭐ 恰好有一项带 dy/dx —— 界面上要能指着它说"就是这一项"。 */
export function termsCarryingDydx(c: Curve): number {
  return chainSteps(c).filter((s) => s.carriesDydx).length;
}

/* ══ 切线 ══════════════════════════════════════════════════════════ */

export interface Tangent {
  readonly vertical: boolean;
  readonly slope: number | null;
  /** 非竖直时:y = m(x − x₀) + y₀ */
  readonly at: (x: number) => number | null;
}

export function tangentAt(c: Curve, x: number, y: number): Tangent {
  const m = slopeImplicit(c, x, y);
  if (m === null) {
    return { vertical: true, slope: null, at: () => null };
  }
  return { vertical: false, slope: m, at: (t) => m * (t - x) + y };
}

/* ══ 取值 ══════════════════════════════════════════════════════════ */

export function clampX(c: Curve, x: number): number {
  if (!Number.isFinite(x)) return c.startX;
  return Math.min(Math.max(Math.round(x * 1000) / 1000, c.xRange[0]), c.xRange[1]);
}

/** 画一条分支。⚠️ 端点处切线竖直,采样要密一点才不至于画出折角。 */
export function sampleBranch(c: Curve, which: BranchId, n = 200): readonly { x: number; y: number }[] {
  const [lo, hi] = c.xRange;
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i <= n; i += 1) {
    const x = lo + ((hi - lo) * i) / n;
    const y = c.branch(x, which);
    if (y !== null) out.push({ x, y });
  }
  return out;
}

/* ══ 显示 ══════════════════════════════════════════════════════════ */

export const HEADLINE = 'That dy/dx Is the Chain Rule';
export const MAIN_IDEA =
  'y is a function of x, so every y-term is a composition. The inner derivative is dy/dx.';

export function show(value: number | null, places = 4): string {
  return value === null || !Number.isFinite(value) ? 'undefined' : showNumber(value, places);
}

export const GENERAL_TEX = '\\frac{dy}{dx} = -\\frac{F_x}{F_y}';

export const VERTICAL_NOTE =
  'The y-partial is exactly zero here, so dy/dx does not exist — the tangent is vertical. Not a huge number: no number at all. A vertical line has no slope, and the formula reports that honestly instead of returning infinity.';
