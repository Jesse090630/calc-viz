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

/** 自变量沿竖轴、函数值沿横轴的曲线 x = r(t)，供 Disk Method 的半径输入复用。 */
export function SidewaysFunctionCurve({ curve, interval }: { curve: CurveSpec; interval: Interval }) {
  const points = useMemo(
    () => Array.from({ length: SAMPLES + 1 }, (_, i) => {
      const t = interval[0] + ((interval[1] - interval[0]) * i) / SAMPLES;
      return [curve.f(t), t, 0] as [number, number, number];
    }),
    [curve, interval],
  );
  return <Line points={points} color={COLOR.curve} lineWidth={2.5} />;
}

/** y 轴与 x = r(t) 之间的区域。 */
export function SidewaysRegionFill({
  curve,
  interval,
  color = COLOR.region,
  opacity = 0.28,
}: {
  curve: CurveSpec;
  interval: Interval;
  color?: string;
  opacity?: number;
}) {
  const geometry = useMemo(() => {
    const [a, b] = interval;
    const shape = new THREE.Shape();
    shape.moveTo(0, a);
    for (let i = 0; i <= SAMPLES; i++) {
      const t = a + ((b - a) * i) / SAMPLES;
      shape.lineTo(curve.f(t), t);
    }
    shape.lineTo(0, b);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, [curve, interval]);

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

/** 曲线与 x 轴、y 轴围成的区域 */
export function RegionFill({
  curve,
  interval,
  color = COLOR.region,
  opacity = 0.28,
}: {
  curve: CurveSpec;
  interval: Interval;
  color?: string;
  opacity?: number;
}) {
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
        color={color}
        transparent
        opacity={opacity}
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
  opacity = 0.92,
  outlineColor = '#fde68a',
}: {
  x: number;
  dx: number;
  height: number;
  color?: string;
  opacity?: number;
  outlineColor?: string;
}) {
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1)), []);
  // z 抬高一点点:与 RegionFill 同处 z = 0 会 z-fighting,矩形上会出现摩尔纹
  return (
    <group position={[x, height / 2, 0.02]} scale={[dx, height, 1]}>
      <mesh>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={outlineColor} transparent opacity={Math.min(1, opacity * 1.1)} />
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

/**
 * 曲线上的一个点。始终正对相机,所以在任何视角下都是一个圆。
 * derivative / limits / unit-circle 三条链都要用,所以放在通用图元里。
 */
export function PointMarker({
  position,
  color,
  radius = 0.055,
  hollow = false,
}: {
  position: [number, number, number];
  color: string;
  radius?: number;
  /** 空心 = 该点不属于函数(极限链里那个"洞") */
  hollow?: boolean;
}) {
  return (
    <group position={position}>
      <mesh renderOrder={5}>
        <circleGeometry args={[radius, 32]} />
        <meshBasicMaterial color={hollow ? COLOR.background : color} depthTest={false} />
      </mesh>
      <mesh renderOrder={6}>
        <ringGeometry args={[radius * 0.82, radius, 32]} />
        <meshBasicMaterial color={color} depthTest={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** 直角三角形的两条直角边,用来把 Δx / Δy 画出来 */
export function RiseRun({
  from,
  to,
  runColor = COLOR.thickness,
  riseColor = COLOR.height,
}: {
  from: readonly [number, number];
  to: readonly [number, number];
  runColor?: string;
  riseColor?: string;
}) {
  const corner: [number, number, number] = [to[0], from[1], 0];
  return (
    <group>
      <Line points={[[from[0], from[1], 0], corner]} color={runColor} lineWidth={2} dashed dashSize={0.06} gapSize={0.04} />
      <Line points={[corner, [to[0], to[1], 0]]} color={riseColor} lineWidth={2} dashed dashSize={0.06} gapSize={0.04} />
    </group>
  );
}

/** 水平放置的圆环线,用来把"绕一圈的长度"画出来 */
export function CircleOutline({
  radius,
  y,
  color = COLOR.introduce,
  plane = 'horizontal',
}: {
  radius: number;
  y: number;
  color?: string;
  plane?: 'horizontal' | 'front';
}) {
  const points = useMemo(
    () =>
      Array.from({ length: 129 }, (_, i) => {
        const a = (i / 128) * Math.PI * 2;
        return plane === 'front'
          ? ([Math.cos(a), Math.sin(a), 0] as [number, number, number])
          : ([Math.cos(a), 0, Math.sin(a)] as [number, number, number]);
      }),
    [plane],
  );
  return (
    <group
      position={[0, y, 0]}
      scale={plane === 'front' ? [radius, radius, 1] : [radius, 1, radius]}
    >
      <Line points={points} color={color} lineWidth={3} />
    </group>
  );
}
