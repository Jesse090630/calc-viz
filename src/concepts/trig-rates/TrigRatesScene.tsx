import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { SceneProps } from '../../engine/types';
import { circlePoint } from '../../math/trig';
import { chordVelocity, circleVelocity } from '../../math/trigRates';
import { Stage3D } from '../../scene/Stage3D';
import { CircleOutline, MathLabel, PointMarker } from '../../scene/primitives';
import { COLOR } from '../../scene/theme';
import { OBJ } from './chain';

const CENTER = [0.9, 2, 0] as const;
const RADIUS = 1.35;
const THETA = Math.PI / 3;
const VELOCITY_SCALE = 1.12;
const f6 = (value: number): string => (Math.abs(value) < 0.5e-6 ? 0 : value).toFixed(6);

function worldPoint(theta: number): [number, number, number] {
  const [x, y] = circlePoint(theta);
  return [CENTER[0] + RADIUS * x, CENTER[1] + RADIUS * y, 0.04];
}

function Arrow({ from, vector, color }: { from: [number, number, number]; vector: readonly [number, number]; color: string }) {
  const direction = new THREE.Vector3(vector[0], vector[1], 0).normalize();
  const length = Math.hypot(vector[0], vector[1]) * VELOCITY_SCALE;
  return <arrowHelper args={[direction, new THREE.Vector3(...from), length, color, 0.17, 0.11]} />;
}

export function TrigRatesScene({ stage, params, visible }: SceneProps) {
  const delta = params.deltaTheta ?? 0.8;
  const point = worldPoint(THETA);
  const nearby = worldPoint(THETA + delta);
  const chord = chordVelocity(THETA, delta);
  const tangent = circleVelocity(THETA);
  const tangentTip: [number, number, number] = [
    point[0] + tangent[0] * VELOCITY_SCALE,
    point[1] + tangent[1] * VELOCITY_SCALE,
    0.07,
  ];
  const corner: [number, number, number] = [tangentTip[0], point[1], 0.06];

  return (
    <Stage3D preset={stage.camera}>
      {visible(OBJ.axes) && (
        <>
          <Line points={[[CENTER[0] - 1.72, CENTER[1], 0], [CENTER[0] + 1.72, CENTER[1], 0]]} color={COLOR.axis} lineWidth={1.5} />
          <Line points={[[CENTER[0], CENTER[1] - 1.72, 0], [CENTER[0], CENTER[1] + 1.72, 0]]} color={COLOR.axis} lineWidth={1.5} />
          <MathLabel position={[CENTER[0] - 0.18, CENTER[1] - 0.2, 0]} color="#94a3b8">O</MathLabel>
        </>
      )}
      {visible(OBJ.circle) && <group position={CENTER}><CircleOutline radius={RADIUS} y={0} plane="front" color={COLOR.introduce} /></group>}
      {visible(OBJ.radius) && (
        <>
          <Line points={[CENTER, point]} color={COLOR.radius} lineWidth={3} />
          <MathLabel position={[(CENTER[0] + point[0]) / 2, (CENTER[1] + point[1]) / 2 - 0.17, 0]} color="#fca5a5">(cos θ, sin θ)</MathLabel>
        </>
      )}
      {visible(OBJ.chord) && <Line points={[point, nearby]} color={COLOR.thickness} lineWidth={3} />}
      {visible(OBJ.chordVelocity) && <Arrow from={point} vector={chord} color={COLOR.thickness} />}
      {visible(OBJ.tangentVelocity) && <Arrow from={point} vector={tangent} color={COLOR.hero} />}
      {visible(OBJ.xComponent) && (
        <>
          <Line points={[point, corner]} color={COLOR.radius} lineWidth={4} />
          <MathLabel position={[(point[0] + corner[0]) / 2, point[1] - 0.2, 0]} color="#fca5a5">−sin θ = {f6(tangent[0])}</MathLabel>
        </>
      )}
      {visible(OBJ.yComponent) && (
        <>
          <Line points={[corner, tangentTip]} color={COLOR.height} lineWidth={4} />
          <MathLabel position={[corner[0] - 0.4, (corner[1] + tangentTip[1]) / 2, 0]} color="#93c5fd">cos θ = {f6(tangent[1])}</MathLabel>
        </>
      )}
      {visible(OBJ.reverse) && <MathLabel position={[CENTER[0], CENTER[1] - 1.63, 0]} color={COLOR.result}>Differentiate → · ← Integrate</MathLabel>}
      {visible(OBJ.nearbyPoint) && (
        <>
          <PointMarker position={nearby} color={COLOR.introduce} radius={0.065} />
          <MathLabel position={[nearby[0] - 0.28, nearby[1] + 0.2, 0]} color="#67e8f9">Q</MathLabel>
        </>
      )}
      {visible(OBJ.point) && (
        <>
          <PointMarker position={point} color={COLOR.hero} radius={0.075} />
          <MathLabel position={[point[0] + 0.28, point[1] - 0.2, 0]} color="#fbbf24">P</MathLabel>
        </>
      )}
    </Stage3D>
  );
}
