/**
 * CONCEPT — Unit Circle → sin / cos
 *
 * 诊断:学生把 sin 只记成直角三角形里的“对边 / 斜边”,于是看不见为什么
 * 绕圆一圈会产生一条波。
 *
 * 看不见的量:圆上点 P 与右侧波形点之间逐帧不丢失的同步。
 * 主角:移动点 P。
 *
 * 取景纪律:不新增 CameraPreset。使用已有 wide,并在场景里整体平移构图;
 * 圆心仍明确标注为数学坐标 O=(0,0)。
 */
import type { Chain, ControlSpec, Params } from '../../engine/types';
import { arcLength, circlePoint } from '../../math/trig';

const TAU = 2 * Math.PI;
const FIXED_THETA = Math.PI / 3;
const ANGLE_STEP = Math.PI / 12;

export const OBJ = {
  circle: 'circle',
  circleAxes: 'circleAxes',
  radius: 'radius',
  point: 'point',
  arc: 'arc',
  projection: 'projection',
  timeline: 'timeline',
  carry: 'carry',
  sineWave: 'sineWave',
  cosineWave: 'cosineWave',
  secondLap: 'secondLap',
} as const;

const clean = (value: number): number => (Math.abs(value) < 0.5e-6 ? 0 : value);
const f6 = (value: number): string => clean(value).toFixed(6);
const thetaOf = (p: Params): number => p.theta ?? 0;
const lapThetaOf = (p: Params): number => p.lapTheta ?? 0;
const pointOf = (p: Params) => circlePoint(thetaOf(p));

function angleLabel(value: number): string {
  const twelfths = Math.round(value / ANGLE_STEP);
  if (Math.abs(value - twelfths * ANGLE_STEP) > 1e-8) return `${value.toFixed(2)} rad`;
  if (twelfths === 0) return '0';
  if (twelfths === 24) return '2π';
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(twelfths, 12);
  const numerator = twelfths / divisor;
  const denominator = 12 / divisor;
  const top = numerator === 1 ? 'π' : `${numerator}π`;
  return denominator === 1 ? top : `${top}/${denominator}`;
}

const THETA_CONTROL: ControlSpec = {
  param: 'theta',
  label: 'angle  θ (radians)',
  min: 0,
  max: TAU,
  step: ANGLE_STEP,
  format: angleLabel,
};

export const UNIT_CIRCLE_CHAIN: Chain = {
  id: 'unit-circle',
  title: 'The Unit Circle and sin / cos',
  subtitle: 'Derivation chain · Trigonometry',

  defaultParams: { theta: 0, drop: 0, carry: 0, lapTheta: 0 },

  stages: [
    {
      id: 'point',
      label: '1',
      title: 'A point on a circle',
      narration:
        'Start with one point P on a circle of radius 1, measured from the circle’s own origin O = (0, 0) even though the whole diagram is shifted left to make room.',
      show: [OBJ.circle, OBJ.circleAxes, OBJ.radius, OBJ.point],
      camera: 'wide',
      params: { theta: 0 },
      formula: [
        { tex: `r = 1` },
        {
          tex: (p) => {
            const [x, y] = pointOf(p);
            return `P(0) = (${f6(x)},\\; ${f6(y)})`;
          },
          highlight: true,
        },
      ],
    },

    {
      id: 'arc-length',
      label: '2',
      title: 'θ is the distance walked along the arc',
      narration:
        'Move P counterclockwise and measure the highlighted arc: radians define angle as arc length divided by radius, so with radius 1 the arc length is literally θ.',
      show: [OBJ.circle, OBJ.circleAxes, OBJ.radius, OBJ.point, OBJ.arc],
      camera: 'wide',
      params: { theta: 0 },
      controls: [THETA_CONTROL],
      autoplay: { param: 'theta', from: 0, to: FIXED_THETA, delayMs: 1200, durationMs: 2600 },
      formula: [
        { tex: `\\theta = \\dfrac{s}{r}` },
        { tex: (p) => `s = r\\theta = 1 \\cdot ${thetaOf(p).toFixed(6)} = ${arcLength(thetaOf(p), 1).toFixed(6)}`, highlight: true },
      ],
    },

    {
      id: 'drop',
      label: '3',
      title: 'Drop a vertical line',
      narration:
        'Drop P straight down to the horizontal axis, revealing the blue signed y-coordinate that the unit circle names sin θ.',
      show: [OBJ.circle, OBJ.circleAxes, OBJ.radius, OBJ.point, OBJ.arc, OBJ.projection],
      camera: 'wide',
      params: { theta: FIXED_THETA, drop: 0 },
      controls: [THETA_CONTROL],
      autoplay: { param: 'drop', from: 0, to: 1, delayMs: 1200, durationMs: 1800 },
      formula: [
        { tex: (p) => `P(\\theta) = (${f6(pointOf(p)[0])},\\; ${f6(pointOf(p)[1])})` },
        { tex: (p) => `\\sin\\theta = y_P = ${f6(pointOf(p)[1])}`, highlight: true },
      ],
    },

    {
      id: 'carry',
      label: '4',
      title: 'Carry that height sideways',
      narration:
        'Put a θ-axis to the right and carry P’s blue height unchanged above the matching θ, locking the two points to exactly the same horizontal level.',
      show: [OBJ.circle, OBJ.circleAxes, OBJ.radius, OBJ.point, OBJ.projection, OBJ.timeline, OBJ.carry],
      camera: 'wide',
      params: { theta: FIXED_THETA, drop: 1, carry: 0 },
      controls: [THETA_CONTROL],
      autoplay: { param: 'carry', from: 0, to: 1, delayMs: 1200, durationMs: 2200 },
      formula: [
        { tex: (p) => `\\theta = ${thetaOf(p).toFixed(6)}` },
        { tex: (p) => `(\\theta,\\; \\sin\\theta) = (${thetaOf(p).toFixed(6)},\\; ${f6(pointOf(p)[1])})`, highlight: true },
      ],
    },

    {
      id: 'trace',
      label: '5',
      title: 'Trace the synchronized point',
      narration:
        'Let θ run from 0 to 2π while P circles once and its carried height traces the curve, with the horizontal connector proving both points always have exactly the same height.',
      show: [OBJ.circle, OBJ.circleAxes, OBJ.radius, OBJ.point, OBJ.timeline, OBJ.carry, OBJ.sineWave],
      camera: 'wide',
      controls: [THETA_CONTROL],
      autoplay: { param: 'theta', from: 0, to: TAU, delayMs: 1200, durationMs: 6200 },
      formula: [
        { tex: (p) => `\\theta = ${thetaOf(p).toFixed(6)}` },
        { tex: (p) => `\\sin\\theta = ${f6(pointOf(p)[1])}`, highlight: true },
        { tex: `0 \\le \\theta \\le 2\\pi` },
      ],
    },

    {
      id: 'cosine',
      label: '6',
      title: 'The other coordinate makes cosine',
      narration:
        'Trace the same P’s red horizontal coordinate cos θ against the θ-axis and a second wave appears with the sine shape shifted left by π/2.',
      show: [OBJ.circle, OBJ.circleAxes, OBJ.radius, OBJ.point, OBJ.projection, OBJ.timeline, OBJ.carry, OBJ.sineWave, OBJ.cosineWave],
      camera: 'wide',
      params: { drop: 1 },
      controls: [THETA_CONTROL],
      autoplay: { param: 'theta', from: 0, to: TAU, delayMs: 1200, durationMs: 6200 },
      formula: [
        { tex: (p) => `\\sin\\theta = ${f6(pointOf(p)[1])}` },
        { tex: (p) => `\\cos\\theta = ${f6(pointOf(p)[0])}`, highlight: true },
        { tex: `\\cos\\theta = \\sin\\!\\left(\\theta + \\dfrac{\\pi}{2}\\right)` },
      ],
    },

    {
      id: 'repeat',
      label: '7',
      title: 'A second lap draws the same wave',
      narration:
        'Send P around once more and every carried height lands on the first wave because an extra 2π returns P to the same positions in the same order.',
      show: [OBJ.circle, OBJ.circleAxes, OBJ.radius, OBJ.point, OBJ.timeline, OBJ.carry, OBJ.sineWave, OBJ.secondLap],
      camera: 'wide',
      controls: [{ ...THETA_CONTROL, param: 'lapTheta', label: 'second lap' }],
      autoplay: { param: 'lapTheta', from: 0, to: TAU, delayMs: 1200, durationMs: 6200 },
      formula: [
        { tex: (p) => `\\theta_{\\text{total}} = 2\\pi + ${lapThetaOf(p).toFixed(6)}` },
        { tex: (p) => `\\sin(\\theta + 2\\pi) = ${f6(circlePoint(lapThetaOf(p) + TAU)[1])}` },
        { tex: `\\sin(\\theta + 2\\pi) = \\sin\\theta`, highlight: true },
      ],
    },
  ],
};
