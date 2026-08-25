/**
 * MATH — 夹逼定理:`g(x) ≤ f(x) ≤ h(x)`,且 `g, h → L`,于是 `f → L`。
 *
 * 用的例子:`a = 0`,`L = 1`
 *   下界 g(x) = 1 − x²
 *   中间 f(x) = 1 + x² sin(5/x)   ← 在 0 附近**无限次摆动**
 *   上界 h(x) = 1 + x²
 *
 * ⚠️⚠️ 这一节的说服力全在**中间那条不能靠"看趋势"判断**这件事上。
 * f 在 0 附近摆动得越来越快,盯着它看只会觉得"没有极限";
 * 但因为 `|sin| ≤ 1`,它被两条抛物线夹死,而那两条都收到 1 ——
 * 所以 f 也只能收到 1。这是**推理**赢过**观察**的地方。
 *
 * ⚠️ f 在 x = 0 处没有定义(sin(5/0)),返回 `null`,不返回 NaN。
 * 夹逼定理**本来就不要求** f 在 a 处有定义 —— 这一点顺带把上一节的话再讲一遍。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import { showNumber } from './format';

export const EPS = 1e-12;
export const A = 0;
export const L = 1;
/** 摆动频率。越大摆得越密,越能说明"看不出趋势"。 */
export const WIGGLE = 5;

export const VIEW = { from: -1.05, to: 1.05 } as const;
/** 扫描线最近能到多近 —— 到不了 0。 */
export const MIN_GAP = 0.004;
export const STEP = 0.002;

/* ══ 三条曲线 ══════════════════════════════════════════════════════ */

export function lower(x: number): number {
  return L - x * x;
}

export function upper(x: number): number {
  return L + x * x;
}

/** ⚠️ x = 0 处没有定义 —— 返回 null,不返回 NaN。 */
export function middle(x: number): number | null {
  if (!Number.isFinite(x)) return null;
  // ⚠️ x = 0 时 `sin(5/0)` = `sin(Infinity)` = NaN,于是整个表达式是 NaN ——
  //    下面这一行就把它挡住了。原来还单写了一句 `|x| <= EPS`,
  //    变异测试删掉它之后全绿:那是死代码,保证来自这一行。
  const y = L + x * x * Math.sin(WIGGLE / x);
  return Number.isFinite(y) ? y : null;
}

/** 上下界之间的距离:`h − g = 2x²`。这就是"中间还剩多少活动空间"。 */
export function gapAt(x: number): number {
  return upper(x) - lower(x);
}

/* ══ 夹住了吗:两条独立路径 ════════════════════════════════════════ */

/**
 * 路径 A —— **符号**。`|f − L| = x²|sin(5/x)| ≤ x²`,
 * 而 `h − L = x²`、`L − g = x²`,所以处处 `g ≤ f ≤ h`。不取样。
 */
export function trappedBySymbols(): boolean {
  // |sin| ≤ 1 是这条不等式的全部依据;写成断言而不是注释,方便被测试引用。
  return true;
}

/**
 * 路径 B —— **数值**。在整段上逐点检查 `g ≤ f ≤ h`。
 *
 * ⚠️ `fn` 可注入,**只为测试**。
 * 变异测试把取样数从 4000 砍到 20,全部测试照样绿 —— 因为这条 f **本来就处处夹住**,
 * 取样再稀也不会失败。可"取样够密"是这条检查的全部价值:
 * 稀疏扫描会**漏掉**只在窄区间里越界的情形。注入一个那样的函数才能把它钉住。
 */
export function trappedBySampling(
  // ⚠️ 显式标 `number`。`VIEW` 是 `as const`,直接当默认值会把类型窄化成字面量
  //    −1.05 / 1.05,传别的数编译不过(定义域那一节踩过同一个坑)。
  from: number = VIEW.from,
  to: number = VIEW.to,
  samples = 4000,
  fn: (x: number) => number | null = middle,
): boolean {
  for (let i = 0; i <= samples; i += 1) {
    const x = from + ((to - from) * i) / samples;
    const f = fn(x);
    if (f === null) continue;
    if (f < lower(x) - EPS || f > upper(x) + EPS) return false;
  }
  return true;
}

/* ══ 读数 ══════════════════════════════════════════════════════════ */

export interface Reading {
  readonly x: number;
  readonly g: number;
  readonly f: number | null;
  readonly h: number;
  readonly gap: number;
  /** 中间那条确实被夹住 */
  readonly ordered: boolean;
}

export function snapX(value: number): number {
  return Math.round(value / STEP) * STEP;
}

/** 扫描线夹在视野里,而且**到不了 a**。 */
export function clampScan(x: number): number {
  if (!Number.isFinite(x)) return 1;
  const snapped = snapX(x);
  if (Math.abs(snapped) < MIN_GAP) return snapped < 0 ? -MIN_GAP : MIN_GAP;
  return Math.min(Math.max(snapped, VIEW.from), VIEW.to);
}

export function read(x: number): Reading {
  const at = clampScan(x);
  const f = middle(at);
  return {
    x: at,
    g: lower(at),
    f,
    h: upper(at),
    gap: gapAt(at),
    ordered: f === null || (f >= lower(at) - EPS && f <= upper(at) + EPS),
  };
}

/** 「再靠近一点」:把距离减半,但永远到不了 a。 */
export function halveDistance(x: number): number {
  return clampScan(x / 2);
}

/* ══ 极限 ══════════════════════════════════════════════════════════ */

/** 两条边界都收到 L —— 这才是夹逼定理用得上的前提。 */
export function boundsConverge(): boolean {
  return Math.abs(lower(0) - L) <= EPS && Math.abs(upper(0) - L) <= EPS;
}

/**
 * ⚠️ 结论是**推出来的**,不是量出来的:
 * 两边都到 L,中间被夹住,所以中间也到 L。
 * 这个函数不取样、不看 f 的任何一个值 —— 那正是这一节要教的推理形状。
 */
export function squeezedLimit(): number {
  return L;
}

/* ══ 画线 ══════════════════════════════════════════════════════════ */

export function sampleBound(
  which: 'lower' | 'upper',
  from: number = VIEW.from,
  to: number = VIEW.to,
  count = 200,
): readonly { x: number; y: number }[] {
  const at = which === 'lower' ? lower : upper;
  return Array.from({ length: count + 1 }, (_, i) => {
    const x = from + ((to - from) * i) / count;
    return { x, y: at(x) };
  });
}

/**
 * 中间那条。⚠️ 取样必须**足够密**:摆动频率是 5/x,越靠近 0 越快,
 * 取样不够密画出来就是一团噪声,反而看不出"它被夹着"。
 * 所以靠近 0 的那一段用**几何加密**,而不是等距。
 */
export function sampleMiddle(count = 1400): readonly { x: number; y: number | null }[] {
  const points: { x: number; y: number | null }[] = [];
  for (let i = 0; i <= count; i += 1) {
    const t = i / count - 0.5; // −0.5 … 0.5
    const sign = t < 0 ? -1 : 1;
    // |t| 的三次方 → 靠近 0 的地方点密得多
    const x = sign * VIEW.to * (Math.abs(t) * 2) ** 3;
    points.push({ x, y: middle(x) });
  }
  return points;
}

/* ══ 显示 ══════════════════════════════════════════════════════════ */

export function showX(x: number): string {
  return showNumber(x, 3);
}

export function showY(y: number | null): string {
  return y === null ? 'undefined' : showNumber(y, 4);
}

export const LOWER_TEX = `g(x) = 1 - x^2`;
export const MIDDLE_TEX = `f(x) = 1 + x^2 \\sin\\!\\left(\\frac{${WIGGLE}}{x}\\right)`;
export const UPPER_TEX = `h(x) = 1 + x^2`;
export const CHAIN_TEX = `g(x) \\le f(x) \\le h(x)`;
export const SQUEEZE_TEX = `\\lim_{x \\to ${A}} g(x) = \\lim_{x \\to ${A}} h(x) = ${L} \\;\\Rightarrow\\; \\lim_{x \\to ${A}} f(x) = ${L}`;
