/**
 * CONCEPT — 「为什么 ∫dx/x 是 ln」的场景装配
 *
 * ⚠️ 显示坐标是**纯缩放,没有平移**:`X = 0.85·x`,`Y = 3.2/x`。
 * 「横拉 b 倍」必须是关于原点的伸缩;只要加上平移,`x → bx` 在显示坐标里
 * 就不再是伸缩,第 5 步那个支点当场塌掉。
 * 面积被统一乘上常数 0.85×3.2,所以「两块面积相等」这件事原样保留。
 *
 * 所有数值来自 `src/math/logIntegral.ts`,这里不出现裸算式(除了坐标映射本身)。
 */
import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { SceneProps } from '../../engine/types';
import {
  areaUnderReciprocal,
  powerAntiderivativeAt,
  stretchSquash,
} from '../../math/logIntegral';
import { Stage3D } from '../../scene/Stage3D';
import { Axes, MathLabel, PointMarker } from '../../scene/primitives';
import { COLOR } from '../../scene/theme';
import { DISPLAY, LIMIT_VALUE, E_BASE, OBJ } from './chain';

/**
 * 曲线的绘制起点。
 * ⚠️ 不能取太小:`y = 3.2/x` 在 x=0.62 处已经到 5.16,冲出 front 相机的可视顶端(约 4.45),
 * 画面上会看到一条被硬切掉的线。0.78 → 4.10,刚好留在框内。
 */
const X_FROM = 0.78;
const X_TO = 4.35;
const SAMPLES = 220;
const N_STEPS = [-0.5, -0.9, -0.99, -0.999, -0.9999, -1] as const;

/** y = k/x 在显示坐标里的折线 */
function reciprocalPoints(from = X_FROM, to = X_TO): [number, number, number][] {
  return Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const x = from + ((to - from) * i) / SAMPLES;
    return [DISPLAY.toX(x), DISPLAY.toY(x), 0] as [number, number, number];
  });
}

/** [a,b] 区间下方的填充,y 由 shape 给出(默认 1/x) */
function AreaBlock({
  a,
  b,
  color,
  opacity = 0.42,
  shape = (x: number) => DISPLAY.toY(x),
  z = 0,
}: {
  a: number;
  b: number;
  color: string;
  opacity?: number;
  shape?: (x: number) => number;
  z?: number;
}) {
  const geometry = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(DISPLAY.toX(a), 0);
    s.lineTo(DISPLAY.toX(b), 0);
    const steps = 90;
    for (let i = steps; i >= 0; i--) {
      const x = a + ((b - a) * i) / steps;
      s.lineTo(DISPLAY.toX(x), shape(x));
    }
    return new THREE.ShapeGeometry(s);
  }, [a, b, shape]);

  return (
    <mesh geometry={geometry} position={[0, 0, z]}>
      <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

export function LogIntegralScene({ stage, params, visible }: SceneProps) {
  const ni = Math.round(params.ni ?? 0);
  const n = N_STEPS[Math.min(N_STEPS.length - 1, Math.max(0, ni))] ?? -0.5;
  const b = params.b ?? 1;
  const t = params.t ?? 2;

  // 第 1–3 步:y = xⁿ。为了和 1/x 共用同一个取景,同样走 y = k·x^n / (缩放)
  const powerPoints = useMemo(
    () =>
      Array.from({ length: SAMPLES + 1 }, (_, i) => {
        const x = X_FROM + ((X_TO - X_FROM) * i) / SAMPLES;
        return [DISPLAY.toX(x), DISPLAY.yScale * Math.pow(x, n), 0] as [number, number, number];
      }),
    [n],
  );

  const powerValue = powerAntiderivativeAt(n, 2);
  const areaAtT = areaUnderReciprocal(t);

  // 第 5 步:把 [1,2] 的块按 b 变换后的"鬼影"
  const ghostShape = useMemo(
    () => (x: number) => {
      // 变换后横坐标 bx 对应的真实 x 是 x/b;高度按 1/b 压缩
      const [, y] = stretchSquash([x / b, DISPLAY.toY(x / b)], b);
      return y;
    },
    [b],
  );

  return (
    <Stage3D preset={stage.camera}>
      {visible(OBJ.axes) && (
        <>
          <Axes xMax={4.0} yMax={4.4} ticks={false} />
          {/* 刻度按【真值】标注 —— 显示坐标做过缩放,不标就会误导 */}
          {[1, 2, 3, 4].map((x) => (
            <MathLabel key={x} position={[DISPLAY.toX(x), -0.32, 0]} color={COLOR.thickness}>
              {String(x)}
            </MathLabel>
          ))}
        </>
      )}

      {visible(OBJ.powerCurve) && <Line points={powerPoints} color={COLOR.curve} lineWidth={2.5} />}
      {visible(OBJ.powerRegion) && (
        <AreaBlock
          a={1}
          b={2}
          color={n === -1 ? COLOR.radius : COLOR.region}
          shape={(x) => DISPLAY.yScale * Math.pow(x, n)}
        />
      )}

      {visible(OBJ.reciprocal) && (
        <>
          <Line points={reciprocalPoints()} color={COLOR.curve} lineWidth={2.5} />
          <MathLabel position={[DISPLAY.toX(3.5), DISPLAY.toY(3.5) + 0.42, 0]} color="#7dd3fc">
            y = 1/x
          </MathLabel>
        </>
      )}

      {/* [1,2] 那一块 —— 整条链的主角 */}
      {visible(OBJ.regionFirst) && (
        <>
          <AreaBlock a={1} b={visible(OBJ.eMark) || stage.id === 'times-becomes-plus' ? Math.min(t, X_TO) : 2} color={COLOR.hero} />
          {!visible(OBJ.eMark) && stage.id !== 'times-becomes-plus' && (
            <MathLabel position={[DISPLAY.toX(1.42), DISPLAY.toY(1.42) / 2, 0]} color="#fcd34d">
              {LIMIT_VALUE.toFixed(6)}
            </MathLabel>
          )}
        </>
      )}

      {/* [2,4] 那一块 —— 更宽更矮,面积一样 */}
      {visible(OBJ.regionSecond) && (
        <>
          <AreaBlock a={2} b={4} color={COLOR.introduce} opacity={0.34} />
          <MathLabel position={[DISPLAY.toX(2.85), DISPLAY.toY(2.85) / 2 + 0.12, 0]} color="#67e8f9">
            {(areaUnderReciprocal(4)! - areaUnderReciprocal(2)!).toFixed(6)}
          </MathLabel>
        </>
      )}

      {/* 被拉伸中的鬼影:b=1 时与原块重合,b=2 时正好盖住 [2,4] */}
      {visible(OBJ.stretchGhost) && b > 1.001 && (
        <>
          <AreaBlock a={1 * b} b={2 * b} color={COLOR.result} opacity={0.3} shape={ghostShape} z={0.01} />
          <MathLabel position={[DISPLAY.toX(1.5 * b), DISPLAY.yScale / (1.5 * b) + 0.5, 0]} color="#86efac">
            ×{b.toFixed(2)} wide, ÷{b.toFixed(2)} tall
          </MathLabel>
        </>
      )}

      {visible(OBJ.eMark) && (
        <>
          <Line
            points={[
              [DISPLAY.toX(E_BASE), 0, 0],
              [DISPLAY.toX(E_BASE), DISPLAY.toY(E_BASE), 0],
            ]}
            color={COLOR.result}
            lineWidth={3}
          />
          <PointMarker position={[DISPLAY.toX(E_BASE), DISPLAY.toY(E_BASE), 0.02]} color={COLOR.result} />
          <MathLabel position={[DISPLAY.toX(E_BASE), -0.66, 0]} color="#86efac">
            e = {E_BASE.toFixed(6)}
          </MathLabel>
        </>
      )}

      {visible(OBJ.areaReadout) && (
        <MathLabel position={[DISPLAY.toX(3.2), 3.7, 0]} color="#fcd34d">
          {stage.id === 'watch-it-break'
            ? `n = ${n} → ${powerValue === null ? 'undefined (0/0)' : powerValue.toFixed(6)}`
            : `A(${t.toFixed(3)}) = ${areaAtT === null ? 'undefined' : areaAtT.toFixed(6)}`}
        </MathLabel>
      )}
    </Stage3D>
  );
}
