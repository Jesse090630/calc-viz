/** CONCEPT — Riemann Sum 场景装配；所有数值与矩形数据来自 math core。 */
import { Html } from '@react-three/drei';
import type { SceneProps } from '../../engine/types';
import { PARABOLA_DOWN } from '../../math/curves';
import { definiteIntegralExact, leftRightGap } from '../../math/riemann';
import { Axes, FunctionCurve, MathLabel, RegionFill } from '../../scene/primitives';
import { RiemannBars } from '../../scene/RiemannBars';
import { Stage3D } from '../../scene/Stage3D';
import { COLOR } from '../../scene/theme';
import { OBJ } from './chain';

const CURVE = PARABOLA_DOWN;
const INTERVAL = CURVE.domain;
const EXACT = definiteIntegralExact(CURVE, INTERVAL);

function SumToIntegral({ progress }: { progress: number }) {
  return (
    <Html position={[1, 2.15, 0.16]} center zIndexRange={[30, 0]}>
      <div className="relative h-24 w-24 select-none text-center font-serif text-7xl text-green-400">
        <span
          className="absolute inset-0 transition-none"
          style={{ opacity: 1 - progress, transform: `scale(${1 - progress * 0.2})` }}
        >
          Σ
        </span>
        <span
          className="absolute inset-0 transition-none"
          style={{ opacity: progress, transform: `scale(${0.8 + progress * 0.2})` }}
        >
          ∫
        </span>
      </div>
    </Html>
  );
}

export function RiemannScene({ stage, params, visible }: SceneProps) {
  const n = Math.max(1, Math.round(params.n ?? 4));
  const morph = Math.max(0, Math.min(1, params.morph ?? 0));
  const finalStage = stage.id === 'integral';
  const barsOpacity = finalStage ? 0.58 * (1 - morph) : 0.58;
  const regionOpacity = finalStage ? 0.28 + 0.4 * morph : 0.28;

  return (
    <Stage3D preset={stage.camera}>
      {visible(OBJ.axes) && <Axes depth={false} ticks />}
      {visible(OBJ.region) && (
        <RegionFill
          curve={CURVE}
          interval={INTERVAL}
          color={finalStage ? COLOR.result : COLOR.region}
          opacity={regionOpacity}
        />
      )}
      {visible(OBJ.leftBars) && (
        <RiemannBars
          curve={CURVE}
          interval={INTERVAL}
          n={n}
          rule="left"
          color={COLOR.hero}
          opacity={barsOpacity}
          depthOffset={0.02}
        />
      )}
      {visible(OBJ.rightBars) && (
        <RiemannBars
          curve={CURVE}
          interval={INTERVAL}
          n={n}
          rule="right"
          color={COLOR.introduce}
          opacity={barsOpacity}
          depthOffset={0.05}
        />
      )}
      {visible(OBJ.curve) && <FunctionCurve curve={CURVE} interval={INTERVAL} />}

      {visible(OBJ.gap) && (
        <>
          <MathLabel position={[2.55, 3.25, 0]} color={COLOR.hero}>
            upper Lₙ
          </MathLabel>
          <MathLabel position={[2.55, 2.65, 0]} color={COLOR.introduce}>
            lower Rₙ
          </MathLabel>
          <MathLabel position={[2.55, 2.05, 0]} color={COLOR.result}>
            gap = {leftRightGap(CURVE, n, INTERVAL).toFixed(6)}
          </MathLabel>
        </>
      )}

      {visible(OBJ.transform) && (
        <>
          <SumToIntegral progress={morph} />
          <MathLabel position={[1, 0.7, 0.18]} color={COLOR.result}>
            A = {EXACT.toFixed(6)}
          </MathLabel>
        </>
      )}
    </Stage3D>
  );
}
