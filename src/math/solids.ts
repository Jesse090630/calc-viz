/**
 * MATH CORE — 旋转体体积(Shell Method)
 *
 * ─── 为什么半径一律取【中点】 ──────────────────────────────────────────
 * 一个内半径 r−Δx/2、外半径 r+Δx/2、高 h 的圆筒壳,真实体积是
 *     π(R² − r_in²)h  =  π[(r+Δx/2)² − (r−Δx/2)²]h  =  π(2rΔx)h  =  2πr·h·Δx
 * 也就是说:取中点半径时,「把壳展开成长方体」不是近似,是【恒等式】。
 * Shell Method 里唯一的近似来自"壳的高度在 Δx 内当作常数"。
 * 用左/右端点会破坏这个恒等式,也就破坏了这个教学点。
 * ──────────────────────────────────────────────────────────────────────
 */
import type { CurveSpec, Interval, RiemannRule, ShellSlice } from './types';
import { riemannSum } from './riemann';
import { adaptiveSimpson } from './quadrature';

/** 绕 y 轴旋转,Shell Method 的解析解:V = 2π ∫ₐᵇ x·f(x) dx */
export function shellVolumeExact(curve: CurveSpec, interval: Interval = curve.domain): number {
  const [a, b] = interval;
  return 2 * Math.PI * (curve.xF(b) - curve.xF(a));
}

/**
 * 同一个量的独立数值路径(自适应 Simpson)。
 * 存在的唯一目的:在测试里和 shellVolumeExact 交叉验证。
 * 若两者不一致,说明 curve.xF 写错了 —— 这是最容易犯且最难肉眼发现的错。
 */
export function shellVolumeNumeric(curve: CurveSpec, interval: Interval = curve.domain): number {
  const [a, b] = interval;
  return 2 * Math.PI * adaptiveSimpson((x) => x * curve.f(x), a, b);
}

/** n 个壳的黎曼和近似:Σ 2πxᵢ·f(xᵢ)·Δx */
export function shellRiemann(
  curve: CurveSpec,
  n: number,
  rule: RiemannRule = 'mid',
  interval: Interval = curve.domain,
): number {
  return riemannSum((x) => 2 * Math.PI * x * curve.f(x), interval, n, rule);
}

/** 第 i 个壳(共 n 个)的几何量,供 3D 场景直接使用 */
export function shellSlice(
  curve: CurveSpec,
  n: number,
  i: number,
  interval: Interval = curve.domain,
): ShellSlice {
  if (!Number.isInteger(n) || n < 1) throw new Error(`n must be a positive integer, got ${n}`);
  if (i < 0 || i >= n) throw new Error(`shell index ${i} out of range [0, ${n})`);
  const [a, b] = interval;
  const dx = (b - a) / n;
  const x = a + (i + 0.5) * dx; // 中点
  return { x, dx, h: curve.f(x) };
}

/** 全部 n 个壳 */
export function shellSlices(
  curve: CurveSpec,
  n: number,
  interval: Interval = curve.domain,
): ShellSlice[] {
  return Array.from({ length: n }, (_, i) => shellSlice(curve, n, i, interval));
}

/** 单个壳展开成长方体后的体积:2πr·h·Δx */
export function slabVolume({ x, dx, h }: ShellSlice): number {
  return 2 * Math.PI * x * h * dx;
}

/** 同一个壳的真实圆环体积:π(R² − r²)h。与 slabVolume 应当【完全相等】。 */
export function ringVolume({ x, dx, h }: ShellSlice): number {
  const rOut = x + dx / 2;
  const rIn = x - dx / 2;
  return Math.PI * (rOut * rOut - rIn * rIn) * h;
}
