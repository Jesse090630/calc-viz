/**
 * MATH CORE — 精选曲线库
 *
 * v1 不接受用户输入任意 f(x)。每条曲线的导数与原函数都是手写解析式,
 * 因此屏幕上出现的每个数字都能被单测钉死(见 curves.test.ts)。
 */
import type { CurveSpec } from './types';

/** y = 4 − x²  在 [0, 2] —— Shell Method pilot 使用的曲线。绕 y 轴旋转,答案恰好 8π。 */
export const PARABOLA_DOWN: CurveSpec = {
  id: 'parabola-down',
  label: 'y = 4 − x²',
  tex: 'f(x) = 4 - x^2',
  f: (x) => 4 - x * x,
  df: (x) => -2 * x,
  F: (x) => 4 * x - (x * x * x) / 3, //        ∫ (4 − x²) dx
  xF: (x) => 2 * x * x - (x * x * x * x) / 4, // ∫ x(4 − x²) dx = ∫ (4x − x³) dx
  sqF: (x) => 16 * x - (8 / 3) * x * x * x + Math.pow(x, 5) / 5, // ∫ (4 − x²)² dx
  domain: [0, 2],
};

/**
 * x = √(4 − y) 在 [0, 4] —— 上面那条抛物线的**反函数**。
 *
 * 为什么需要它:Disk Method 是沿 y 方向横着切,被积变量是 y,
 * 所以需要"给定高度 y,这一层的半径是多少"。它和 PARABOLA_DOWN 描述的是同一条曲线,
 * 只是换了自变量 —— 因此绕 y 轴转出来的立体完全相同,体积必须都是 8π。
 * 这个"同一个立体、两种切法、同一个答案"正是 Disk 链的落点。
 */
export const PARABOLA_INVERSE: CurveSpec = {
  id: 'parabola-inverse',
  label: 'x = √(4 − y)',
  tex: 'g(y) = \\sqrt{4-y}',
  f: (y) => Math.sqrt(4 - y),
  df: (y) => -1 / (2 * Math.sqrt(4 - y)), // y = 4 处发散,是数学事实
  F: (y) => -(2 / 3) * Math.pow(4 - y, 1.5), //  ∫ √(4−y) dy
  xF: (y) => (2 / 5) * Math.pow(4 - y, 2.5) - (8 / 3) * Math.pow(4 - y, 1.5), // ∫ y√(4−y) dy
  sqF: (y) => 4 * y - (y * y) / 2, //            ∫ (4−y) dy
  domain: [0, 4],
};

/** y = x²  在 [0, 2] */
export const PARABOLA_UP: CurveSpec = {
  id: 'parabola-up',
  label: 'y = x²',
  tex: 'f(x) = x^2',
  f: (x) => x * x,
  df: (x) => 2 * x,
  F: (x) => (x * x * x) / 3, //        ∫ x² dx
  xF: (x) => (x * x * x * x) / 4, //   ∫ x³ dx
  sqF: (x) => Math.pow(x, 5) / 5, //   ∫ x⁴ dx
  domain: [0, 2],
};

/** y = √x  在 [0, 4] */
export const SQRT: CurveSpec = {
  id: 'sqrt',
  label: 'y = √x',
  tex: 'f(x) = \\sqrt{x}',
  f: (x) => Math.sqrt(x),
  df: (x) => 1 / (2 * Math.sqrt(x)), // x = 0 处发散,这是数学事实,测试里显式跳过端点
  F: (x) => (2 / 3) * Math.pow(x, 1.5), //  ∫ √x dx
  xF: (x) => (2 / 5) * Math.pow(x, 2.5), // ∫ x^{3/2} dx
  sqF: (x) => (x * x) / 2, //               ∫ x dx
  domain: [0, 4],
};

export const CURVES: readonly CurveSpec[] = [PARABOLA_DOWN, PARABOLA_INVERSE, PARABOLA_UP, SQRT];

export function getCurve(id: string): CurveSpec {
  const c = CURVES.find((k) => k.id === id);
  if (!c) throw new Error(`Unknown curve id: ${id}`);
  return c;
}
