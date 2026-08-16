/**
 * CONCEPT — 壳的网格组件
 *
 * 形状由 math/shellSurface 决定(那边有测试),这里只管把它挂进场景、管好生命周期。
 * 每次参数变化都重填顶点数组而不是重建几何 —— 重建会在动画中不断产生垃圾。
 */
import { useEffect, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import {
  unrollShiftX,
  unrollYaw,
  type ShellSurfaceSpec,
} from '../../math/shellSurface';
import { createShellGeometry, updateShellGeometry } from '../../scene/geometry/shellGeometry';
import { COLOR } from '../../scene/theme';

export function Shell({
  spec,
  color = COLOR.hero,
  opacity = 0.94,
  segments = 96,
}: {
  spec: ShellSurfaceSpec;
  color?: string;
  opacity?: number;
  segments?: number;
}) {
  const geometry = useMemo(() => createShellGeometry(segments), [segments]);

  useLayoutEffect(() => {
    updateShellGeometry(geometry, spec);
  }, [geometry, spec]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group rotation={[0, unrollYaw(spec.bend), 0]} position={[unrollShiftX(spec), 0, 0]}>
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

export interface StackItem {
  readonly x: number;
  readonly dx: number;
  readonly h: number;
}

/**
 * n 个壳。几何只在 n 变化时重建(useMemo),拖 n 的时候不会每帧churn。
 * 颜色沿半径渐变,让"内层短、外层高"这件事一眼看得出来。
 */
export function ShellStack({ slices }: { slices: readonly StackItem[] }) {
  // 壳越多每个越细,圆周分段可以越少 —— 视觉上看不出差别,但 n = 64 时省一半以上顶点
  const segments = slices.length > 48 ? 24 : slices.length > 24 ? 32 : 64;

  const built = useMemo(
    () =>
      slices.map((s) => {
        const geometry = createShellGeometry(segments);
        updateShellGeometry(geometry, {
          rIn: s.x - s.dx / 2,
          rOut: s.x + s.dx / 2,
          height: s.h,
          thetaMax: Math.PI * 2,
          bend: 1,
        });
        return geometry;
      }),
    [slices, segments],
  );

  useEffect(() => () => built.forEach((g) => g.dispose()), [built]);

  return (
    <group>
      {built.map((geometry, i) => (
        <mesh key={i} geometry={geometry}>
          <meshStandardMaterial
            color={new THREE.Color().setHSL(
              0.09 + 0.42 * (built.length === 1 ? 0 : i / (built.length - 1)),
              0.75,
              0.55,
            )}
            roughness={0.45}
            side={THREE.DoubleSide}
            transparent
            opacity={0.55}
          />
        </mesh>
      ))}
    </group>
  );
}
