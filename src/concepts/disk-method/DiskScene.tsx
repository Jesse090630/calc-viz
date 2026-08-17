/**
 * CONCEPT — Disk Method 的场景装配
 *
 * 注意这个文件有多短:整条链**没有新增一行几何代码**。
 * 圆盘就是 rIn = 0 的壳,横着摞而已(Shell 是竖着立)。
 * 这是"engine + scene 抽象对了"的实证 —— 加第二个概念只写了数据和装配。
 */
import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import type { SceneProps } from '../../engine/types';
import { PARABOLA_DOWN, PARABOLA_INVERSE } from '../../math/curves';
import { diskSlices } from '../../math/solids';
import type { CurveSpec, Interval } from '../../math/types';
import type { ViewportCurve } from '../../math/expression';
import { formatCoordinate } from '../../math/format';
import type { ShellSurfaceSpec } from '../../math/shellSurface';
import { Stage3D } from '../../scene/Stage3D';
import {
  Axes,
  FunctionCurve,
  MathLabel,
  RegionFill,
  SidewaysFunctionCurve,
  SidewaysRegionFill,
} from '../../scene/primitives';
import { Shell, SolidStack, type SolidRing } from '../../scene/RevolutionMesh';
import { COLOR } from '../../scene/theme';
import { OBJ } from './chain';

/** 画在 xy 平面上的还是原来那条 y = 4 − x²(区域不变,只是切法变了) */
const DRAW_CURVE = PARABOLA_DOWN;
/** 计算用的是它的反函数:给定高度 y,半径是多少 */
const RADIUS = PARABOLA_INVERSE;
const f2 = (v: number): string => v.toFixed(2);

export function DiskScene({
  stage,
  params,
  visible,
  sourceRadius = RADIUS,
  sourceInterval = sourceRadius.domain,
  viewport,
  displayTop = 2,
  clamped = false,
}: SceneProps & {
  sourceRadius?: CurveSpec;
  sourceInterval?: Interval;
  viewport?: ViewportCurve;
  displayTop?: number;
  clamped?: boolean;
}) {
  const get = (key: string, fallback: number): number => params[key] ?? fallback;

  const sourceY0 = get('y0', 1.4);
  const sourceDy = get('dy', 0.4);
  const theta = get('theta', Math.PI * 2);
  const n = Math.max(1, Math.round(get('n', 8)));
  const sourceR = sourceRadius.f(sourceY0);
  const y0 = viewport?.toDisplayX(sourceY0) ?? sourceY0;
  const dy = viewport?.toDisplayWidth(sourceDy) ?? sourceDy;
  const r = viewport?.toDisplayY(sourceR) ?? sourceR;
  const drawRadius = viewport?.curve;

  // 圆盘 = rIn 为 0 的壳:高度就是厚度 Δy,整体沿 y 轴抬到该层
  const spec: ShellSurfaceSpec = {
    rIn: 0,
    rOut: r,
    height: dy,
    thetaMax: Math.max(theta, 1e-3),
    bend: 1,
  };

  const rings = useMemo<SolidRing[]>(
    () =>
      diskSlices(sourceRadius, n, sourceInterval).map((s) => ({
        rIn: 0,
        rOut: viewport?.toDisplayY(s.r) ?? s.r,
        height: viewport?.toDisplayWidth(s.dt) ?? s.dt,
        offsetY: viewport?.toDisplayX(s.t - s.dt / 2) ?? s.t - s.dt / 2, // 该层的底面高度
      })),
    [n, sourceRadius, sourceInterval, viewport],
  );

  const isFront = stage.camera === 'front';
  const custom = viewport !== undefined && drawRadius !== undefined;
  const radiusLabelX = viewport?.toDisplayY(displayTop) ?? displayTop;

  return (
    <Stage3D preset={stage.camera}>
      {visible(OBJ.axes) && (
        <>
          <Axes depth={!isFront} ticks={isFront && !custom} />
          {custom && isFront && (
            <>
              <MathLabel position={[-0.25, viewport.interval[0], 0]} color={COLOR.thickness}>{formatCoordinate(sourceInterval[0])}</MathLabel>
              <MathLabel position={[-0.25, viewport.interval[1], 0]} color={COLOR.thickness}>{formatCoordinate(sourceInterval[1])}</MathLabel>
              <MathLabel position={[radiusLabelX, -0.35, 0]} color={COLOR.radius}>{displayTop}</MathLabel>
              {clamped && <MathLabel position={[1, 4.35, 0]} color={COLOR.introduce}>radius clipped above {displayTop}</MathLabel>}
            </>
          )}
        </>
      )}
      {visible(OBJ.curve) && (custom
        ? <SidewaysFunctionCurve curve={drawRadius} interval={viewport.interval} />
        : <FunctionCurve curve={DRAW_CURVE} interval={DRAW_CURVE.domain} />)}
      {visible(OBJ.region) && (custom
        ? <SidewaysRegionFill curve={drawRadius} interval={viewport.interval} />
        : <RegionFill curve={DRAW_CURVE} interval={DRAW_CURVE.domain} />)}

      {/* 横向取样条:从 y 轴伸到曲线,高 Δy */}
      {visible(OBJ.slab) && (
        <>
          <group position={[r / 2, y0, 0.02]} scale={[r, dy, 1]}>
            <mesh>
              <planeGeometry args={[1, 1]} />
              <meshBasicMaterial color={COLOR.hero} transparent opacity={0.92} side={2} />
            </mesh>
          </group>
          {isFront && (
            <>
              <MathLabel position={[r + 0.75, y0, 0]} color="#fca5a5">
                r = {f2(sourceR)}
              </MathLabel>
              <MathLabel position={[-0.75, y0, 0]} color="#cbd5e1">
                Δt = {f2(sourceDy)}
              </MathLabel>
            </>
          )}
        </>
      )}

      {visible(OBJ.disk) && <Shell spec={spec} offsetY={y0 - dy / 2} />}

      {visible(OBJ.dimLabels) && (
        <>
          <Line
            points={[
              [0, y0, 0],
              [r, y0, 0],
            ]}
            color={COLOR.radius}
            lineWidth={3}
          />
          <MathLabel position={[r / 2, y0 + 0.42, 0]} color="#fca5a5">
            radius = {f2(sourceR)}
          </MathLabel>
          <MathLabel position={[0, y0 - 0.75, r + 0.4]} color="#cbd5e1">
            thickness = Δt = {f2(sourceDy)}
          </MathLabel>
        </>
      )}

      {visible(OBJ.disks) && <SolidStack rings={rings} opacity={0.72} />}
    </Stage3D>
  );
}
