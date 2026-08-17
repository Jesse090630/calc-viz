/** CONCEPT — Riemann Sum 场景装配；所有数值与矩形数据来自 math core。 */
import { Html } from '@react-three/drei';
import type { SceneProps } from '../../engine/types';
import { PARABOLA_DOWN } from '../../math/curves';
import { definiteIntegralExact } from '../../math/riemann';
import type { CurveSpec, Interval } from '../../math/types';
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

export function RiemannScene({
  stage,
  params,
  visible,
  curve = CURVE,
  interval = INTERVAL,
  exact = EXACT,
  sourceInterval = INTERVAL,
  custom = false,
  clamped = false,
  displayTop = 4,
}: SceneProps & {
  curve?: CurveSpec;
  interval?: Interval;
  exact?: number;
  sourceInterval?: Interval;
  custom?: boolean;
  clamped?: boolean;
  displayTop?: number;
}) {
  const n = Math.max(1, Math.round(params.n ?? 4));
  const morph = Math.max(0, Math.min(1, params.morph ?? 0));
  const finalStage = stage.id === 'integral';
  const barsOpacity = finalStage ? 0.58 * (1 - morph) : 0.58;
  const regionOpacity = finalStage ? 0.28 + 0.4 * morph : 0.28;

  return (
    <Stage3D preset={stage.camera}>
      {visible(OBJ.axes) && (
        <>
          <Axes depth={false} ticks={!custom} />
          {custom && (
            <>
              <MathLabel position={[0, -0.35, 0]} color={COLOR.thickness}>{sourceInterval[0]}</MathLabel>
              <MathLabel position={[2, -0.35, 0]} color={COLOR.thickness}>{sourceInterval[1]}</MathLabel>
              <MathLabel position={[-0.18, 4, 0]} color={COLOR.height}>{displayTop}</MathLabel>
              {clamped && (
                <MathLabel position={[1, 4.35, 0]} color={COLOR.introduce}>
                  view clipped above {displayTop}
                </MathLabel>
              )}
            </>
          )}
        </>
      )}
      {visible(OBJ.region) && (
        <RegionFill
          curve={curve}
          interval={interval}
          color={finalStage ? COLOR.result : COLOR.region}
          opacity={regionOpacity}
        />
      )}
      {visible(OBJ.leftBars) && (
        <RiemannBars
          curve={curve}
          interval={interval}
          n={n}
          rule={custom ? 'mid' : 'left'}
          color={COLOR.hero}
          opacity={barsOpacity}
          depthOffset={0.02}
        />
      )}
      {visible(OBJ.rightBars) && (
        <RiemannBars
          curve={curve}
          interval={interval}
          n={n}
          rule="right"
          color={COLOR.introduce}
          opacity={barsOpacity}
          depthOffset={0.05}
        />
      )}
      {visible(OBJ.curve) && <FunctionCurve curve={curve} interval={interval} />}

      {visible(OBJ.gap) && (
        <>
          {/* 标签必须压在它所标注的色块上。原来三个并排飘在 x=2.55 的空地上,
              读者得自己在标签和图形之间连线 —— 那正是"标签没指向它标注的东西"。
              夹缝的数值已经在右侧公式面板里,这里不再重复一个浮动 chip。 */}
          {/* 琥珀色带 = 左端点和比右端点和多出来的部分,在第 i 段上是
              f(xᵢ) 与 f(xᵢ₊₁) 之间那条。f 递减且凹,所以【最后一段】那条永远最宽,
              把标签锚在它中间。下限 0.45 是为了 n 很大时标签不至于压到 x 轴上。 */}
          <MathLabel
            position={[
              INTERVAL[1] - (INTERVAL[1] - INTERVAL[0]) / n / 2,
              Math.max(0.45, CURVE.f(INTERVAL[1] - (INTERVAL[1] - INTERVAL[0]) / n) / 2),
              0,
            ]}
            color={COLOR.hero}
          >
            upper Lₙ
          </MathLabel>
          <MathLabel position={[0.62, 1.15, 0]} color={COLOR.introduce}>
            lower Rₙ
          </MathLabel>
        </>
      )}

      {visible(OBJ.transform) && (
        <>
          <SumToIntegral progress={morph} />
          <MathLabel position={[1, 0.7, 0.18]} color={COLOR.result}>
            A = {exact.toFixed(6)}
          </MathLabel>
        </>
      )}
    </Stage3D>
  );
}
