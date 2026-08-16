/**
 * SCENE — 旋转体网格(Shell / Disk / Washer 共用)
 *
 * 一个几何打天下:`shellSurfacePoint` 描述的是"内半径 rIn、外半径 rOut、高 height"的圆环柱。
 *   Shell  → rIn = x−Δx/2, rOut = x+Δx/2, height = f(x),竖着立在 xz 平面上
 *   Disk   → rIn = 0,      rOut = r(y),   height = Δy,  横着摞在 y 轴上
 *   Washer → rIn = 内半径,  rOut = 外半径, height = Δy
 * 三者都是同一个函数的不同取参。Disk 因此**没有新增一行几何代码**。
 *
 * 形状的正确性由 src/math/shellSurface.test.ts 保证,这里只管挂进场景和生命周期。
 */
import { useEffect, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { unrollShiftX, unrollYaw, type ShellSurfaceSpec } from '../math/shellSurface';
import { createShellGeometry, updateShellGeometry } from './geometry/shellGeometry';
import { COLOR } from './theme';

/** 单个可变形的壳。支持扫掠(thetaMax)与展开(bend)两种动画。 */
export function Shell({
  spec,
  color = COLOR.hero,
  opacity = 0.94,
  segments = 96,
  offsetY = 0,
}: {
  spec: ShellSurfaceSpec;
  color?: string;
  opacity?: number;
  segments?: number;
  offsetY?: number;
}) {
  const geometry = useMemo(() => createShellGeometry(segments), [segments]);

  useLayoutEffect(() => {
    updateShellGeometry(geometry, spec);
  }, [geometry, spec]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group
      rotation={[0, unrollYaw(spec.bend), 0]}
      position={[unrollShiftX(spec), offsetY, 0]}
    >
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={color}
          roughness={0.42}
          metalness={0.05}
          side={THREE.DoubleSide}
          transparent
          opacity={opacity}
        />
      </mesh>
    </group>
  );
}

/** 堆叠里的一环。tint ∈ [0,1] 决定色相位置,用来把"内层 / 外层"或"下层 / 上层"看清楚。 */
export interface SolidRing {
  readonly rIn: number;
  readonly rOut: number;
  readonly height: number;
  readonly offsetY: number;
}

/**
 * n 个静态环。几何只在 rings 变化时重建 —— 拖 n 的时候才 churn,动画帧内不会。
 */
export function SolidStack({
  rings,
  opacity = 0.55,
}: {
  rings: readonly SolidRing[];
  opacity?: number;
}) {
  // 环越多每个越细,圆周分段可以越少;视觉无差别,n=64 时省一半以上顶点
  const segments = rings.length > 48 ? 24 : rings.length > 24 ? 32 : 64;

  const built = useMemo(
    () =>
      rings.map((r) => {
        const geometry = createShellGeometry(segments);
        updateShellGeometry(geometry, {
          rIn: r.rIn,
          rOut: r.rOut,
          height: r.height,
          thetaMax: Math.PI * 2,
          bend: 1,
        });
        return geometry;
      }),
    [rings, segments],
  );

  useEffect(() => () => built.forEach((g) => g.dispose()), [built]);

  return (
    <group>
      {built.map((geometry, i) => (
        <mesh key={i} geometry={geometry} position={[0, rings[i]?.offsetY ?? 0, 0]}>
          <meshStandardMaterial
            color={new THREE.Color().setHSL(
              0.09 + 0.42 * (built.length === 1 ? 0 : i / (built.length - 1)),
              0.75,
              0.55,
            )}
            roughness={0.45}
            side={THREE.DoubleSide}
            transparent
            opacity={opacity}
          />
        </mesh>
      ))}
    </group>
  );
}
