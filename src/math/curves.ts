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
  domain: [0, 2],
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
  domain: [0, 4],
};

export const CURVES: readonly CurveSpec[] = [PARABOLA_DOWN, PARABOLA_UP, SQRT];

export function getCurve(id: string): CurveSpec {
  const c = CURVES.find((k) => k.id === id);
  if (!c) throw new Error(`Unknown curve id: ${id}`);
  return c;
}
