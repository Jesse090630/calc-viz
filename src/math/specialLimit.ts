/**
 * MATH — `lim_{x→0} sin x / x = 1` 的几何推导。
 *
 * 链条:**几何 → 不等式 → 夹逼 → 特殊极限**
 *   ① 单位圆上,对小的正 θ:`sin θ < θ < tan θ`(三块面积/长度的比较);
 *   ② 全体除以 sin θ 再取倒数,得到 `cos θ < sin θ / θ < 1`;
 *   ③ 两边都 → 1,夹逼给出中间也 → 1。
 *
 * ⚠️⚠️ **必须是弧度。** `θ` 之所以能直接夹在中间,是因为
 * 单位圆上**弧长等于弧度数**。换成角度,中间那一项会多一个 π/180 的因子,
 * 极限就变成 π/180 而不是 1。所以这个模块里
 *   · 所有角都是弧度;
 *   · `degreeVersionLimit()` 明确给出角度制下的那个"另一个答案",
 *     好让学生看见差别从哪来 —— 而不是被告诫"记得用弧度"。
 *
 * ⚠️ `ratio(0)` 返回 `null`。`sin 0 / 0` 在 JS 里是 `0/0 = NaN`,不报错。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import { showNumber } from './format';

export const EPS = 1e-15;

/** θ 的可拖范围(弧度)。上界略小于 π/2,tan 才不会炸。 */
export const THETA_RANGE = { from: 0.02, to: 1.2 } as const;
export const THETA_STEP = 0.001;

/* ══ 三个量:几何比较 ══════════════════════════════════════════════ */

export function sinOf(theta: number): number {
  return Math.sin(theta);
}

/** ⚠️ 弧长 = θ **本身** —— 只有在弧度制下成立,这就是整节课的关键。 */
export function arcOf(theta: number): number {
  return theta;
}

export function tanOf(theta: number): number {
  return Math.tan(theta);
}

/** `sin θ < θ < tan θ`,对 0 < θ < π/2。 */
export function inequalityHolds(theta: number): boolean {
  if (theta <= 0 || theta >= Math.PI / 2) return false;
  return sinOf(theta) < arcOf(theta) && arcOf(theta) < tanOf(theta);
}

/** 三块面积:内接三角形、扇形、外切三角形。都乘了 2 便于比较。 */
export function areas(theta: number): { inner: number; sector: number; outer: number } {
  return { inner: sinOf(theta), sector: arcOf(theta), outer: tanOf(theta) };
}

/* ══ 比值:两条独立路径 ════════════════════════════════════════════ */

/** ⚠️ θ = 0 处返回 null,不返回 NaN。 */
export function ratio(theta: number): number | null {
  if (!Number.isFinite(theta)) return null;
  // ⚠️ θ = 0 时 `sin 0 / 0` = NaN(不报错),下面这一行就挡住了。
  //    另写一句 `theta === 0` 是死代码 —— 变异测试删掉它全绿。
  const y = Math.sin(theta) / theta;
  return Number.isFinite(y) ? y : null;
}

/**
 * 路径 A —— **夹逼**。`cos θ ≤ sin θ / θ ≤ 1`,两边都 → 1,所以中间 → 1。
 * 这个函数不取样、不接参数:结论是推出来的。
 */
export function squeezedLimit(): number {
  return 1;
}

/** 夹逼的两条边界。 */
export function bounds(theta: number): { low: number; high: number } {
  return { low: Math.cos(theta), high: 1 };
}

/** 比值确实被夹在 `[cos θ, 1]` 里吗。 */
export function withinBounds(theta: number): boolean {
  const r = ratio(theta);
  if (r === null) return true;
  const b = bounds(theta);
  return r >= b.low - 1e-12 && r <= b.high + 1e-12;
}

/**
 * 路径 B —— **数值**。沿 10⁻ᵏ 走一串取样,看比值停在哪儿。
 * 全程不用 cos、不用夹逼。
 */
export function approachedValue(terms = 8): number {
  let last = Number.NaN;
  for (let k = 1; k <= terms; k += 1) {
    const v = ratio(Number(`1e-${k}`));
    if (v !== null) last = v;
  }
  return last;
}

/* ══ 角度制:另一个答案 ════════════════════════════════════════════ */

/**
 * ⚠️ 如果 θ 用**角度**度量,`sin(θ°)/θ` 的极限是 `π/180`,不是 1。
 * 把这个数摆出来,比反复叮嘱"记得用弧度"有用得多 ——
 * 学生能看见差别的来源:弧长只在弧度制下等于 θ。
 */
export const DEGREE_FACTOR = Math.PI / 180;

export function ratioInDegrees(degrees: number): number | null {
  if (!Number.isFinite(degrees)) return null;
  const y = Math.sin(degrees * DEGREE_FACTOR) / degrees;
  return Number.isFinite(y) ? y : null;
}

export function degreeVersionLimit(): number {
  return DEGREE_FACTOR;
}

/* ══ 拖动 ══════════════════════════════════════════════════════════ */

export function snapTheta(value: number): number {
  return Math.round(value / THETA_STEP) * THETA_STEP;
}

export function clampTheta(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return snapTheta(Math.min(Math.max(value, THETA_RANGE.from), THETA_RANGE.to));
}

/** 「再小一点」:把 θ 减半,但停在可拖范围内。 */
export function halveTheta(theta: number): number {
  return clampTheta(theta / 2);
}

/* ══ 取样 ══════════════════════════════════════════════════════════ */

export function sampleRatio(
  from: number,
  to: number,
  count = 240,
): readonly { x: number; y: number | null }[] {
  return Array.from({ length: count + 1 }, (_, i) => {
    const x = from + ((to - from) * i) / count;
    return { x, y: ratio(x) };
  });
}

export function sampleCos(from: number, to: number, count = 240): readonly { x: number; y: number }[] {
  return Array.from({ length: count + 1 }, (_, i) => {
    const x = from + ((to - from) * i) / count;
    return { x, y: Math.cos(x) };
  });
}

/* ══ 显示 ══════════════════════════════════════════════════════════ */

export function showTheta(theta: number): string {
  return showNumber(theta, 4);
}

export function showValue(value: number | null, places = 6): string {
  return value === null ? 'undefined' : showNumber(value, places);
}

/**
 * ⚠️ 几何面板那三个数要用**足够多的位数**。
 * θ 小到 0.02 时,sin θ / θ / tan θ 在四位小数下全都显示成 `0.0200` ——
 * 屏幕上于是写着 `0.0200 < 0.0200 < 0.0200`,把这一节唯一要证的严格不等式
 * 显示成了三个相等的数。(浏览器检查按显示值判定,当场抓到。)
 * 六位足以在整个可拖范围内分开它们,有测试钉着。
 */
export function showGeometry(value: number): string {
  return showNumber(value, 6);
}

export const GEOMETRY_TEX = '\\sin\\theta < \\theta < \\tan\\theta';
export const DIVIDED_TEX = '1 < \\frac{\\theta}{\\sin\\theta} < \\frac{1}{\\cos\\theta}';
export const FLIPPED_TEX = '\\cos\\theta < \\frac{\\sin\\theta}{\\theta} < 1';
export const RESULT_TEX = '\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1';
export const DEGREE_TEX = '\\lim_{x \\to 0} \\frac{\\sin(x^\\circ)}{x} = \\frac{\\pi}{180} \\approx 0.01745';

/** 代数推导的每一步,按顺序。界面上一步一步露出来。 */
export const STEPS: readonly { tex: string; note: string }[] = [
  { tex: GEOMETRY_TEX, note: 'Straight from the picture, for small positive θ.' },
  { tex: DIVIDED_TEX, note: 'Divide everything by sin θ — it is positive here, so the order is kept.' },
  { tex: FLIPPED_TEX, note: 'Take reciprocals. Flipping positive numbers reverses the order.' },
];
