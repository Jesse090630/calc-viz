/**
 * CONCEPT — 左右极限的场景装配
 *
 * 曲线用 sampleSegments 分段画:洞的位置天然是断开的。
 * 如果这里图省事画成一条连续折线,整条链就白做了。
 */
import { Line } from '@react-three/drei';
import type { SceneProps } from '../../engine/types';
import { DISTANCES, JUMP, REMOVABLE, sampleSegments, type PartialFunction } from '../../math/limits';
import { Stage3D } from '../../scene/Stage3D';
import { Axes, MathLabel, PointMarker } from '../../scene/primitives';
import { COLOR } from '../../scene/theme';
import { OBJ } from './chain';

const A = 1;
const LIMIT_VALUE = 2;

/** 一条可能有洞的函数曲线 —— 每一段单独画 */
function BrokenCurve({ fn, color }: { fn: PartialFunction; color: string }) {
  return (
    <group>
      {sampleSegments(fn).map((seg, i) => (
        <Line
          key={i}
          points={seg.map(([x, y]) => [x, y, 0] as [number, number, number])}
          color={color}
          lineWidth={2.5}
        />
      ))}
    </group>
  );
}

/** 逼近探针:曲线上的动点 + 引到两轴的虚线 + 读数 */
function Probe({
  fn,
  x,
  color,
  label,
}: {
  fn: PartialFunction;
  x: number;
  color: string;
  label: string;
}) {
  const y = fn.at(x);
  if (y === null) return null;
  return (
    <group>
      <Line
        points={[
          [x, 0, 0],
          [x, y, 0],
        ]}
        color={color}
        lineWidth={1.5}
        dashed
        dashSize={0.07}
        gapSize={0.05}
      />
      <Line
        points={[
          [x, y, 0],
          [0, y, 0],
        ]}
        color={color}
        lineWidth={1.5}
        dashed
        dashSize={0.07}
        gapSize={0.05}
      />
      <PointMarker position={[x, y, 0.02]} color={color} />
      <MathLabel position={[x, -0.34, 0]} color={color}>
        {label} x = {x.toFixed(3)}
      </MathLabel>
      <MathLabel position={[-0.52, y, 0]} color={color}>
        {y.toFixed(3)}
      </MathLabel>
    </group>
  );
}

export function LimitsScene({ stage, params, visible }: SceneProps) {
  const di = Math.round(params.di ?? 0);
  const d = DISTANCES[Math.min(DISTANCES.length - 1, Math.max(0, di))] ?? DISTANCES[0]!;
  const fn: PartialFunction = visible(OBJ.curveJ) ? JUMP : REMOVABLE;

  return (
    <Stage3D preset={stage.camera}>
      {visible(OBJ.axes) && <Axes xMax={2.7} yMax={4.4} ticks />}

      {visible(OBJ.curveG) && <BrokenCurve fn={REMOVABLE} color={COLOR.curve} />}
      {visible(OBJ.curveJ) && <BrokenCurve fn={JUMP} color={COLOR.curve} />}

      {/* 洞:空心圈画在极限值的位置(2),但函数在那里没有值 */}
      {visible(OBJ.hole) && (
        <>
          <PointMarker position={[A, LIMIT_VALUE, 0.03]} color={COLOR.curve} hollow />
          {visible(OBJ.curveJ) && (
            <PointMarker position={[A, 3.5, 0.03]} color={COLOR.curve} hollow />
          )}
        </>
      )}

      {visible(OBJ.leftProbe) && (
        <Probe fn={fn} x={A - d} color={COLOR.radius} label="←" />
      )}
      {visible(OBJ.rightProbe) && (
        <Probe fn={fn} x={A + d} color={COLOR.introduce} label="→" />
      )}

      {/* 第 5 步:把极限值本身标出来,和那个洞并排 */}
      {visible(OBJ.limitMark) && (
        <>
          <Line
            points={[
              [0, LIMIT_VALUE, 0],
              [A, LIMIT_VALUE, 0],
            ]}
            color={COLOR.result}
            lineWidth={2}
            dashed
            dashSize={0.09}
            gapSize={0.06}
          />
          <MathLabel position={[A + 0.62, LIMIT_VALUE, 0]} color="#86efac">
            limit = 2
          </MathLabel>
          <MathLabel position={[A + 0.05, LIMIT_VALUE - 0.55, 0]} color="#94a3b8">
            no value here
          </MathLabel>
        </>
      )}
    </Stage3D>
  );
}
