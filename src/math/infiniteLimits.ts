/**
 * MATH — 无穷极限与铅直渐近线:`f(x) = 1/x` 在 `x → 0` 附近。
 *
 * ⚠️⚠️ **`∞` 不是一个数,这个模块里不许把它当数用。**
 *   · `f(x) → +∞` 描述的是**行为**:"要多大有多大",不是"等于某个叫无穷的数";
 *   · 所以这里**没有** `limitAt(0)` 这样的函数,只有
 *     `growth(side)`(给出方向)与 `beats(side, bound)`(给出"能超过任何界"的构造)。
 *   · `valueAt(0)` 返回 `null`。`1/0` 在 JS 里是 `Infinity` —— 一个**不报错**的假值,
 *     放它流到屏幕上会写出 "f(0) = Infinity",而正确的说法是"这里没有值"。
 *
 * ⚠️ "增长无界"这件事的**诚实证明方式是构造**:你说一个界,我给出一个 x 超过它。
 * 取样再多也只是取样;`beats` 才是这一节真正的论证。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import { showNumber, showScientific } from './format';

/** 只用于比较,不用于"算不算 0"—— 见 `valueAt` 的注释。 */
export const EPS = 1e-12;
export const A = 0;

export type Side = 'left' | 'right';
/** 只有两种走法:要多大有多大,或要多小有多小。 */
export type Growth = 'up' | 'down';

/** 十进位阶梯:|x| = 10⁻ᵏ,于是 |f| = 10ᵏ。提示词点名的那串。 */
export const MAX_DECADE = 5;

/**
 * ⚠️ 用 `Number('1e-5')` 而不是 `10 ** -5`。
 * 后者给出 0.000009999999999999999 —— 屏幕上写着 "1×10⁻⁵" 而实际不是,
 * 而这一节的整个语言就是十进位阶梯,差一点点就不再是"十倍十倍"。
 */
export function decade(k: number): number {
  // ⚠️ 非整数的 k 必须单独处理。`Number('1e-2.35')` 是 **NaN** ——
  //    首页那张预览用连续的 k 做动画,于是一路把 NaN 传进了 SVG 的 cx,
  //    浏览器每帧报一次 "Expected length, NaN"。(首页检查抓到的。)
  //    整数档仍走字符串解析以保证精确;动画只需要连续,不需要精确。
  return Number.isInteger(k) ? Number(`1e-${k}`) : 10 ** -k;
}

export function decadeX(side: Side, k: number): number {
  const magnitude = decade(k);
  return side === 'left' ? -magnitude : magnitude;
}

/**
 * f(x) = 1/x。**x = 0 处返回 null,不返回 Infinity。**
 * ⚠️ 先证明这个坑存在:`1/0 === Infinity` 且不抛错。
 *
 * ⚠️ 判据是 `x === 0`,**不是** `|x| <= EPS`。
 * 第一版用了 1e-12 的阈值,结果 `beats(side, 1e12)` 直接返回 null ——
 * 因为需要的 x 比阈值还小,被当成"就是 0"给挡掉了。
 * 那等于在代码里给"无界"设了个上限,而这一节要说的恰恰是**没有上限**。
 * 界面上的最近距离是另一回事(`MIN_GAP`),两者不能混。
 * 另外还要挡住次正规数:1/1e-320 会溢出成 Infinity。
 */
export function valueAt(x: number): number | null {
  if (!Number.isFinite(x)) return null;
  // ⚠️ 这一行**同时**挡住三种情况:x = 0(1/0 = Infinity)、
  //    次正规数(1/1e-320 溢出)、以及任何别的非有限结果。
  //    原来还单写了一句 `x === 0`,变异测试把它删掉之后全绿 —— 它是死代码,
  //    保证本来就来自下面这一行。删掉比留着诚实(pairState 那次立的规矩)。
  const y = 1 / x;
  return Number.isFinite(y) ? y : null;
}

/* ══ 行为:两条独立路径 ════════════════════════════════════════════ */

/**
 * 路径 A —— **符号**。x 从右边趋近 0 时 x > 0,`1/x` 为正且分母越来越小,
 * 所以要多大有多大;左边同理为负。纯推理,不取样。
 */
export function growthBySign(side: Side): Growth {
  return side === 'right' ? 'up' : 'down';
}

/**
 * 路径 B —— **构造**。给任意界 `bound > 0`,返回第一个使 `|f| > bound`
 * 的十进位档 k(找不到就 null)。这才是"无界"的证明方式。
 */
export function beats(side: Side, bound: number, maxK = 300): number | null {
  for (let k = 0; k <= maxK; k += 1) {
    const value = valueAt(decadeX(side, k));
    if (value === null) continue;
    const passes = growthBySign(side) === 'up' ? value > bound : value < -bound;
    if (passes) return k;
  }
  return null;
}

/** 路径 B 推出来的方向:看它是往大处跑还是往小处跑。 */
export function growthByProbe(side: Side): Growth {
  const near = valueAt(decadeX(side, 6))!;
  const far = valueAt(decadeX(side, 1))!;
  return Math.abs(near) > Math.abs(far) && near > 0 ? 'up' : 'down';
}

/** 两侧方向不同 → 双侧极限不存在(而且**也不是** ∞)。 */
export function sidesAgree(): boolean {
  return growthBySign('left') === growthBySign('right');
}

/* ══ 可拖的点 ══════════════════════════════════════════════════════ */

export const VIEW = { from: -1.15, to: 1.15 } as const;
/**
 * **界面上**离渐近线最近能到多近 —— 到不了 0,那正是"渐近"的意思。
 * ⚠️ 这是交互的深度,不是论证的深度:`beats` 能一路走到 10⁻³⁰⁰。
 */
export const MIN_GAP = decade(MAX_DECADE);

export function clampToSide(side: Side, x: number): number {
  if (!Number.isFinite(x)) return decadeX(side, 0);
  const magnitude = Math.min(Math.max(Math.abs(x), MIN_GAP), Math.abs(VIEW.to));
  return side === 'left' ? -magnitude : magnitude;
}

export interface Reading {
  readonly x: number;
  readonly y: number;
  /** 当前落在第几个十进位档(连续值,便于显示) */
  readonly decade: number;
}

export function read(side: Side, x: number): Reading {
  const clamped = clampToSide(side, x);
  return { x: clamped, y: valueAt(clamped)!, decade: -Math.log10(Math.abs(clamped)) };
}

/** 「再靠近十倍」 */
export function closerDecade(k: number): number {
  return Math.min(MAX_DECADE, Math.round(k) + 1);
}

/* ══ 取景:跟着档位放大 ════════════════════════════════════════════ */

/**
 * ⚠️ y 轴必须**跟着档位重新标度**,否则第 3 档以后曲线整个跑出画外,
 * "爆炸"这件事在屏幕上就只剩一条贴着轴的竖线,什么也感觉不到。
 * 放大了就要在界面上说出来(和 ε–δ 那一节同一条规矩)。
 */
export function viewHalfHeight(decade: number): number {
  return Math.max(2, 10 ** Math.max(0, decade) * 1.6);
}

export function viewHalfWidth(decade: number): number {
  return Math.max(0.02, 10 ** -Math.max(0, decade) * 1.6);
}

/* ══ 显示 ══════════════════════════════════════════════════════════ */

export function showX(x: number): string {
  const abs = Math.abs(x);
  if (abs >= 0.01) return showNumber(x, 3);
  return showScientific(x, 0);
}

export function showY(y: number | null): string {
  if (y === null) return 'undefined';
  const abs = Math.abs(y);
  if (abs < 1000) return showNumber(y, abs < 10 ? 2 : 0);
  return (y < 0 ? '−' : '') + showScientific(abs, 0);
}

/**
 * ⚠️ 这里的措辞是这一节的核心。**不许出现 "equals infinity"。**
 * `→ +∞` 读作"要多大有多大",不是"到达了某个数"。
 */
export const GROWTH_COPY: Readonly<Record<Growth, { readonly tex: string; readonly words: string }>> = {
  up: { tex: '+\\infty', words: 'grows without bound' },
  down: { tex: '-\\infty', words: 'falls without bound' },
};

export function approachTex(side: Side): string {
  return `x \\to ${A}^{${side === 'left' ? '-' : '+'}}`;
}

export function growthTex(side: Side): string {
  return `\\lim_{${approachTex(side)}} \\frac{1}{x} = ${GROWTH_COPY[growthBySign(side)].tex}`;
}

/** 双侧:两边跑向相反方向,所以**不存在**(也不是 ∞)。 */
export const TWO_SIDED_TEX = `\\lim_{x \\to ${A}} \\frac{1}{x} \\;\\text{does not exist}`;
