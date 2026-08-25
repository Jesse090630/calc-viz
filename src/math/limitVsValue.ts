/**
 * MATH — 极限 vs 函数值:`lim_{x→1} f(x)` 与 `f(1)` 是两件事。
 *
 * `f(x) = (x² − 1)/(x − 1)`,在 x ≠ 1 处等于 `x + 1`;在 x = 1 处是 0/0。
 *
 * ⚠️⚠️ 这个模块的**全部意义**在一条不变量上:
 *   **`limitAtHole` 不接受任何与 f(1) 有关的参数。**
 * 不是"我们小心地没用它",是**它拿不到**。签名里没有那个值,
 * 于是"极限依赖于函数值"这件事在类型层面就写不出来。
 * 上一节(单侧极限)已经守过一次;这一节整节课在讲它,更不能松。
 *
 * ⚠️ 原始式在 x = 1 处返回 `null`,不返回 NaN。
 * `(1 − 1)/(1 − 1)` 在 JS 里是 `0/0 = NaN` —— 一个**不报错**的假值,
 * 放它流到屏幕上会写出 "f(1) = NaN",而正确的说法是"没有值"。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import { showNumber } from './format';

export const EPS = 1e-9;

/** 洞的位置 */
export const A = 1;
/** 洞的高度 —— 由**代数约分**得到,不是取样估出来的 */
export const HOLE_Y = A + 1;

/** 拖动步长 */
export const STEP = 0.001;
/** 两个点离洞最近能到多近 */
export const MIN_GAP = 0.001;

/** 画面范围 */
export const VIEW = { from: -0.6, to: 2.8 } as const;
export const Y_VIEW = { from: -0.4, to: 5.4 } as const;
/** 孤立点能被拖到的高度范围 */
export const POINT_RANGE = { from: 0.2, to: 5 } as const;

export type Side = 'left' | 'right';
/** 洞上有没有点:`hole` = 没定义;`isolated` = 定义在别处的一个孤零零的点 */
export type PointMode = 'hole' | 'isolated';

/* ══ 两个写法 ══════════════════════════════════════════════════════ */

/**
 * 原始式 `(x² − 1)/(x − 1)`。**x = 1 处返回 null。**
 * ⚠️ 不要写成 `(x*x-1)/(x-1)` 然后指望它自己出错:JS 会给 NaN,而 NaN 不报错。
 */
export function rawAt(x: number): number | null {
  if (!Number.isFinite(x)) return null;
  if (Math.abs(x - A) <= EPS) return null;
  return (x * x - 1) / (x - 1);
}

/** 约分后的写法 `x + 1`。处处有定义 —— 但它**不是**原来那个函数。 */
export function simplifiedAt(x: number): number {
  return x + 1;
}

/**
 * 这两个写法在 x ≠ 1 处**完全相同**,在 x = 1 处**不同**:
 * 一个没有值,一个有。这正是那个洞的来历。
 */
export function agreesAway(x: number): boolean {
  const raw = rawAt(x);
  return raw !== null && Math.abs(raw - simplifiedAt(x)) <= 1e-9;
}

/* ══ 极限:两条独立路径 ════════════════════════════════════════════ */

/**
 * 路径 A —— **代数约分**。`(x²−1)/(x−1) = (x−1)(x+1)/(x−1) = x+1`(x ≠ 1),
 * 而 `x + 1` 是多项式、处处连续,所以极限就是它在 1 处的值。精确。
 *
 * ⚠️ 注意这个函数**没有参数**能告诉它 f(1) 是多少。这是刻意的。
 */
export function limitAtHole(): number {
  return simplifiedAt(A);
}

/** 提示词点名的靠近值:0.9 / 0.99 / 0.999… 与 1.01 / 1.001… */
const GAPS: readonly number[] = [0.5, 0.1, 0.01, 0.001];

export function approachSequence(side: Side): readonly number[] {
  const sign = side === 'left' ? -1 : 1;
  return GAPS.map((gap) => Number((A + sign * gap).toFixed(6)));
}

/**
 * 路径 B —— **用原始式沿两侧各走一串取样**。
 * 全程只调用 `rawAt`,一次都不碰约分后的写法,也碰不到 f(1)。
 */
export function approachedValue(side: Side, terms = 10): number {
  const sign = side === 'left' ? -1 : 1;
  let last = Number.NaN;
  for (let k = 1; k <= terms; k += 1) {
    const value = rawAt(A + sign * 10 ** -k);
    if (value !== null) last = value;
  }
  return last;
}

/* ══ 孤立点 ════════════════════════════════════════════════════════ */

export function snapY(value: number): number {
  return Math.round(value / STEP) * STEP;
}

/** 把孤立点的高度夹进可拖范围。 */
export function clampPointY(y: number): number {
  if (!Number.isFinite(y)) return HOLE_Y;
  return snapY(Math.min(Math.max(y, POINT_RANGE.from), POINT_RANGE.to));
}

/**
 * f(1) 现在是多少 —— `hole` 时没有值。
 * ⚠️ 这是**唯一**读得到孤立点的地方,而它和极限没有任何调用关系。
 */
export function valueAtA(mode: PointMode, pointY: number): number | null {
  return mode === 'hole' ? null : clampPointY(pointY);
}

/** 孤立点此刻是否恰好落在洞上(“它们可以相等,但不必”)。 */
export function pointSitsOnHole(mode: PointMode, pointY: number): boolean {
  const value = valueAtA(mode, pointY);
  return value !== null && Math.abs(value - limitAtHole()) <= STEP / 2;
}

/* ══ 两个走近的点 ══════════════════════════════════════════════════ */

export function snapX(value: number): number {
  return Math.round(value / STEP) * STEP;
}

export function clampToSide(side: Side, x: number): number {
  const snapped = snapX(Number.isFinite(x) ? x : A);
  return side === 'left'
    ? Math.min(Math.max(snapped, VIEW.from), snapX(A - MIN_GAP))
    : Math.max(Math.min(snapped, VIEW.to), snapX(A + MIN_GAP));
}

export interface Approach {
  readonly x: number;
  readonly y: number;
  readonly gap: number;
}

/** ⚠️ 用**原始式**读,不用约分式 —— 学生拖的是那条真函数。 */
export function readApproach(side: Side, x: number): Approach {
  const clamped = clampToSide(side, x);
  return { x: clamped, y: rawAt(clamped) ?? simplifiedAt(clamped), gap: Math.abs(clamped - A) };
}

export function stepCloser(side: Side, x: number): number {
  const here = clampToSide(side, x);
  const next = GAPS.find((gap) => gap < Math.abs(here - A) - EPS);
  if (next === undefined) return here;
  return clampToSide(side, A + (side === 'left' ? -next : next));
}

export function resetApproach(side: Side): number {
  return clampToSide(side, approachSequence(side)[0]!);
}

/** 画线用的取样:**两侧分开**,洞处不连过去。 */
export function sampleBranch(side: Side, count = 120): readonly { x: number; y: number }[] {
  const from = side === 'left' ? VIEW.from : A;
  const to = side === 'left' ? A : VIEW.to;
  return Array.from({ length: count + 1 }, (_, i) => {
    const x = from + ((to - from) * i) / count;
    return { x, y: simplifiedAt(x) };
  });
}

/* ══ 显示 ══════════════════════════════════════════════════════════ */

export function showX(x: number): string {
  return showNumber(x, 3);
}

export function showY(y: number | null): string {
  return y === null ? 'undefined' : showNumber(y, 3);
}

export function showShort(y: number | null): string {
  if (y === null) return 'undefined';
  return Number.isInteger(y) ? String(y) : showNumber(y, 2);
}

export const RAW_TEX = '\\frac{x^2 - 1}{x - 1}';
export const SIMPLIFIED_TEX = 'x + 1';
export const LIMIT_TEX = `\\lim_{x \\to ${A}} f(x) = ${limitAtHole()}`;

/** `f(1) = 5` 或 `f(1) \text{ is undefined}` */
export function valueTex(mode: PointMode, pointY: number): string {
  const value = valueAtA(mode, pointY);
  return value === null
    ? `f(${A}) \\;\\text{is undefined}`
    : `f(${A}) = ${showShort(value)}`;
}
