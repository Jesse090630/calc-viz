/**
 * MATH — 平均变化率与割线斜率
 *
 *   f 在 [a, b] 上的平均变化率 =  (f(b) − f(a)) / (b − a)
 *
 * ⚠️ 这个模块只有一个真正的雷:**b − a = 0**。
 * 那时分子分母同时为 0,`0/0` 在 JS 里是 `NaN` ——
 * 而 NaN 不会让任何东西崩,它只会变成屏幕上一个看不见的错(CLAUDE.md 记过好几次)。
 * 所以 `averageRate` 在 a === b 时**返回 null**,由界面负责说"这里没有值"。
 *
 * ⭐ 第二条独立路径不是"换个写法再算一遍",而是一个**代数恒等式**:
 *   对 f(x) = x²,
 *       (b² − a²) / (b − a) = (b − a)(b + a) / (b − a) = a + b
 *   所以平均变化率**恰好等于两个输入之和**。a = 1, b = 3 → 4,不用算也知道。
 * 这条路径完全不做除法,因此能独立验证差商;它同时也是这一节最好的教学点 ——
 * 学生可以在拖动之前**预测**读数。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import { showNumber } from './format';

/** 这一节固定用 f(x) = x²(提示词指定) */
export const SECANT_FN = {
  tex: 'f(x) = x^2',
  label: 'x²',
  at: (x: number): number => x * x,
} as const;

/** 可拖动的范围 */
export const DOMAIN = { a: -3.2, b: 3.2 } as const;

export interface SecantReading {
  readonly a: number;
  readonly b: number;
  readonly fa: number;
  readonly fb: number;
  /** Δx = b − a */
  readonly run: number;
  /** Δy = f(b) − f(a) */
  readonly rise: number;
  /** Δy / Δx。**a === b 时为 null,绝不是 NaN。** */
  readonly slope: number | null;
}

/**
 * 读出一对 a、b 的全部量。
 * ⚠️ 不在这里强制 a < b:公式对 a > b 同样成立(分子分母一起变号),
 * 顺序的约束是**界面**的事(见 `labs/shared/pairState.ts`),不是数学的事。
 */
export function readSecant(a: number, b: number): SecantReading | null {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const fa = SECANT_FN.at(a);
  const fb = SECANT_FN.at(b);
  if (!Number.isFinite(fa) || !Number.isFinite(fb)) return null;
  const run = b - a;
  const rise = fb - fa;
  return {
    a,
    b,
    fa,
    fb,
    run,
    rise,
    // 0/0 在这里被挡住。返回 null 而不是 NaN。
    slope: run === 0 ? null : rise / run,
  };
}

/**
 * 第二条路径:对 x² 来说平均变化率就是 a + b。
 * **不做任何除法**,所以它和差商是真正独立的两条路。
 */
export function slopeByIdentity(a: number, b: number): number | null {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return null;
  return a + b;
}

/** 割线:y = slope·(x − a) + f(a)。给绘图用,延伸到整个窗口。 */
export interface SecantLine {
  readonly slope: number;
  readonly at: (x: number) => number;
}

export function secantLine(reading: SecantReading): SecantLine | null {
  if (reading.slope === null) return null;
  const { slope, a, fa } = reading;
  return { slope, at: (x: number) => slope * (x - a) + fa };
}

/**
 * 「把两点靠近」用的一串 b 值:从当前位置几何式地逼近 a,但**永不到达**。
 *
 * ⚠️ 最后一步必须仍然满足 b ≠ a。这一节**不讲导数**,
 * 所以这里既不取极限也不假装取到了极限 —— 只是让学生看见读数在往 2a 靠。
 */
export function approachSequence(a: number, from: number, steps = 26): readonly number[] {
  const out: number[] = [];
  let gap = from - a;
  if (gap === 0) return out;
  for (let i = 0; i < steps; i += 1) {
    gap *= 0.82;
    // 留一条底线:靠得再近也不许重合
    if (Math.abs(gap) < 0.02) break;
    out.push(a + gap);
  }
  return out;
}

/** 曲线折线点 */
export function sampleCurve(
  from: number,
  to: number,
  count = 260,
): readonly { x: number; y: number }[] {
  const n = Math.max(2, Math.floor(count));
  return Array.from({ length: n + 1 }, (_, i) => {
    const x = from + ((to - from) * i) / n;
    return { x, y: SECANT_FN.at(x) };
  });
}

/**
 * 把读数写成算式字符串,例如 `(9.00 − 1.00) / (3.00 − 1.00)`。
 * ⚠️ 减号用 U+2212,不是连字符 —— 等宽字体里连字符太短,看起来像别的符号。
 */
export function riseExpression(reading: SecantReading): string {
  return `${showNumber(reading.fb)} − ${showNumber(reading.fa)} = ${showNumber(reading.rise)}`;
}

export function runExpression(reading: SecantReading): string {
  return `${showNumber(reading.b)} − ${showNumber(reading.a)} = ${showNumber(reading.run)}`;
}

export function slopeExpression(reading: SecantReading): string {
  if (reading.slope === null) return 'undefined (0 / 0)';
  return `${showNumber(reading.rise)} / ${showNumber(reading.run)} = ${showNumber(reading.slope)}`;
}

export { showNumber };
