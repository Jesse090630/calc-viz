/**
 * MATH CORE — 圆筒壳曲面的参数化
 *
 * 一份几何同时服务两个动画,这是刻意的设计:
 *   thetaMax : 扫掠到多少角度   → Stage 3「矩形绕轴转出一个壳」
 *   bend     : 1 = 完整圆筒,0 = 摊平的长方体 → Stage 5「把壳剪开摊平」
 *
 * 关键性质:**在中线半径处弧长严格守恒**。
 * 所以摊平后那条边确实是 2πr,不是为了好看随手拉出来的 —— 这是整个 Shell Method
 * 教学点的地基。如果这里是假的,后面讲什么都是错的。证明:
 *     中线弧长 = Rc · α_max = (rMid / bend) · (thetaMax · bend) = rMid · thetaMax
 * 与 bend 无关。∎
 *
 * ⚠️ 本文件是纯数学:返回普通对象,不 import three。因此可以用 vitest 直接验证几何。
 */

export interface ShellSurfaceSpec {
  /** 内半径 */
  readonly rIn: number;
  /** 外半径 */
  readonly rOut: number;
  readonly height: number;
  /** 已扫掠的角度,0 → 2π */
  readonly thetaMax: number;
  /** 1 = 卷成完整圆筒,0 = 完全摊平 */
  readonly bend: number;
}

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** bend 小于此值按"完全摊平"处理(避免 Rc = rMid/bend 溢出) */
const FLAT_EPS = 1e-4;

export const midRadius = (s: ShellSurfaceSpec): number => (s.rIn + s.rOut) / 2;

/** 中线扫过的弧长。bend = 0 时这就是摊平后长方体的长度。 */
export const sweptArcLength = (s: ShellSurfaceSpec): number => midRadius(s) * s.thetaMax;

/**
 * 曲面上一点。
 * @param u 沿扫掠方向 0→1(0 对应 +x 轴,与二维那根矩形同位置)
 * @param v 沿高度   0→1
 * @param w 沿厚度   0 = 内壁,1 = 外壁
 */
export function shellSurfacePoint(
  u: number,
  v: number,
  w: number,
  spec: ShellSurfaceSpec,
): Vec3 {
  const { rIn, rOut, height, thetaMax, bend } = spec;
  const rMid = (rIn + rOut) / 2;
  const d = rIn + w * (rOut - rIn) - rMid; // 相对中线的径向偏移
  const arc = rMid * thetaMax * u; // 沿中线走过的弧长
  const y = height * v;

  if (bend < FLAT_EPS) return { x: d, y, z: arc }; // 摊平(小角度极限)

  const curvatureRadius = rMid / bend;
  const angle = arc / curvatureRadius;
  // 曲率中心随 bend 移动,保证 bend = 1 时圆筒正好绕 y 轴
  const centerX = rMid * bend - curvatureRadius;

  return {
    x: centerX + (curvatureRadius + d) * Math.cos(angle),
    y,
    z: (curvatureRadius + d) * Math.sin(angle),
  };
}

/**
 * 摊平时整体绕 y 轴回摆的角度(弧度)。
 * 摊平后长条沿 +z 展开,回摆 90° 让它正对观众;bend = 1 时不转。
 * 这是渲染需要的量,但它由几何本身决定,所以放在这里而不是组件里。
 */
export const unrollYaw = (bend: number): number => (1 - bend) * (Math.PI / 2);

/** 摊平时整体沿 x 的平移,使长条居中于原点 */
export const unrollShiftX = (spec: ShellSurfaceSpec): number =>
  -(1 - spec.bend) * (sweptArcLength(spec) / 2);
