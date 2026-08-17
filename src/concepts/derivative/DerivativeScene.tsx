/**
 * CONCEPT — Secant → Tangent 的场景装配
 *
 * 所有数值都来自 src/math/derivative.ts;这里只决定场上有什么、画在哪。
 */
import { Line } from '@react-three/drei';
import type { SceneProps } from '../../engine/types';
import { PARABOLA_UP } from '../../math/curves';
import { clampH, lineY, secant } from '../../math/derivative';
import { Stage3D } from '../../scene/Stage3D';
import { Axes, FunctionCurve, MathLabel, PointMarker, RiseRun } from '../../scene/primitives';
import { COLOR } from '../../scene/theme';
import { OBJ } from './chain';

const CURVE = PARABOLA_UP;
const A = 1;
/** 直线画到这个 x 范围,超出画面即可,让它读起来是"线"而不是"线段" */
const LINE_SPAN: readonly [number, number] = [-0.35, 2.35];

/** 一条过 (x0,y0)、斜率 m 的直线 */
function StraightLine({
  x0,
  y0,
  m,
  color,
  width = 2.5,
}: {
  x0: number;
  y0: number;
  m: number;
  color: string;
  width?: number;
}) {
  const [lo, hi] = LINE_SPAN;
  return (
    <Line
      points={[
        [lo, lineY(x0, y0, m, lo), 0],
        [hi, lineY(x0, y0, m, hi), 0],
      ]}
      color={color}
      lineWidth={width}
    />
  );
}

export function DerivativeScene({ stage, params, visible }: SceneProps) {
  const h = clampH(params.h ?? 1);
  const x0 = params.x0 ?? A;
  const s = secant(CURVE, A, h);
  const tangentSlope = CURVE.df(A);

  return (
    <Stage3D preset={stage.camera}>
      {visible(OBJ.axes) && <Axes xMax={2.4} yMax={4.6} ticks />}
      {visible(OBJ.curve) && <FunctionCurve curve={CURVE} interval={CURVE.domain} />}

      {/* 割线要画在点的下面,否则点会被线盖住 */}
      {visible(OBJ.secantLine) && (
        <StraightLine x0={s.p[0]} y0={s.p[1]} m={s.slope} color={COLOR.hero} />
      )}

      {visible(OBJ.triangle) && (
        <>
          <RiseRun from={s.p} to={s.q} />
          <MathLabel position={[(s.p[0] + s.q[0]) / 2, s.p[1] - 0.34, 0]} color="#cbd5e1">
            Δx = {h.toFixed(2)}
          </MathLabel>
          <MathLabel position={[s.q[0] + 0.42, (s.p[1] + s.q[1]) / 2, 0]} color="#93c5fd">
            Δy = {s.dy.toFixed(2)}
          </MathLabel>
        </>
      )}

      {visible(OBJ.tangentLine) && (
        <>
          <StraightLine x0={A} y0={CURVE.f(A)} m={tangentSlope} color={COLOR.result} width={3} />
          <MathLabel position={[1.85, CURVE.f(A) + tangentSlope * 0.85 + 0.3, 0]} color="#86efac">
            slope = {tangentSlope.toFixed(2)}
          </MathLabel>
        </>
      )}

      {/* 第 8 步:切点沿曲线滑动 */}
      {visible(OBJ.slidingTangent) && (
        <>
          <StraightLine x0={x0} y0={CURVE.f(x0)} m={CURVE.df(x0)} color={COLOR.result} width={3} />
          <PointMarker position={[x0, CURVE.f(x0), 0.02]} color={COLOR.result} />
          <MathLabel position={[x0, CURVE.f(x0) + 0.45, 0]} color="#86efac">
            f′({x0.toFixed(2)}) = {CURVE.df(x0).toFixed(2)}
          </MathLabel>
        </>
      )}

      {visible(OBJ.pointP) && (
        <>
          <PointMarker position={[A, CURVE.f(A), 0.02]} color={COLOR.radius} />
          <MathLabel position={[A - 0.34, CURVE.f(A) - 0.05, 0]} color="#fca5a5">
            P
          </MathLabel>
        </>
      )}

      {visible(OBJ.pointQ) && (
        <>
          <PointMarker position={[s.q[0], s.q[1], 0.02]} color={COLOR.introduce} />
          <MathLabel position={[s.q[0] + 0.3, s.q[1] + 0.22, 0]} color="#67e8f9">
            Q
          </MathLabel>
        </>
      )}
    </Stage3D>
  );
}
