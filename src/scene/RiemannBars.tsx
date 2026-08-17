/**
 * SCENE — 通用黎曼矩形组
 *
 * 几何数据全部由 math/riemann 产出；这里仅负责把矩形画出来。
 * 规则、数量、颜色和透明度都由调用方传入，因此以后 FTC 等概念可以直接复用。
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CurveSpec, Interval, RiemannRule } from '../math/types';
import { riemannRectangles } from '../math/riemann';
import { SampleRectangle } from './primitives';
import { COLOR } from './theme';

export function RiemannBars({
  curve,
  interval = curve.domain,
  n,
  rule,
  color = COLOR.hero,
  opacity = 0.72,
  depthOffset = 0,
}: {
  curve: CurveSpec;
  interval?: Interval;
  n: number;
  rule: RiemannRule;
  color?: string;
  opacity?: number;
  depthOffset?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const rectangles = useMemo(
    () => riemannRectangles(curve, n, interval, rule),
    [curve, interval, n, rule],
  );

  useEffect(() => {
    if (group.current) group.current.scale.y = 0.001;
  }, []);

  useFrame((_, delta) => {
    if (!group.current || group.current.scale.y >= 0.999) return;
    const next = THREE.MathUtils.damp(group.current.scale.y, 1, 10, delta);
    group.current.scale.y = next > 0.999 ? 1 : next;
  });

  return (
    <group ref={group} position={[0, 0, depthOffset]}>
      {rectangles.map((rectangle, index) => (
        <SampleRectangle
          key={index}
          {...rectangle}
          color={color}
          opacity={opacity}
          outlineColor={color}
        />
      ))}
    </group>
  );
}
