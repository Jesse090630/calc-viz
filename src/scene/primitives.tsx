/**
 * SCENE — 通用图元
 *
 * 全部与具体概念无关:给一条 CurveSpec 和一个区间就能画。
 * Disk / Washer / Riemann / Derivative 以后直接复用这些。
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { Line, Html } from '@react-three/drei';
import type { CurveSpec, Interval } from '../math/types';
import { COLOR } from './theme';

const SAMPLES = 240;

/** 沿曲线均匀采样的点 */
function curvePoints(curve: CurveSpec, [a, b]: Interval): [number, number, number][] {
  return Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const x = a + ((b - a) * i) / SAMPLES;
    return [x, curve.f(x), 0] as [number, number, number];
  });
}

export function Axes({
  xMax = 3.1,
  yMax = 5,
  depth = false,
  ticks = true,
}: {
  xMax?: number;
  yMax?: number;
  depth?: boolean;
  ticks?: boolean;
}) {
  return (
    <group>
      <Line points={[[-0.6, 0, 0], [xMax, 0, 0]]} color={COLOR.axis} lineWidth={1.5} />
      <Line points={[[0, -0.3, 0], [0, yMax, 0]]} color={COLOR.axis} lineWidth={1.5} />
      {depth && (
        <Line points={[[0, 0, -0.6], [0, 0, xMax]]} color={COLOR.axisDepth} lineWidth={1.5} />
      )}
      {ticks && (
        <>
          {[1, 2].map((t) => (
            <Html key={`x${t}`} position={[t, -0.3, 0]} center style={tickStyle}>
              {t}
            </Html>
          ))}
          {[1, 2, 3, 4].map((t) => (
            <Html key={`y${t}`} position={[-0.26, t, 0]} center style={tickStyle}>
              {t}
            </Html>
          ))}
        </>
      )}
    </group>
  );
}

const tickStyle: React.CSSProperties = {
  color: '#8b9ac4',
  fontSize: 11,
  pointerEvents: 'none',
  userSelect: 'none',
};

export function FunctionCurve({ curve, interval }: { curve: CurveSpec; interval: Interval }) {
  const points = useMemo(() => curvePoints(curve, interval), [curve, interval]);
  return <Line points={points} color={COLOR.curve} lineWidth={2.5} />;
}

/** 曲线与 x 轴、y 轴围成的区域 */
export function RegionFill({ curve, interval }: { curve: CurveSpec; interval: Interval }) {
  const geometry = useMemo(() => {
    const [a, b] = interval;
    const shape = new THREE.Shape();
    shape.moveTo(a, 0);
    shape.lineTo(b, 0);
    for (let i = SAMPLES; i >= 0; i--) {
      const x = a + ((b - a) * i) / SAMPLES;
      shape.lineTo(x, curve.f(x));
    }
    return new THREE.ShapeGeometry(shape);
  }, [curve, interval]);

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial
        color={COLOR.region}
        transparent
        opacity={0.28}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/** 一根竖直取样矩形。位置取中点,宽 Δx,高 f(x) —— 与 math/solids 的 shellSlice 同约定。 */
export function SampleRectangle({
  x,
  dx,
  height,
  color = COLOR.hero,
}: {
  x: number;
  dx: number;
  height: number;
  color?: string;
}) {
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1)), []);
  // z 抬高一点点:与 RegionFill 同处 z = 0 会 z-fighting,矩形上会出现摩尔纹
  return (
    <group position={[x, height / 2, 0.02]} scale={[dx, height, 1]}>
      <mesh>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={color} transparent opacity={0.92} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#fde68a" />
      </lineSegments>
    </group>
  );
}

/** 世界坐标锚定的文字标注 */
export function MathLabel({
  position,
  color,
  children,
}: {
  position: [number, number, number];
  color: string;
  children: React.ReactNode;
}) {
  return (
    <Html position={position} center zIndexRange={[20, 0]}>
      <div
        style={{
          color,
          fontSize: 13,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          padding: '2px 7px',
          borderRadius: 6,
          background: 'rgba(8,12,26,.78)',
          border: '1px solid #243154',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {children}
      </div>
    </Html>
  );
}

/** 水平放置的圆环线,用来把"绕一圈的长度"画出来 */
export function CircleOutline({
  radius,
  y,
  color = COLOR.introduce,
}: {
  radius: number;
  y: number;
  color?: string;
}) {
  const points = useMemo(
    () =>
      Array.from({ length: 129 }, (_, i) => {
        const a = (i / 128) * Math.PI * 2;
        return [Math.cos(a), 0, Math.sin(a)] as [number, number, number];
      }),
    [],
  );
  return (
    <group position={[0, y, 0]} scale={[radius, 1, radius]}>
      <Line points={points} color={color} lineWidth={3} />
    </group>
  );
}
