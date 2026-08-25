/**
 * MATH — ε–δ:「给我任意 ε,我能找到 δ」
 *
 * `f(x) = 2x + 1`,`a = 2`,`L = 5`。
 *
 * ⚠️⚠️ **δ 的检验必须看整段,不能只看端点,也不能只看中点。**
 * 学生最容易接受的错误检验是"看看 f(a±δ) 落没落进带子里" —— 对线性函数碰巧对,
 * 对别的函数就错。这里两条路径**都**是整段判定,一条符号一条数值。
 *
 * ⚠️ 定义里的区间是**去心开区间** `0 < |x − a| < δ`,端点取不到。
 * 但两条路径都按**闭区间**判定 —— 这是刻意的:
 *   ① 闭区间成立 ⟹ 开区间必然成立(更严的要求,不会放过任何坏 δ);
 *   ② 两条路径于是能逐点对上,不必在"上确界取不取得到"上纠缠。
 * 把这个选择写下来,免得后来的人以为是疏忽。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import { showNumber } from './format';

export const EPS = 1e-9;

/** f(x) = SLOPE·x + INTERCEPT */
export const SLOPE = 2;
export const INTERCEPT = 1;
export const A = 2;
export const L = SLOPE * A + INTERCEPT; // 5

export function f(x: number): number {
  return SLOPE * x + INTERCEPT;
}

/** ε 的档位(提示词点名的那几个) */
export const EPS_LADDER: readonly number[] = [1, 0.5, 0.1, 0.01];
export const EPS_RANGE = { from: 0.01, to: 1.6 } as const;
export const DELTA_RANGE = { from: 0.005, to: 1.2 } as const;
export const STEP = 0.005;

export const VIEW = { from: A - 1.4, to: A + 1.4 } as const;
export const Y_VIEW = { from: L - 3.4, to: L + 3.4 } as const;

export function snap(value: number): number {
  return Math.round(value / STEP) * STEP;
}

export function clampEpsilon(value: number): number {
  if (!Number.isFinite(value)) return EPS_LADDER[0]!;
  return snap(Math.min(Math.max(value, EPS_RANGE.from), EPS_RANGE.to));
}

export function clampDelta(value: number): number {
  if (!Number.isFinite(value)) return DELTA_RANGE.to;
  return snap(Math.min(Math.max(value, DELTA_RANGE.from), DELTA_RANGE.to));
}

/* ══ 判定:两条独立路径 ════════════════════════════════════════════ */

/**
 * 路径 A —— **符号**。
 * `|f(x) − L| = |2x + 1 − 5| = 2|x − 2|`,所以 `|x − a| ≤ δ ⟹ |f − L| ≤ 2δ`。
 * 于是"整段都落进 ε 带"等价于 `2δ ≤ ε`。不取样、不求值。
 */
export function trappedBySymbols(epsilon: number, delta: number): boolean {
  return Math.abs(SLOPE) * delta <= epsilon + EPS;
}

/**
 * 路径 B —— **数值**。在 `[a − δ, a + δ]` 上密集取样,逐点检查 `|f − L| ≤ ε`。
 * 全程不用斜率、不做代数化简。
 *
 * ⚠️ `fn` 可注入,**只为测试**。
 * 变异测试发现:把整段扫描换成"只看一个端点",对这条**线性**函数完全等价
 * (最大值本来就在端点上),于是那个错误实现全绿。
 * 可"只看端点"是错的契约 —— 换个中间鼓包的函数立刻出事。
 * 注入一个非线性 fixture 才能把"整段判定"这件事真正钉住。
 */
export function trappedBySampling(
  epsilon: number,
  delta: number,
  samples = 200,
  fn: (x: number) => number = f,
): boolean {
  for (let i = 0; i <= samples; i += 1) {
    const x = A - delta + (2 * delta * i) / samples;
    if (Math.abs(fn(x) - L) > epsilon + EPS) return false;
  }
  return true;
}

/** 屏幕上用的那一个。两条路径有测试钉着必须一致。 */
export function isTrapped(epsilon: number, delta: number): boolean {
  return trappedBySymbols(epsilon, delta);
}

/** 保证成功的 δ:`ε / |斜率|`。这就是最后要揭示的那个公式。 */
export function requiredDelta(epsilon: number): number {
  return epsilon / Math.abs(SLOPE);
}

/** 当前 δ 下,输出实际能跑多远(带子需要多高才够) */
export function outputReach(delta: number): number {
  return Math.abs(SLOPE) * delta;
}

/** 逃出去多少 —— 失败时把差距摆出来,而不是只说"不行" */
export function overshoot(epsilon: number, delta: number): number {
  return Math.max(0, outputReach(delta) - epsilon);
}

/* ══ ε 的档位 ══════════════════════════════════════════════════════ */

/** 「再紧一点」:跳到比当前更小的下一档;已经最紧了就停住。 */
export function tighten(epsilon: number): number {
  const next = EPS_LADDER.find((e) => e < epsilon - EPS);
  return clampEpsilon(next ?? epsilon);
}

export function isTightest(epsilon: number): boolean {
  return epsilon <= EPS_LADDER[EPS_LADDER.length - 1]! + EPS;
}

/* ══ 画线 ══════════════════════════════════════════════════════════ */

export function sampleLine(
  from: number = VIEW.from,
  to: number = VIEW.to,
  count = 2,
): readonly { x: number; y: number }[] {
  // 直线两点就够;留 count 是为了将来换非线性函数时不用改调用方。
  return Array.from({ length: count + 1 }, (_, i) => {
    const x = from + ((to - from) * i) / count;
    return { x, y: f(x) };
  });
}

/* ══ 显示 ══════════════════════════════════════════════════════════ */

/**
 * ⚠️ 位数**跟着数量级走**,不能写死两位。
 * ε 收到 0.01 时 δ = 0.005,`toFixed(2)` 会把它显示成 "0.01" ——
 * 屏幕上于是写着 δ = 0.01 而实际是 0.005,连带 "0.01 ≤ 0.01" 看起来像刚好卡住,
 * 其实差了一倍。这是截图里一眼就露馅的假话。
 */
export function show(value: number, places?: number): string {
  const digits = places ?? (Math.abs(value) < 0.1 ? 3 : 2);
  return showNumber(value, digits);
}

/* ══ 取景:ε 越紧,画面越近 ════════════════════════════════════════ */

/**
 * ⚠️ ε = 0.01 时,横带在 6.8 高的画面里只有 0.6 像素 —— 学生什么也看不见,
 * "把它收紧"这件事在屏幕上就消失了。
 * 所以画面**跟着 ε 缩放**:纵向半高取 4ε(再夹进合理范围),
 * 横向半宽取纵向的一半(于是这条斜率 2 的直线在框里的样子保持不变)。
 *
 * 缩放是诚实的做法,但**必须告诉用户**画面变了 —— 见 `zoomFactor`,
 * 界面上有一个"×N"的角标。悄悄放大就是另一种骗人。
 */
export const BASE_HALF_HEIGHT = 3.4;

export function viewHalfHeight(epsilon: number): number {
  return Math.min(BASE_HALF_HEIGHT, Math.max(0.08, 4 * epsilon));
}

export function viewHalfWidth(epsilon: number): number {
  return viewHalfHeight(epsilon) / Math.abs(SLOPE);
}

/** 相对最宽视野放大了多少倍。1 表示没缩放。 */
export function zoomFactor(epsilon: number): number {
  return BASE_HALF_HEIGHT / viewHalfHeight(epsilon);
}

/** 档位显示成 `0.01` 而不是 `0.010` */
export function showTight(value: number): string {
  if (Math.abs(value - Math.round(value)) < 1e-9) return String(Math.round(value));
  return String(Number(value.toFixed(3)));
}

export const OUTPUT_TEX = `|f(x) - ${L}| < \\varepsilon`;
export const INPUT_TEX = `0 < |x - ${A}| < \\delta`;
export const ALGEBRA_TEX: readonly string[] = [
  `|f(x) - ${L}|`,
  `= |${SLOPE}x + ${INTERCEPT} - ${L}|`,
  `= ${SLOPE}|x - ${A}|`,
];
export const DELTA_TEX = `\\delta = \\frac{\\varepsilon}{${SLOPE}}`;
export const DEFINITION_TEX = `\\forall \\varepsilon > 0 \\;\\; \\exists \\delta > 0 : \\;\\; ${INPUT_TEX} \\;\\Rightarrow\\; ${OUTPUT_TEX}`;
