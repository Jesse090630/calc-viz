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
import type { ShellSurfaceSpec } from '../../math/shellSurface';
import { Stage3D } from '../../scene/Stage3D';
import { Axes, FunctionCurve, MathLabel, RegionFill } from '../../scene/primitives';
import { Shell, SolidStack, type SolidRing } from '../../scene/RevolutionMesh';
import { COLOR } from '../../scene/theme';
import { OBJ } from './chain';

/** 画在 xy 平面上的还是原来那条 y = 4 − x²(区域不变,只是切法变了) */
const DRAW_CURVE = PARABOLA_DOWN;
/** 计算用的是它的反函数:给定高度 y,半径是多少 */
const RADIUS = PARABOLA_INVERSE;
const Y_RANGE = RADIUS.domain;
const f2 = (v: number): string => v.toFixed(2);

export function DiskScene({ stage, params, visible }: SceneProps) {
  const get = (key: string, fallback: number): number => params[key] ?? fallback;

  const y0 = get('y0', 1.4);
  const dy = get('dy', 0.4);
  const theta = get('theta', Math.PI * 2);
  const n = Math.max(1, Math.round(get('n', 8)));
  const r = RADIUS.f(y0);

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
      diskSlices(RADIUS, n, Y_RANGE).map((s) => ({
        rIn: 0,
        rOut: s.r,
        height: s.dt,
        offsetY: s.t - s.dt / 2, // 该层的底面高度
      })),
    [n],
  );

  const isFront = stage.camera === 'front';

  return (
    <Stage3D preset={stage.camera}>
      {visible(OBJ.axes) && <Axes depth={!isFront} ticks={isFront} />}
      {visible(OBJ.curve) && <FunctionCurve curve={DRAW_CURVE} interval={DRAW_CURVE.domain} />}
      {visible(OBJ.region) && <RegionFill curve={DRAW_CURVE} interval={DRAW_CURVE.domain} />}

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
                r = {f2(r)}
              </MathLabel>
              <MathLabel position={[-0.75, y0, 0]} color="#cbd5e1">
                Δy = {f2(dy)}
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
            radius = {f2(r)}
          </MathLabel>
          <MathLabel position={[0, y0 - 0.75, r + 0.4]} color="#cbd5e1">
            thickness = Δy = {f2(dy)}
          </MathLabel>
        </>
      )}

      {visible(OBJ.disks) && <SolidStack rings={rings} opacity={0.72} />}
    </Stage3D>
  );
}
