/**
 * CONCEPT — Unit Circle → sin / cos 的场景装配
 *
 * 数学坐标仍以 O=(0,0) 为原点;整组对象只为取景向左平移。
 * 圆点与波点的 y 坐标共用 circlePoint(theta)[1],水平同步不是视觉近似。
 */
import { Html, Line } from '@react-three/drei';
import type { SceneProps } from '../../engine/types';
import { arcLength, circlePoint } from '../../math/trig';
import { Stage3D } from '../../scene/Stage3D';
import { TracedWave } from '../../scene/TracedWave';
import { CircleOutline, MathLabel, PointMarker } from '../../scene/primitives';
import { COLOR } from '../../scene/theme';
import { OBJ } from './chain';

const TAU = 2 * Math.PI;
const CENTER = [-3.15, 1.3, 0] as const;
// 时间轴从单位圆右切点开始:既保留完整 2π 数学宽度,又不浪费两者之间的空地。
const WAVE_START = CENTER[0] + 1;
const WAVE_END = WAVE_START + TAU;
const DOMAIN = [0, TAU] as const;

const sineValue = (theta: number): number => circlePoint(theta)[1];
const cosineValue = (theta: number): number => circlePoint(theta)[0];
const f6 = (value: number): string => (Math.abs(value) < 0.5e-6 ? 0 : value).toFixed(6);

function worldCirclePoint(theta: number): [number, number, number] {
  const [x, y] = circlePoint(theta);
  return [CENTER[0] + x, CENTER[1] + y, 0.04];
}

function Arc({ theta }: { theta: number }) {
  if (theta <= 0) return null;
  const count = Math.max(8, Math.ceil((theta / TAU) * 160));
  const points = Array.from({ length: count + 1 }, (_, i) => {
    const [x, y] = circlePoint((theta * i) / count);
    return [CENTER[0] + x, CENTER[1] + y, 0.025] as [number, number, number];
  });
  const [mx, my] = circlePoint(theta / 2);
  return (
    <>
      <Line points={points} color={COLOR.introduce} lineWidth={5} />
      <MathLabel
        position={[CENTER[0] + mx * 1.25, CENTER[1] + my * 1.25, 0]}
        color="#67e8f9"
      >
        arc = {arcLength(theta, 1).toFixed(6)}
      </MathLabel>
    </>
  );
}

const tickStyle: React.CSSProperties = {
  color: '#8b9ac4',
  fontSize: 11,
  fontWeight: 600,
  pointerEvents: 'none',
  userSelect: 'none',
  whiteSpace: 'nowrap',
};

function Timeline() {
  const ticks = [
    [0, '0'],
    [Math.PI / 2, 'π/2'],
    [Math.PI, 'π'],
    [(3 * Math.PI) / 2, '3π/2'],
    [TAU, '2π'],
  ] as const;
  return (
    <group>
      <Line
        points={[
          [WAVE_START, CENTER[1], 0],
          [WAVE_END + 0.25, CENTER[1], 0],
        ]}
        color={COLOR.axis}
        lineWidth={1.8}
      />
      {ticks.map(([theta, label]) => (
        <group key={label}>
          <Line
            points={[
              [WAVE_START + theta, CENTER[1] - 0.06, 0],
              [WAVE_START + theta, CENTER[1] + 0.06, 0],
            ]}
            color={COLOR.axis}
            lineWidth={1.5}
          />
          <Html position={[WAVE_START + theta, CENTER[1] - 0.22, 0]} center>
            <span style={tickStyle}>{label}</span>
          </Html>
        </group>
      ))}
      <MathLabel position={[WAVE_END + 0.38, CENTER[1], 0]} color="#94a3b8">
        θ
      </MathLabel>
    </group>
  );
}

export function UnitCircleScene({ stage, params, visible }: SceneProps) {
  const theta = visible(OBJ.secondLap) ? (params.lapTheta ?? 0) : (params.theta ?? 0);
  const [circleX, circleY] = circlePoint(theta);
  const point = worldCirclePoint(theta);
  const foot: [number, number, number] = [CENTER[0] + circleX, CENTER[1], 0.03];
  const targetX = WAVE_START + theta;
  const wavePoint: [number, number, number] = [targetX, CENTER[1] + circleY, 0.05];
  const cosinePoint: [number, number, number] = [targetX, CENTER[1] + circleX, 0.05];
  const fullCarry = visible(OBJ.sineWave) || visible(OBJ.cosineWave) || visible(OBJ.secondLap);
  const carry = fullCarry ? 1 : Math.max(0, Math.min(1, params.carry ?? 0));
  const carriedX = point[0] + (targetX - point[0]) * carry;
  const carriedPoint: [number, number, number] = [carriedX, point[1], 0.05];
  const drop = Math.max(0, Math.min(1, params.drop ?? 0));
  const droppedY = point[1] + (CENTER[1] - point[1]) * drop;
  const sineThrough = visible(OBJ.secondLap) ? TAU : theta;

  return (
    <Stage3D preset={stage.camera}>
      {/* 整组只做画面平移;O=(0,0) 标签钉死数学坐标。 */}
      {visible(OBJ.circle) && (
        <group position={CENTER}>
          <CircleOutline radius={1} y={0} plane="front" color={COLOR.introduce} />
        </group>
      )}

      {visible(OBJ.circleAxes) && (
        <>
          <Line
            points={[
              [CENTER[0] - 1.32, CENTER[1], 0],
              [CENTER[0] + 1.32, CENTER[1], 0],
            ]}
            color={COLOR.axis}
            lineWidth={1.4}
          />
          <Line
            points={[
              [CENTER[0], CENTER[1] - 1.32, 0],
              [CENTER[0], CENTER[1] + 1.32, 0],
            ]}
            color={COLOR.axis}
            lineWidth={1.4}
          />
          <MathLabel position={[CENTER[0] - 0.2, CENTER[1] - 0.22, 0]} color="#94a3b8">
            O = (0, 0)
          </MathLabel>
        </>
      )}

      {visible(OBJ.radius) && (
        <>
          <Line points={[CENTER, point]} color={COLOR.radius} lineWidth={3} />
          <MathLabel
            position={[(CENTER[0] + point[0]) / 2, (CENTER[1] + point[1]) / 2 - 0.18, 0]}
            color="#fca5a5"
          >
            r = 1
          </MathLabel>
        </>
      )}

      {visible(OBJ.arc) && <Arc theta={theta} />}

      {visible(OBJ.projection) && (
        <>
          <Line
            points={[point, [foot[0], droppedY, foot[2]]]}
            color={COLOR.height}
            lineWidth={3}
            dashed
            dashSize={0.06}
            gapSize={0.04}
          />
          {drop > 0.95 && (
            <>
              <Line points={[CENTER, foot]} color={COLOR.radius} lineWidth={3} />
              <MathLabel
                position={[foot[0] + 0.38, (point[1] + CENTER[1]) / 2, 0]}
                color="#93c5fd"
              >
                sin θ = {f6(circleY)}
              </MathLabel>
              {visible(OBJ.cosineWave) && (
                <MathLabel
                  position={[(CENTER[0] + foot[0]) / 2, CENTER[1] - 0.2, 0]}
                  color="#fca5a5"
                >
                  cos θ
                </MathLabel>
              )}
            </>
          )}
        </>
      )}

      {visible(OBJ.timeline) && <Timeline />}

      {visible(OBJ.sineWave) && (
        <TracedWave
          origin={[WAVE_START, CENTER[1], 0.02]}
          domain={DOMAIN}
          through={sineThrough}
          valueAt={sineValue}
          color={COLOR.height}
          lineWidth={3.5}
          opacity={visible(OBJ.secondLap) ? 0.42 : 1}
        />
      )}

      {visible(OBJ.cosineWave) && (
        <TracedWave
          origin={[WAVE_START, CENTER[1], 0.03]}
          domain={DOMAIN}
          through={theta}
          valueAt={cosineValue}
          color={COLOR.radius}
          lineWidth={3}
        />
      )}

      {visible(OBJ.secondLap) && (
        <TracedWave
          origin={[WAVE_START, CENTER[1], 0.04]}
          domain={DOMAIN}
          through={theta}
          valueAt={sineValue}
          color={COLOR.hero}
          lineWidth={3.5}
        />
      )}

      {visible(OBJ.carry) && (
        <>
          <Line
            points={[point, carriedPoint]}
            color={COLOR.introduce}
            lineWidth={2}
            dashed
            dashSize={0.09}
            gapSize={0.06}
          />
          <PointMarker
            position={fullCarry ? wavePoint : carriedPoint}
            color={visible(OBJ.secondLap) ? COLOR.hero : COLOR.height}
            radius={0.065}
          />
          {visible(OBJ.cosineWave) && (
            <PointMarker position={cosinePoint} color={COLOR.radius} radius={0.06} />
          )}
        </>
      )}

      {visible(OBJ.point) && (
        <>
          <PointMarker position={point} color={COLOR.hero} radius={0.075} />
          <MathLabel position={[point[0] + 0.22, point[1] + 0.22, 0]} color="#fbbf24">
            P
          </MathLabel>
        </>
      )}
    </Stage3D>
  );
}
