/**
 * MATH CORE — 单侧极限与间断点
 *
 * ⚠️ 核心诚实性要求:`g(x) = (x²−1)/(x−1)` 在 x=1 处**必须真的算不出来**。
 * 绝不允许偷偷改用化简后的 x+1 —— 那就把这条链要讲的东西讲没了。
 * 所以 `at()` 老老实实做除法,拿到 0/0 = NaN 之后返回 **null**。
 *
 * 为什么返回 null 而不是 NaN:NaN 会一路往下传,把"无定义"悄悄变成屏幕上的一条线。
 * null 强迫每个调用方显式处理"这里没有值"这件事 —— 而那正是本链的主题。
 */
import type { Interval } from './types';

export type Side = 'left' | 'right';

/** 可能在某些点无定义的函数。`at` 返回 null 表示该点没有值。 */
export interface PartialFunction {
  readonly id: string;
  readonly label: string;
  readonly tex: string;
  readonly at: (x: number) => number | null;
  readonly domain: Interval;
  /** 无定义的点,画空心圈用 */
  readonly holes: readonly number[];
}

/** 把原始计算结果收敛成 number | null。非有限一律视为无定义。 */
const finiteOrNull = (v: number): number | null => (Number.isFinite(v) ? v : null);

/**
 * 可去间断:g(x) = (x²−1)/(x−1)。
 * 除 x=1 外处处等于 x+1,但 x=1 处是 0/0。极限存在(=2),函数值不存在。
 */
export const REMOVABLE: PartialFunction = {
  id: 'removable',
  label: 'g(x) = (x² − 1)/(x − 1)',
  tex: 'g(x)=\\dfrac{x^{2}-1}{x-1}',
  // 这里【就是】要让它算出 0/0。不要"优化"成 x+1。
  at: (x) => finiteOrNull((x * x - 1) / (x - 1)),
  domain: [-0.4, 2.6],
  holes: [1],
};

/**
 * 跳跃间断:左边是 x+1,右边是 x+2.5,x=1 处无定义。
 *
 * 刻意让**跳跃点仍在 x=1、左侧行为与 REMOVABLE 完全相同**(都趋向 2)。
 * 于是两条曲线之间唯一变化的就是右侧 —— 变量控制干净,对比最锐利,
 * 而且两者共用同一个取景框(不需要新的相机预设)。
 */
export const JUMP: PartialFunction = {
  id: 'jump',
  label: 'J(x) = x + 1 (x < 1), x + 2.5 (x > 1)',
  tex: 'J(x)=\\begin{cases}x+1 & x<1\\\\ x+2.5 & x>1\\end{cases}',
  at: (x) => (x === 1 ? null : x < 1 ? x + 1 : x + 2.5),
  domain: [-0.4, 2.6],
  holes: [1],
};

export const LIMIT_FUNCTIONS: readonly PartialFunction[] = [REMOVABLE, JUMP];

/** 从某一侧按给定距离逼近 a 的取样序列 */
export function approach(
  fn: PartialFunction,
  a: number,
  side: Side,
  distances: readonly number[],
): ReadonlyArray<{ readonly d: number; readonly x: number; readonly y: number | null }> {
  const sign = side === 'left' ? -1 : 1;
  return distances.map((d) => {
    const x = a + sign * d;
    return { d, x, y: fn.at(x) };
  });
}

/** 本项目统一使用的逼近档位(从粗到细) */
export const DISTANCES: readonly number[] = [0.5, 0.1, 0.01, 0.001];

/**
 * 单侧极限的数值估计。不做符号推导 —— 数值地看极限正是这条链要教的方法。
 *
 * ⚠️ 这里【不能】直接返回"很近的那个样本值"。
 * 在 d = 1e-6 处取样得到的是 1.999999,把它当成左极限显示出去是**误导** ——
 * 会让人以为极限就是 1.999999,而这条链的全部意义恰恰是区分"逼近值"和"极限"。
 *
 * 改用一阶 Richardson 外推:在 d 与 d/10 两处取样,若误差 ∝ d,
 *     lim ≈ y(d/10) + (y(d/10) − y(d)) / 9
 * 正好把线性误差项消掉。本链两条曲线在间断点附近都是线性的,所以外推是精确的。
 * 两个样本若彼此差得离谱(说明根本没在收敛,例如 1/x 在 0 处),返回 null。
 */
export function oneSidedLimit(fn: PartialFunction, a: number, side: Side): number | null {
  const sign = side === 'left' ? -1 : 1;
  const d = 1e-4;
  const near = fn.at(a + sign * d);
  const nearer = fn.at(a + (sign * d) / 10);
  if (near === null || nearer === null) return null;

  // 发散检测:收敛的序列,相邻两档应该在【互相靠拢】。
  // ⚠️ 判据必须是"两个样本之间的差小",不是"外推值离样本近" ——
  //    对 1/(x−1) 这种,外推值离样本只有 10% 却完全没在收敛,后者会漏判。
  if (Math.abs(nearer - near) > 1e-2 * Math.max(1, Math.abs(nearer))) return null;

  const extrapolated = nearer + (nearer - near) / 9;
  return Number.isFinite(extrapolated) ? extrapolated : null;
}

export interface LimitReport {
  readonly left: number | null;
  readonly right: number | null;
  /** 两侧都存在且一致 */
  readonly exists: boolean;
  /** exists 为真时的极限值 */
  readonly value: number | null;
  /** 函数在该点本身的值(可能为 null) */
  readonly valueAtPoint: number | null;
}

export function limitAt(fn: PartialFunction, a: number, tol = 1e-6): LimitReport {
  const left = oneSidedLimit(fn, a, 'left');
  const right = oneSidedLimit(fn, a, 'right');
  const exists = left !== null && right !== null && Math.abs(left - right) <= tol;
  return { left, right, exists, value: exists ? left : null, valueAtPoint: fn.at(a) };
}

/**
 * 把函数采样成若干**连续段**:遇到无定义的点就断开。
 * 场景层直接把每段画成一条折线,于是洞的位置天然是断的,
 * 而不是画出一条穿过去的直线 —— 那会把"这里没有值"这件事抹掉。
 */
export function sampleSegments(
  fn: PartialFunction,
  interval: Interval = fn.domain,
  samples = 400,
): ReadonlyArray<ReadonlyArray<readonly [number, number]>> {
  const [a, b] = interval;
  const segments: Array<Array<readonly [number, number]>> = [];
  let current: Array<readonly [number, number]> = [];

  for (let i = 0; i <= samples; i++) {
    const x = a + ((b - a) * i) / samples;
    const y = fn.at(x);
    // 靠洞太近的采样点也丢掉,免得折线在断口处出现一根尖刺
    const nearHole = fn.holes.some((h) => Math.abs(x - h) < (b - a) / samples);
    if (y === null || nearHole) {
      if (current.length > 1) segments.push(current);
      current = [];
      continue;
    }
    current.push([x, y]);
  }
  if (current.length > 1) segments.push(current);
  return segments;
}
