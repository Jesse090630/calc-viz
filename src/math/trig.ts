/**
 * MATH CORE — 单位圆与弧长
 *
 * 这里只给出几何量,不 import 任何渲染库。场景里的移动点、投影读数与波形
 * 必须共用 circlePoint,否则两个“同步”的点可能只是看起来差不多。
 */

export type CirclePoint = readonly [x: number, y: number];

function requireFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) throw new Error(`${name} must be finite`);
}

/** 单位圆上从正 x 轴逆时针走 theta 弧度后的点。 */
export function circlePoint(theta: number): CirclePoint {
  requireFinite('theta', theta);
  return [Math.cos(theta), Math.sin(theta)];
}

/** 半径 r 的圆上转过 theta 弧度所走的几何弧长。 */
export function arcLength(theta: number, radius: number): number {
  requireFinite('theta', theta);
  requireFinite('radius', radius);
  if (radius < 0) throw new Error('radius must be non-negative');
  return Math.abs(theta) * radius;
}
