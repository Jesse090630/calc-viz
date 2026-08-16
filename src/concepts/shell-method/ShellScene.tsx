/**
 * CONCEPT — Shell Method 的场景装配
 *
 * 这个文件只做一件事:根据 stage.show 和当前参数,决定场上有什么。
 * 所有数值都来自 src/math/(CLAUDE.md 禁止 2),这里不允许出现裸算式。
 */
import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import type { SceneProps } from '../../engine/types';
import { PARABOLA_DOWN } from '../../math/curves';
import { circumference } from '../../math/geometry';
import { shellSlices } from '../../math/solids';
import type { ShellSurfaceSpec } from '../../math/shellSurface';
import { Stage3D } from '../../scene/Stage3D';
import {
  Axes,
  CircleOutline,
  FunctionCurve,
  MathLabel,
  RegionFill,
  SampleRectangle,
} from '../../scene/primitives';
import { COLOR } from '../../scene/theme';
import { Shell, ShellStack } from './ShellMesh';
import { OBJ } from './chain';

const CURVE = PARABOLA_DOWN;
const INTERVAL = CURVE.domain;
const f2 = (v: number): string => v.toFixed(2);

export function ShellScene({ stage, params, visible }: SceneProps) {
  const get = (key: string, fallback: number): number => params[key] ?? fallback;

  const x0 = get('x0', 1.2);
  const dx = get('dx', 0.3);
  const bend = get('bend', 1);
  const theta = get('theta', Math.PI * 2);
  const n = Math.max(1, Math.round(get('n', 8)));
  const height = CURVE.f(x0);

  const spec: ShellSurfaceSpec = {
    rIn: x0 - dx / 2,
    rOut: x0 + dx / 2,
    height,
    thetaMax: Math.max(theta, 1e-3), // 完全为 0 时几何退化,给一个不可见的下限
    bend,
  };

  const slices = useMemo(() => shellSlices(CURVE, n, INTERVAL), [n]);

  const isFront = stage.camera === 'front';
  const flatLabelsReady = visible(OBJ.flatLabels) && bend < 0.35;
  const arc = circumference(x0);

  return (
    <Stage3D preset={stage.camera}>
      {visible(OBJ.axes) && <Axes depth={!isFront} ticks={isFront} />}
      {visible(OBJ.curve) && <FunctionCurve curve={CURVE} interval={INTERVAL} />}
      {visible(OBJ.region) && <RegionFill curve={CURVE} interval={INTERVAL} />}

      {visible(OBJ.rect) && (
        <>
          <SampleRectangle x={x0} dx={dx} height={height} />
          {isFront && (
            <>
              {/* 压到刻度数字下面一层,否则 x = 1.20 会盖住 x 轴上的 "1" */}
              <MathLabel position={[x0, -0.62, 0]} color="#fde68a">
                x = {f2(x0)}
              </MathLabel>
              <MathLabel position={[x0 + dx / 2 + 0.55, height / 2, 0]} color="#93c5fd">
                f(x) = {f2(height)}
              </MathLabel>
              <MathLabel position={[x0, height + 0.36, 0]} color="#cbd5e1">
                Δx = {f2(dx)}
              </MathLabel>
            </>
          )}
        </>
      )}

      {visible(OBJ.shell) && <Shell spec={spec} />}

      {/* Stage 4:把三个尺寸和"绕一圈的长度"标出来 */}
      {visible(OBJ.dimLabels) && (
        <>
          <Line
            points={[
              [0, 0.02, 0],
              [x0, 0.02, 0],
            ]}
            color={COLOR.radius}
            lineWidth={3}
          />
          <Line
            points={[
              [x0 + dx / 2 + 0.02, 0, 0],
              [x0 + dx / 2 + 0.02, height, 0],
            ]}
            color={COLOR.height}
            lineWidth={3}
          />
          <MathLabel position={[x0 / 2, 0.3, 0]} color="#fca5a5">
            radius = x = {f2(x0)}
          </MathLabel>
          <MathLabel position={[x0 + dx / 2 + 0.95, height / 2, 0]} color="#93c5fd">
            height = f(x) = {f2(height)}
          </MathLabel>
          <MathLabel position={[x0, height + 0.4, 0]} color="#cbd5e1">
            thickness = Δx = {f2(dx)}
          </MathLabel>
          <MathLabel position={[0, height + 0.05, x0 + 0.5]} color="#67e8f9">
            circumference = 2πx = {f2(arc)}
          </MathLabel>
        </>
      )}

      {visible(OBJ.circRing) && <CircleOutline radius={x0} y={height} />}

      {/* Stage 5 / 5b:摊平后的三条边 */}
      {flatLabelsReady && (
        <>
          <MathLabel position={[0, -0.34, 0]} color="#67e8f9">
            length = 2πx = {f2(arc)}
          </MathLabel>
          {/* 放在板内侧而不是外侧:外侧会被右边的面板裁掉 */}
          <MathLabel position={[arc / 2 - 0.55, height / 2, 0]} color="#93c5fd">
            f(x) = {f2(height)}
          </MathLabel>
          <MathLabel position={[0, height + 0.34, 0]} color="#cbd5e1">
            Δx = {f2(dx)}
          </MathLabel>
        </>
      )}

      {visible(OBJ.shells) && <ShellStack slices={slices} />}
    </Stage3D>
  );
}
