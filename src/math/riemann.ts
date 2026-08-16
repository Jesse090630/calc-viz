/**
 * MATH CORE — 黎曼和(与具体几何无关的通用版本)
 *
 * solids.ts 只是把被积函数换成 2πx·f(x) 后调用这里,不重复实现求和逻辑。
 */
import type { Interval, RiemannRule } from './types';

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

/** 相对误差(百分比)。exact 为 0 时退化为绝对误差。 */
export function relativeError(approx: number, exact: number): number {
  return exact === 0 ? Math.abs(approx) : (Math.abs(approx - exact) / Math.abs(exact)) * 100;
}
