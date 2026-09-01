/**
 * MATH — 微积分基本定理(第一部分):`A(x) = ∫ₐˣ f(t)dt  ⟹  A′(x) = f(x)`。
 *
 * ⭐⭐ 让它变得显然的那一步,是**把区域往右加宽一条细缝**:
 *
 *   从 x 加宽到 x + h,多出来的那块面积**几乎就是一个矩形**:高 `f(x)`、宽 `h`。
 *   所以「面积增长得多快」= `f(x)`。
 *   `A′(x) = f(x)` 不是一条要背的定理,是"多出来那条细缝有多大"的另一种说法。
 *
 * ⭐ 第二部分随之而来:既然 `A` 是 `f` 的一个原函数,而任意两个原函数只差常数,
 *   那么对**任何**原函数 `F`,`∫ₐᵇ f = F(b) − F(a)` —— 常数在相减时消掉了。
 *
 * ⭐ 两条互不相干的路径算同一块面积:
 *   ① `areaByAntiderivative` —— 用解析原函数,一次求值,没有任何数值积分;
 *   ② `areaByQuadrature`     —— 自适应 Simpson,完全不知道原函数长什么样。
 *
 * ⚠️⚠️ 一个几乎所有课本都一笔带过、而这里必须画出来的前提:
 *   `A′(x) = f(x)` 需要 **f 在 x 处连续**。
 *   f 有跳跃时,`A` 仍然**连续**(面积不会突然蹦),但在跳跃处**不可导** ——
 *   `A` 在那里是一个**折角**,左右导数分别等于左右极限。
 *   所以本模块特意带一个阶梯函数的案例,并且:
 *   · 对不连续的 f **不做** Simpson(自适应积分在跳跃处不可信),面积走精确分段公式;
 *   · `derivativeExistsAt` 明说那一点上导数不存在,不许含糊过去。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import { showNumber } from './format';
import { adaptiveSimpson } from './quadrature';

/* ══ 被积的那些 f ══════════════════════════════════════════════════ */

export interface Integrand {
  readonly id: string;
  readonly label: string;
  readonly tex: string;
  /** f 本身 */
  readonly at: (t: number) => number;
  /** f 的一个原函数(解析) */
  readonly F: (t: number) => number;
  /** f 是否处处连续 */
  readonly continuous: boolean;
  /** 不连续时,跳跃点在哪(升序) */
  readonly jumps: readonly number[];
  /** 定义域左端 —— 面积从这里开始累 */
  readonly a: number;
  /** 界面上 x 能滑到的右端 */
  readonly b: number;
}

/** ⚠️ 阶梯函数的原函数要**自己写**,不能指望通用积分器。 */
function stepAt(t: number): number {
  if (t < 1) return 1;
  if (t < 2) return 2.5;
  return 0.8;
}

/** ∫₀ᵗ step,分段线性,处处连续。 */
function stepF(t: number): number {
  if (t <= 0) return 0;
  if (t < 1) return t;
  if (t < 2) return 1 + 2.5 * (t - 1);
  return 3.5 + 0.8 * (t - 2);
}

export const INTEGRANDS: readonly Integrand[] = [
  {
    id: 'line',
    label: 'f(t) = t',
    tex: 'f(t) = t',
    at: (t) => t,
    F: (t) => (t * t) / 2,
    continuous: true,
    jumps: [],
    a: 0,
    b: 3,
  },
  {
    id: 'parabola',
    label: 'f(t) = 4 − t²',
    tex: 'f(t) = 4 - t^2',
    at: (t) => 4 - t * t,
    F: (t) => 4 * t - (t * t * t) / 3,
    continuous: true,
    jumps: [],
    a: 0,
    b: 3,
  },
  {
    id: 'wave',
    label: 'f(t) = sin t + 1',
    tex: 'f(t) = \\sin t + 1',
    at: (t) => Math.sin(t) + 1,
    F: (t) => -Math.cos(t) + t,
    continuous: true,
    jumps: [],
    a: 0,
    b: 3,
  },
  {
    /**
     * ⚠️ 特意放的**跳跃**案例。它不是凑数的:
     * 它是 `A′ = f` 这条结论**唯一**会失效的地方,而失效的方式很好看 ——
     * A 还是连续的(面积不会瞬移),只是在跳跃处长出一个折角。
     * 不摆出来,"f 连续"这个前提就只是一句没人读的小字。
     */
    id: 'step',
    label: 'a step function',
    tex: 'f(t) = \\begin{cases}1 & t<1\\\\ 2.5 & 1\\le t<2\\\\ 0.8 & t\\ge 2\\end{cases}',
    at: stepAt,
    F: stepF,
    continuous: false,
    jumps: [1, 2],
    a: 0,
    b: 3,
  },
] as const;

export function integrandOf(id: string): Integrand {
  return INTEGRANDS.find((f) => f.id === id) ?? INTEGRANDS[0]!;
}

/* ══ 面积函数:两条独立路径 ═══════════════════════════════════════ */

/** 路径 ① —— 解析原函数。⚠️ 一次求值,没有数值积分。 */
export function areaByAntiderivative(f: Integrand, x: number): number {
  return f.F(x) - f.F(f.a);
}

/**
 * 路径 ② —— 自适应 Simpson,不知道原函数长什么样。
 *
 * ⚠️ **只对连续的 f 有意义**。自适应积分在跳跃点上会被误导
 * (它靠"细分后两次估计是否接近"来判停,而跳跃处这个判据会骗它)。
 * 所以不连续时返回 null,由调用方明确处理,而不是给一个看起来像样的错数。
 */
export function areaByQuadrature(f: Integrand, x: number): number | null {
  if (!f.continuous) return null;
  if (x === f.a) return 0;
  return adaptiveSimpson(f.at, f.a, x, 1e-11);
}

/* ══ 那条细缝 ══════════════════════════════════════════════════════ */

export interface Sliver {
  readonly x: number;
  readonly h: number;
  /** 细缝的真实面积 `A(x+h) − A(x)` */
  readonly exact: number;
  /** 把它当矩形估:`f(x)·h` */
  readonly rectangle: number;
  /** 面积的平均增长率 `[A(x+h) − A(x)]/h` */
  readonly rate: number;
  /** 同一点上的 f(x) —— 定理说这两个数应该靠拢 */
  readonly height: number;
  /** 两者之差 */
  readonly gap: number;
}

/**
 * ⭐⭐ 这一课的支点。
 * `rate` 与 `height` 之差随 h → 0 趋于 0(f 在 x 处连续时)。
 */
export function sliver(f: Integrand, x: number, h: number): Sliver | null {
  if (!Number.isFinite(x) || !Number.isFinite(h) || h === 0) return null;
  const exact = areaByAntiderivative(f, x + h) - areaByAntiderivative(f, x);
  const height = f.at(x);
  const rate = exact / h;
  return { x, h, exact, rectangle: height * h, rate, height, gap: rate - height };
}

/** 界面上那把梯子。 */
export const H_LADDER: readonly number[] = [0.5, 0.25, 0.1, 0.05, 0.02, 0.01, 0.005];

export function rateLadder(f: Integrand, x: number): readonly { readonly h: number; readonly rate: number; readonly gap: number }[] {
  return H_LADDER.map((h) => {
    const s = sliver(f, x, h);
    return { h, rate: s?.rate ?? Number.NaN, gap: s?.gap ?? Number.NaN };
  });
}

/* ══ 连续性这个前提 ═══════════════════════════════════════════════ */

/**
 * ⭐ `A` 在 x 处可导吗?
 *
 * ⚠️ 唯一会不可导的地方就是 f 的跳跃点 —— 那里 A 有折角,
 * 左右导数分别等于 f 的左右极限。别的地方都可导,导数就是 f(x)。
 */
export function derivativeExistsAt(f: Integrand, x: number): boolean {
  return !f.jumps.some((j) => Math.abs(x - j) < 1e-12);
}

/** 跳跃点两侧的单侧导数(= f 的左右极限)。不在跳跃点上时返回 null。 */
export function oneSidedRates(f: Integrand, x: number): { readonly left: number; readonly right: number } | null {
  if (derivativeExistsAt(f, x)) return null;
  const eps = 1e-7;
  return { left: f.at(x - eps), right: f.at(x + eps) };
}

/**
 * ⭐ **A 在跳跃处仍然连续** —— 面积不会瞬移。
 * 返回左右极限之差;它必须是 0(到浮点为止)。
 */
export function areaJumpAt(f: Integrand, x: number): number {
  const eps = 1e-7;
  return areaByAntiderivative(f, x + eps) - areaByAntiderivative(f, x - eps) - 0;
}

/* ══ 第二部分:任何原函数都行 ═════════════════════════════════════ */

/**
 * ⭐ `∫ₐᵇ f = F(b) − F(a)` 对**任何**原函数成立 —— 加上任意常数,相减时消掉。
 * 这个函数把"换一个原函数"这件事真的做一遍,而不是嘴上说说。
 */
export function definiteWithShiftedAntiderivative(f: Integrand, a: number, b: number, shift: number): number {
  const shifted = (t: number) => f.F(t) + shift;
  return shifted(b) - shifted(a);
}

/* ══ 取值 ══════════════════════════════════════════════════════════ */

export function clampX(f: Integrand, x: number): number {
  if (!Number.isFinite(x)) return (f.a + f.b) / 2;
  return Math.min(Math.max(Math.round(x * 1000) / 1000, f.a), f.b);
}

/** 画曲线用的采样。⚠️ 跳跃处要断笔,所以返回可能含 null 的点列。 */
export function sampleF(f: Integrand, n = 240): readonly { readonly t: number; readonly y: number | null }[] {
  const span = f.b - f.a;
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = f.a + (span * i) / n;
    // 跳跃点上抬笔,别把台阶连成斜线 —— 连过去等于说那里有中间值
    const onJump = f.jumps.some((j) => Math.abs(t - j) < span / n / 2);
    return { t, y: onJump ? null : f.at(t) };
  });
}

export function sampleArea(f: Integrand, n = 240): readonly { readonly t: number; readonly y: number }[] {
  const span = f.b - f.a;
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = f.a + (span * i) / n;
    return { t, y: areaByAntiderivative(f, t) };
  });
}

/* ══ 显示 ══════════════════════════════════════════════════════════ */

export const HEADLINE = 'The Sliver Is a Rectangle';
export const MAIN_IDEA =
  'Widen the region by h and the new area is about f(x)·h. That is the whole theorem.';

export function show(value: number | null, places = 6): string {
  return value === null || !Number.isFinite(value) ? 'undefined' : showNumber(value, places);
}

export const PART1_TEX = "A(x)=\\int_a^x f(t)\\,dt \\;\\Longrightarrow\\; A'(x)=f(x)";
export const SLIVER_TEX = 'A(x+h)-A(x)\\approx f(x)\\cdot h';
export const PART2_TEX = "\\int_a^b f(t)\\,dt = F(b)-F(a)";

export const CORNER_NOTE =
  'f jumps here, so A has a corner: it is still continuous — area never teleports — but it has no single slope. The one-sided slopes are exactly the one-sided values of f. This is why the theorem asks for f to be continuous.';
