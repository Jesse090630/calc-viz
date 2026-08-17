/**
 * MATH CORE — 黎曼和(与具体几何无关的通用版本)
 *
 * solids.ts 只是把被积函数换成 2πx·f(x) 后调用这里,不重复实现求和逻辑。
 */
import type { CurveSpec, Interval, RiemannRule } from './types';
import { adaptiveSimpson } from './quadrature';

/** 第 i 个子区间(共 n 个)的取样点。i 从 0 开始。 */
export function sampleX(a: number, b: number, n: number, i: number, rule: RiemannRule): number {
  const dx = (b - a) / n;
  switch (rule) {
    case 'left':
      return a + i * dx;
    case 'right':
      return a + (i + 1) * dx;
    case 'mid':
      return a + (i + 0.5) * dx; // ← 本项目默认。不是 a + i*dx
  }
}

/** ∫ₐᵇ g(x) dx 的黎曼和近似 */
export function riemannSum(
  g: (x: number) => number,
  [a, b]: Interval,
  n: number,
  rule: RiemannRule = 'mid',
): number {
  if (!Number.isInteger(n) || n < 1) throw new Error(`n must be a positive integer, got ${n}`);
  const dx = (b - a) / n;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += g(sampleX(a, b, n, i, rule)) * dx;
  return sum;
}

/**
 * 同一分割下左端点和与右端点和的差。
 *
 * 对单调递减曲线它就是夹住真实面积的上下界宽度；这里保留“逐矩形求和”这条
 * 计算路径，让调用方能与独立的端点恒等式 (f(a) − f(b))·Δx 互相验证。
 */
export function leftRightGap(curve: CurveSpec, n: number, interval: Interval = curve.domain): number {
  return riemannSum(curve.f, interval, n, 'left') - riemannSum(curve.f, interval, n, 'right');
}

export interface RiemannRectangle {
  /** 矩形在子区间内的几何中心(不是函数取样点) */
  readonly x: number;
  readonly dx: number;
  readonly height: number;
}

/** 给场景层的纯数据:矩形位置、宽度和由取样规则决定的高度。 */
export function riemannRectangles(
  curve: CurveSpec,
  n: number,
  interval: Interval = curve.domain,
  rule: RiemannRule = 'mid',
): RiemannRectangle[] {
  if (!Number.isInteger(n) || n < 1) throw new Error(`n must be a positive integer, got ${n}`);
  const [a, b] = interval;
  const dx = (b - a) / n;
  return Array.from({ length: n }, (_, i) => ({
    x: a + (i + 0.5) * dx,
    dx,
    height: curve.f(sampleX(a, b, n, i, rule)),
  }));
}

/** 曲线有解析原函数时使用闭式，否则自动退回自适应 Simpson。 */
export function definiteIntegralExact(
  curve: CurveSpec,
  interval: Interval = curve.domain,
): number {
  const [a, b] = interval;
  return curve.F ? curve.F(b) - curve.F(a) : adaptiveSimpson(curve.f, a, b);
}

/** 左右端点和夹缝恒等式中的端点差系数 f(a) − f(b)。 */
export function endpointDifference(
  curve: CurveSpec,
  interval: Interval = curve.domain,
): number {
  const [a, b] = interval;
  return curve.f(a) - curve.f(b);
}

/** 相对误差(百分比)。exact 为 0 时退化为绝对误差。 */
export function relativeError(approx: number, exact: number): number {
  return exact === 0 ? Math.abs(approx) : (Math.abs(approx - exact) / Math.abs(exact)) * 100;
}
