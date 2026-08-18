/**
 * CONCEPT — Unit-circle velocity → trig derivatives → trig integrals
 *
 * 主角是圆上 P 点的速度箭头:弦速度缩成切向速度,然后拆成水平/竖直分量。
 * 固定 θ=π/3 让每一个屏幕数字都能手算复核。
 */
import type { Chain, ControlSpec, Params } from '../../engine/types';
import { chordVelocity, circleVelocity, trigRates } from '../../math/trigRates';

const THETA = Math.PI / 3;
const clean = (value: number): number => (Math.abs(value) < 0.5e-6 ? 0 : value);
const f6 = (value: number): string => clean(value).toFixed(6);
const deltaOf = (params: Params): number => params.deltaTheta ?? 0.8;

const DELTA_CONTROL: ControlSpec = {
  param: 'deltaTheta',
  label: 'angle gap  Δθ',
  min: 0.05,
  max: 0.8,
  step: 0.05,
  format: (value) => value.toFixed(2),
};

export const OBJ = {
  axes: 'axes',
  circle: 'circle',
  radius: 'radius',
  point: 'point',
  nearbyPoint: 'nearbyPoint',
  chord: 'chord',
  chordVelocity: 'chordVelocity',
  tangentVelocity: 'tangentVelocity',
  xComponent: 'xComponent',
  yComponent: 'yComponent',
  reverse: 'reverse',
} as const;

export const TRIG_RATES_CHAIN: Chain = {
  id: 'trig-rates',
  title: 'Why sin and cos Differentiate into Each Other',
  subtitle: 'Derivation chain · Trig derivatives & integrals',
  defaultParams: { theta: THETA, deltaTheta: 0.8 },
  stages: [
    {
      id: 'moving-point', label: '1', title: 'Walk around the unit circle',
      narration: 'Let P move counterclockwise one radian per second, so its position is controlled by the single angle θ.',
      show: [OBJ.axes, OBJ.circle, OBJ.radius, OBJ.point], camera: 'front',
      formula: [
        { tex: String.raw`P(\theta)=(\cos\theta,\;\sin\theta)` },
        { tex: String.raw`\theta=\frac{\pi}{3}`, highlight: true },
      ],
    },
    {
      id: 'two-positions', label: '2', title: 'Compare two nearby positions',
      narration: 'A second point Q at θ+Δθ turns the motion into one visible chord from P to Q.',
      show: [OBJ.axes, OBJ.circle, OBJ.radius, OBJ.point, OBJ.nearbyPoint, OBJ.chord], camera: 'front',
      controls: [DELTA_CONTROL],
      formula: [
        { tex: String.raw`P=P(\theta),\qquad Q=P(\theta+\Delta\theta)` },
        { tex: (p) => String.raw`\Delta\theta=${deltaOf(p).toFixed(2)}`, highlight: true },
      ],
    },
    {
      id: 'divide-by-time', label: '3', title: 'Divide displacement by elapsed angle',
      narration: 'Because θ increases at one radian per second, the chord divided by Δθ is the average velocity vector.',
      show: [OBJ.axes, OBJ.circle, OBJ.radius, OBJ.point, OBJ.nearbyPoint, OBJ.chord, OBJ.chordVelocity], camera: 'front',
      controls: [DELTA_CONTROL],
      formula: [
        { tex: String.raw`\vec v_{\mathrm{avg}}=\frac{P(\theta+\Delta\theta)-P(\theta)}{\Delta\theta}` },
        { tex: (p) => { const [x, y] = chordVelocity(THETA, deltaOf(p)); return String.raw`\vec v_{\mathrm{avg}}=(${f6(x)},\;${f6(y)})`; }, highlight: true },
      ],
    },
    {
      id: 'shrink-gap', label: '4', title: 'Shrink the angle gap',
      narration: 'As Δθ shrinks, the chord velocity swings into the unique tangent direction at P.',
      show: [OBJ.axes, OBJ.circle, OBJ.radius, OBJ.point, OBJ.nearbyPoint, OBJ.chord, OBJ.chordVelocity, OBJ.tangentVelocity], camera: 'front',
      params: { deltaTheta: 0.8 }, controls: [DELTA_CONTROL],
      autoplay: { param: 'deltaTheta', from: 0.8, to: 0.05, delayMs: 1200, durationMs: 4200 },
      formula: [
        { tex: String.raw`\vec v(\theta)=\lim_{\Delta\theta\to0}\vec v_{\mathrm{avg}}` },
        { tex: (p) => { const chord = chordVelocity(THETA, deltaOf(p)); const exact = circleVelocity(THETA); const error = Math.hypot(chord[0] - exact[0], chord[1] - exact[1]); return String.raw`\Delta\theta=${deltaOf(p).toFixed(2)},\quad\lVert\vec v_{\mathrm{avg}}-\vec v\rVert=${f6(error)}`; }, highlight: true },
      ],
    },
    {
      id: 'tangent-vector', label: '5', title: 'Rotate the radius by 90°',
      narration: 'The unit tangent is the radius (cos θ,sin θ) rotated counterclockwise, so its coordinates are (−sin θ,cos θ).',
      show: [OBJ.axes, OBJ.circle, OBJ.radius, OBJ.point, OBJ.tangentVelocity], camera: 'front',
      params: { deltaTheta: 0.05 },
      formula: [
        { tex: String.raw`(x,y)\xrightarrow{\;90^\circ\;}(-y,x)` },
        { tex: (p) => { const [x, y] = circleVelocity(p.theta ?? THETA); return String.raw`\vec v=(-\sin\theta,\cos\theta)=(${f6(x)},\;${f6(y)})`; }, highlight: true },
      ],
    },
    {
      id: 'sine-rate', label: '6', title: 'Read the vertical component',
      narration: 'The vertical coordinate is sin θ, so the vertical velocity component cos θ is exactly its derivative.',
      show: [OBJ.axes, OBJ.circle, OBJ.radius, OBJ.point, OBJ.tangentVelocity, OBJ.yComponent], camera: 'front',
      formula: [
        { tex: (p) => String.raw`v_y=\cos\theta=${f6(trigRates(p.theta ?? THETA).dSin)}` },
        { tex: String.raw`\frac d{d\theta}\sin\theta=\cos\theta`, highlight: true },
      ],
    },
    {
      id: 'cosine-rate', label: '7', title: 'Read the horizontal component',
      narration: 'The horizontal coordinate is cos θ, so its leftward velocity component −sin θ is exactly its derivative.',
      show: [OBJ.axes, OBJ.circle, OBJ.radius, OBJ.point, OBJ.tangentVelocity, OBJ.xComponent], camera: 'front',
      formula: [
        { tex: (p) => String.raw`v_x=-\sin\theta=${f6(trigRates(p.theta ?? THETA).dCos)}` },
        { tex: String.raw`\frac d{d\theta}\cos\theta=-\sin\theta`, highlight: true },
      ],
    },
    {
      id: 'reverse-arrows', label: '8', title: 'Reverse the derivative arrows',
      narration: 'An indefinite integral reverses differentiation, so the same two arrows immediately give the matching antiderivatives plus C.',
      show: [OBJ.axes, OBJ.circle, OBJ.radius, OBJ.point, OBJ.tangentVelocity, OBJ.xComponent, OBJ.yComponent, OBJ.reverse], camera: 'front',
      formula: [
        { tex: String.raw`\frac d{d\theta}\sin\theta=\cos\theta\quad\Longleftrightarrow\quad\int\cos\theta\,d\theta=\sin\theta+C` },
        { tex: String.raw`\frac d{d\theta}\cos\theta=-\sin\theta\quad\Longleftrightarrow\quad\int\sin\theta\,d\theta=-\cos\theta+C`, highlight: true },
      ],
    },
  ],
};
