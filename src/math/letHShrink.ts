/**
 * MATH — 割线 → 切线:导数**为什么是一个极限**。
 *
 * `f(x) = x²`,定点 `P = (a, a²)`,动点 `Q = (a+h, (a+h)²)`。
 * 割线斜率 `(f(a+h) − f(a)) / h`,化简后是 `2a + h`,于是 `h → 0` 时它 → `2a`。
 *
 * ⚠️⚠️ **h 永远不等于 0。** 这不是实现细节,是这一节的全部内容:
 *   · h = 0 时分子分母同时为 0,割线**根本不存在**(两点重合,过一点的直线有无穷多条);
 *   · 所以 `slopeByDifference(a, 0)` 返回 `null`,不返回 `2a`;
 *   · 而 `2a + h` 在 h = 0 处有定义 —— **两者只在 h ≠ 0 时相等**,
 *     这一点差异正是"极限"这个词要处理的东西。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import { showNumber } from './format';

export const EPS = 1e-12;

export function f(x: number): number {
  return x * x;
}

export const A_RANGE = { from: -1.6, to: 2.2 } as const;
export const H_RANGE = { from: 0.01, to: 2 } as const;
export const H_STEP = 0.01;
/** 提示词点名的那串 h。 */
export const H_LADDER: readonly number[] = [2, 1, 0.5, 0.1, 0.01];
/** 小到这个程度就把标签从 SECANT 换成 TANGENT。 */
export const TANGENT_THRESHOLD = 0.05;

export const VIEW = { from: -2.2, to: 3.2 } as const;

/* ══ 斜率:两条独立路径 ════════════════════════════════════════════ */

/**
 * 路径 A —— **差商本身**。直接按定义算 `(f(a+h) − f(a)) / h`。
 * ⚠️ h = 0 时返回 `null`:0/0 在 JS 里是 NaN,一个不报错的假值。
 */
export function slopeByDifference(a: number, h: number): number | null {
  if (!Number.isFinite(a) || !Number.isFinite(h) || h === 0) return null;
  const value = (f(a + h) - f(a)) / h;
  return Number.isFinite(value) ? value : null;
}

/**
 * 路径 B —— **化简后的式子** `2a + h`。
 * 展开:`((a+h)² − a²)/h = (2ah + h²)/h = 2a + h`(约分只在 h ≠ 0 时合法)。
 */
export function slopeSimplified(a: number, h: number): number {
  return 2 * a + h;
}

/**
 * 极限斜率 `2a`。
 * ⚠️ **不接受 h** —— 结论与"走到多近"无关,那正是极限的意思。
 */
export function tangentSlope(a: number): number {
  return 2 * a;
}

/** 化简式在 h = 0 处**有**定义,而差商没有。这一句差异是这一节的核心。 */
export function agreeAwayFromZero(a: number, h: number): boolean {
  const raw = slopeByDifference(a, h);
  return raw !== null && Math.abs(raw - slopeSimplified(a, h)) <= 1e-9;
}

/* ══ 割线与切线 ════════════════════════════════════════════════════ */

export interface Line {
  readonly slope: number;
  readonly at: (x: number) => number;
}

export function secantLine(a: number, h: number): Line | null {
  const slope = slopeByDifference(a, h);
  if (slope === null) return null;
  return { slope, at: (x) => f(a) + slope * (x - a) };
}

export function tangentLine(a: number): Line {
  const slope = tangentSlope(a);
  return { slope, at: (x) => f(a) + slope * (x - a) };
}

/** 割线斜率与切线斜率还差多少 —— 正好是 h。 */
export function slopeGap(a: number, h: number): number {
  const slope = slopeByDifference(a, h);
  return slope === null ? Number.NaN : Math.abs(slope - tangentSlope(a));
}

/* ══ 拖动 ══════════════════════════════════════════════════════════ */

export function snapH(value: number): number {
  return Math.round(value / H_STEP) * H_STEP;
}

/** ⚠️ h **永远到不了 0**。下界就是这一节的物理边界。 */
export function clampH(value: number): number {
  if (!Number.isFinite(value)) return H_LADDER[0]!;
  return Math.min(Math.max(snapH(value), H_RANGE.from), H_RANGE.to);
}

export function clampA(value: number): number {
  if (!Number.isFinite(value)) return 1;
  const snapped = Math.round(value / 0.05) * 0.05;
  return Math.min(Math.max(snapped, A_RANGE.from), A_RANGE.to);
}

/** 「再小一点」:跳到阶梯里下一个更小的 h;到最小就停住。 */
export function shrinkH(h: number): number {
  const next = H_LADDER.find((v) => v < h - EPS);
  return next === undefined ? clampH(h) : clampH(next);
}

export function isTangentish(h: number): boolean {
  return h <= TANGENT_THRESHOLD + EPS;
}

/* ══ 画线 ══════════════════════════════════════════════════════════ */

export function sampleCurve(
  from: number = VIEW.from,
  to: number = VIEW.to,
  count = 160,
): readonly { x: number; y: number }[] {
  return Array.from({ length: count + 1 }, (_, i) => {
    const x = from + ((to - from) * i) / count;
    return { x, y: f(x) };
  });
}

/* ══ 显示 ══════════════════════════════════════════════════════════ */

export function showNum(value: number | null, places = 3): string {
  return value === null ? 'undefined' : showNumber(value, places);
}

export function showShort(value: number): string {
  return Number.isInteger(value) ? String(value) : showNumber(value, 2);
}

/** 三步代数,按顺序。 */
export function algebraSteps(a: number): readonly { tex: string; note: string }[] {
  const av = showShort(a);
  return [
    { tex: `\\frac{(${av}+h)^2 - ${av}^2}{h}`, note: 'Straight from the definition of the secant slope.' },
    { tex: `\\frac{${showShort(2 * a)}h + h^2}{h}`, note: 'Expand the square; the a² terms cancel.' },
    { tex: `${showShort(2 * a)} + h`, note: 'Divide by h — legal only because h ≠ 0.' },
  ];
}

export function limitTex(a: number): string {
  return `\\lim_{h \\to 0} \\left(${showShort(2 * a)} + h\\right) = ${showShort(2 * a)}`;
}

export function derivativeTex(a: number): string {
  return `f'(${showShort(a)}) = ${showShort(2 * a)}`;
}
