import { circlePoint } from './trig';

export type Vector2 = readonly [number, number];

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite`);
  }
}

/** Average angular velocity along the unit-circle chord from θ to θ + Δθ. */
export function chordVelocity(theta: number, deltaTheta: number): Vector2 {
  assertFinite(theta, 'theta');
  assertFinite(deltaTheta, 'deltaTheta');
  if (deltaTheta === 0) {
    throw new Error('deltaTheta must be non-zero');
  }

  const [x0, y0] = circlePoint(theta);
  const [x1, y1] = circlePoint(theta + deltaTheta);
  return [(x1 - x0) / deltaTheta, (y1 - y0) / deltaTheta];
}

/** Instantaneous counter-clockwise velocity on the unit circle. */
export function circleVelocity(theta: number): Vector2 {
  assertFinite(theta, 'theta');
  const [x, y] = circlePoint(theta);
  return [-y, x];
}

export function trigRates(theta: number): Readonly<{ dCos: number; dSin: number }> {
  const [dCos, dSin] = circleVelocity(theta);
  return { dCos, dSin };
}
