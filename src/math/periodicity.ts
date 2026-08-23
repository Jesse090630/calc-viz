/**
 * MATH — 周期性
 *
 *   f 以 T 为周期(T > 0)当且仅当  f(x + T) = f(x)  **对每一个 x** 成立。
 *
 * ⚠️ 这一节的成败全在一个地方:**"看起来对齐"不等于"对齐"。**
 * 学生最常见的错误就是把 T = 6.2 当成 2π —— 画面上两条曲线几乎重合,
 * 肉眼根本分不出来。所以这个模块不返回 true/false 了事,
 * 而是返回一个**可以读出来的数**:`worstMismatch`,也就是
 *   max |f(x + T) − f(x)|  在取样点上的最大值。
 * T = 6.2 时它是 0.083 —— 屏幕上写着这个数,"几乎重合"就变成了"差 0.083",
 * 而不是一个凭感觉的判断。
 *
 * ⚠️ 另一条:滑块必须**真的能停在 2π 上**。
 * (CLAUDE.md 里 unit-circle 那一节踩过同一个坑:滑块步长 0.01,
 *  数学测试能直接传 π/6,可真实用户永远拖不到,网页上就永远显示不出精确值。)
 * 所以 T 的取值是 π/12 的整数倍 —— 够密,拖起来仍然连续;
 * 而 π/2、π、2π、4π 全都精确落在档位上。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import { formatCoordinate, showNumber } from './format';

export interface PeriodicFunction {
  readonly id: string;
  readonly tex: string;
  readonly label: string;
  readonly at: (x: number) => number;
  /**
   * 角频率 k(函数形如 sin(kx) / cos(kx))。
   * 存在的意义是提供**第二条独立路径**:基本周期 = 2π/k,不做任何数值搜索。
   */
  readonly frequency: number;
}

export const PERIODIC_FUNCTIONS: Readonly<Record<string, PeriodicFunction>> = {
  sin: {
    id: 'sin',
    tex: 'f(x) = \\sin x',
    label: 'sin(x)',
    at: Math.sin,
    frequency: 1,
  },
  cos: {
    id: 'cos',
    tex: 'f(x) = \\cos x',
    label: 'cos(x)',
    at: Math.cos,
    frequency: 1,
  },
  sin2x: {
    id: 'sin2x',
    tex: 'f(x) = \\sin 2x',
    label: 'sin(2x)',
    at: (x) => Math.sin(2 * x),
    frequency: 2,
  },
};

export const FUNCTION_ORDER: readonly string[] = ['sin', 'cos', 'sin2x'];

/* ── T 的档位 ─────────────────────────────────────────────────────────────── */

/** 滑块步长。π/12 让 π/2、π、3π/2、2π、4π 全部精确可选。 */
export const T_STEP = Math.PI / 12;
export const T_MAX = 4 * Math.PI;

/** 把任意 T 吸附到最近的档位上。**这是 2π 能被精确选中的唯一原因。** */
export function snapT(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const steps = Math.round(value / T_STEP);
  return Math.min(Math.max(steps, 0), Math.round(T_MAX / T_STEP)) * T_STEP;
}

/** 提示词点名的四个值 */
export const T_PRESETS: readonly { tex: string; value: number }[] = [
  { tex: '\\tfrac{\\pi}{2}', value: Math.PI / 2 },
  { tex: '\\pi', value: Math.PI },
  { tex: '2\\pi', value: 2 * Math.PI },
  { tex: '4\\pi', value: 4 * Math.PI },
];

/* ── 重合程度 ─────────────────────────────────────────────────────────────── */

export interface MatchReport {
  readonly shift: number;
  /** max |f(x+T) − f(x)|,取样点上的最大值。**这一节的核心读数。** */
  readonly worstMismatch: number;
  /** 最坏的那个 x —— 用来在图上指出"就是这里对不上" */
  readonly worstX: number;
  readonly matches: boolean;
  /** T 必须 > 0。T = 0 平凡成立,但它不是周期。 */
  readonly positive: boolean;
}

/**
 * 判定容差。
 *
 * ⚠️ **不能放宽。** T = 6.2(离 2π 差 0.083)的最坏误差约 0.083;
 * 容差一旦到那个量级,这一节最重要的教学点 ——「差一点就是不对」—— 当场消失。
 * 取 1e-6:远大于 sin(x+2π) − sin(x) 的浮点残差(~1e-16),
 * 又远小于任何一个"看起来很接近"的错误 T 造成的误差。
 */
export const MATCH_TOLERANCE = 1e-6;

/**
 * 在 [from, to] 上取样,量出把图像右移 T 之后与原图的最大偏离。
 *
 * 取样点故意用**非整齐**的步长(下面 `SAMPLES` 是质数),避免恰好只落在
 * sin 的零点或峰值上 —— 那种取样会让某些错误的 T 侥幸通过。
 */
const SAMPLES = 601;

/**
 * 取样窗口。
 *
 * ⚠️ 宽度不是随手定的:它**必须至少覆盖一个完整的基本周期**,否则窗口里
 * 函数变化太少,一个错误的 T 完全可能在这一小段上侥幸对得上。
 * 这里取 6π,是最慢那条曲线(2π)的三倍。
 * (变异测试把窗口砍到 π 时全部测试仍然绿 —— 说明当时没有任何东西
 *  在守着这条,所以补了 `SAMPLE_SPAN` 与下面那条断言。)
 */
export const SAMPLE_FROM = -2 * Math.PI;
export const SAMPLE_TO = 4 * Math.PI;
export const SAMPLE_SPAN = SAMPLE_TO - SAMPLE_FROM;

export function measureShift(
  fn: PeriodicFunction,
  shift: number,
  from = SAMPLE_FROM,
  to = SAMPLE_TO,
): MatchReport {
  if (!Number.isFinite(shift)) {
    return { shift: 0, worstMismatch: Infinity, worstX: 0, matches: false, positive: false };
  }
  let worstMismatch = 0;
  let worstX = from;
  for (let i = 0; i < SAMPLES; i += 1) {
    const x = from + ((to - from) * i) / (SAMPLES - 1);
    const gap = Math.abs(fn.at(x + shift) - fn.at(x));
    if (gap > worstMismatch) {
      worstMismatch = gap;
      worstX = x;
    }
  }
  const positive = shift > 0;
  return {
    shift,
    worstMismatch,
    worstX,
    // ⚠️ T = 0 的偏离恒为 0,但**它不是周期** —— 定义要求 T > 0。
    matches: positive && worstMismatch <= MATCH_TOLERANCE,
    positive,
  };
}

/** 这个 T 是不是一个周期(网格意义下) */
export function isPeriodOnGrid(fn: PeriodicFunction, shift: number): boolean {
  return measureShift(fn, shift).matches;
}

/* ── 基本周期:两条独立路径 ───────────────────────────────────────────────── */

/**
 * 路径 A —— **数值搜索**。从最小档位往上找第一个能对齐的 T。
 * 不用任何三角恒等式,纯粹靠比较函数值。
 */
export function fundamentalPeriodByScan(fn: PeriodicFunction): number | null {
  const maxSteps = Math.round(T_MAX / T_STEP);
  for (let i = 1; i <= maxSteps; i += 1) {
    const candidate = i * T_STEP;
    if (isPeriodOnGrid(fn, candidate)) return candidate;
  }
  return null;
}

/**
 * 路径 B —— **公式**。sin(kx) / cos(kx) 的基本周期是 2π/k,不做任何取样。
 * 与路径 A 推理方式完全不重叠,适合互证。
 */
export function fundamentalPeriodFromFrequency(fn: PeriodicFunction): number {
  return (2 * Math.PI) / fn.frequency;
}

/**
 * T 是基本周期的整数倍吗?
 * 「4π 也让函数重复」要靠这个说清楚:周期不唯一,但**最小的那个**唯一。
 */
export function multipleOfFundamental(fn: PeriodicFunction, shift: number): number | null {
  const fundamental = fundamentalPeriodFromFrequency(fn);
  if (fundamental <= 0) return null;
  const ratio = shift / fundamental;
  const rounded = Math.round(ratio);
  if (rounded < 1) return null;
  return Math.abs(ratio - rounded) < 1e-9 ? rounded : null;
}

/* ── 显示 ─────────────────────────────────────────────────────────────────── */

/**
 * 把 T 写成 π 的倍数。
 * ⚠️ 直接显示 6.283185 会让「2π」这件事整个消失 —— 学生看到的是一个随机小数。
 * `formatCoordinate` 已经会把 π 的整数与半整数倍写成 `2π`、`π/2` 这种形式,
 * 这里把它扩展到 π/12 档位上的其余情况。
 */
export function formatShift(value: number): string {
  const pretty = formatCoordinate(value, 'plain');
  // formatCoordinate 只认到 ±2π 的几个常见值;其余用 π 的分数近似表达
  if (pretty.includes('π') || value === 0) return pretty;
  const twelfths = Math.round(value / T_STEP);
  if (Math.abs(value - twelfths * T_STEP) > 1e-9) return showNumber(value, 3);
  if (twelfths % 12 === 0) return `${twelfths / 12}π`;
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const g = gcd(Math.abs(twelfths), 12);
  const numerator = twelfths / g;
  const denominator = 12 / g;
  return numerator === 1 ? `π/${denominator}` : `${numerator}π/${denominator}`;
}

/** TeX 版本,给公式面板用 */
export function formatShiftTex(value: number): string {
  const plain = formatShift(value);
  if (!plain.includes('π')) return plain;
  if (plain.includes('/')) {
    const [num, den] = plain.split('/');
    return `\\tfrac{${num!.replace('π', '\\pi')}}{${den}}`;
  }
  return plain.replace('π', '\\pi');
}

/** 曲线折线点 */
export function sampleCurve(
  fn: PeriodicFunction,
  from: number,
  to: number,
  count = 320,
): readonly { x: number; y: number }[] {
  const n = Math.max(2, Math.floor(count));
  return Array.from({ length: n + 1 }, (_, i) => {
    const x = from + ((to - from) * i) / n;
    return { x, y: fn.at(x) };
  });
}

export { showNumber };
