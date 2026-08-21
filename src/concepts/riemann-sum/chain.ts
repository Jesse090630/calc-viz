/**
 * CONCEPT — Riemann Sum → 定积分
 *
 * 诊断:学生看不出“把矩形加起来”和“积分号”是同一件事。
 * 看不见的量:Δx → 0 时，左右端点和之间的误差夹缝怎样消失。
 * 唯一主角:同一排矩形。
 */
import type { Chain } from '../../engine/types';
import { PARABOLA_DOWN } from '../../math/curves';
import {
  definiteIntegralExact,
  endpointDifference,
  leftRightGap,
  riemannSum,
} from '../../math/riemann';

const CURVE = PARABOLA_DOWN;
const INTERVAL = CURVE.domain;
const EXACT = definiteIntegralExact(CURVE, INTERVAL);
const ENDPOINT_DIFFERENCE = endpointDifference(CURVE, INTERVAL);
const [A, B] = INTERVAL;
const count = (value: number): number => Math.max(1, Math.round(value));
const nFrom = (params: Readonly<Record<string, number>>): number => count(params.n ?? 4);
const left = (n: number): number => riemannSum(CURVE.f, INTERVAL, n, 'left');
const right = (n: number): number => riemannSum(CURVE.f, INTERVAL, n, 'right');
const gap = (n: number): number => leftRightGap(CURVE, n, INTERVAL);
const f6 = (value: number): string => value.toFixed(6);

export const OBJ = {
  axes: 'axes',
  curve: 'curve',
  region: 'region',
  leftBars: 'left-bars',
  rightBars: 'right-bars',
  gap: 'gap',
  transform: 'transform',
} as const;

export const RIEMANN_SUM_CHAIN: Chain = {
  id: 'riemann-sum',
  title: 'Riemann Sums → the Integral',
  subtitle: 'Derivation chain · Riemann Sums',
  defaultParams: { n: 4, morph: 0 },

  stages: [
    {
      id: 'area',
      label: '1',
      title: 'The area under a curve',
      narration: 'We want this area, but its curved boundary makes it unlike any shape whose area formula we already know.',
      altText: 'A decreasing curve from height four to zero encloses a shaded green region above the x-axis from x equals zero to two.',
      show: [OBJ.axes, OBJ.curve, OBJ.region],
      camera: 'front',
    },
    {
      id: 'rectangles',
      label: '2',
      title: 'Rectangles we can measure',
      narration: 'Four left-endpoint rectangles replace the curved region with shapes whose areas we can calculate and add.',
      altText: 'Four amber rectangles use the curve height at each left endpoint and cover the shaded region.',
      show: [OBJ.axes, OBJ.curve, OBJ.region, OBJ.leftBars],
      camera: 'front',
      params: { n: 4 },
      controls: [{ param: 'n', label: 'number of rectangles  n', min: 1, max: 4, step: 1, format: String }],
      formula: [{ tex: 'A \\approx \\sum_{i=1}^{n} f(x_i)\\,\\Delta x', highlight: true }],
    },
    {
      id: 'too-big',
      label: '3',
      title: 'Too big',
      narration: 'Because the curve decreases, every left-endpoint rectangle sticks above it, so their total is an overestimate.',
      altText: 'Each of four left-endpoint rectangles extends above the decreasing curve, showing an upper estimate.',
      show: [OBJ.axes, OBJ.curve, OBJ.region, OBJ.leftBars],
      camera: 'front',
      params: { n: 4 },
      controls: [{ param: 'n', label: 'number of rectangles  n', min: 1, max: 64, step: 1, format: String }],
      formula: [
        { tex: (p) => `L_{${nFrom(p)}} = ${f6(left(nFrom(p)))}`, highlight: true },
        { tex: `L_4 = ${f6(left(4))} > A = ${f6(EXACT)}` },
      ],
    },
    {
      id: 'too-small',
      label: '4',
      title: 'Too small',
      narration: 'Switching each height to the right endpoint puts every rectangle below the decreasing curve, so the total is an underestimate.',
      altText: 'Four cyan right-endpoint rectangles stay below the decreasing curve, showing a lower estimate.',
      show: [OBJ.axes, OBJ.curve, OBJ.region, OBJ.rightBars],
      camera: 'front',
      params: { n: 4 },
      controls: [{ param: 'n', label: 'number of rectangles  n', min: 1, max: 64, step: 1, format: String }],
      formula: [
        { tex: (p) => `R_{${nFrom(p)}} = ${f6(right(nFrom(p)))}`, highlight: true },
        { tex: `R_4 = ${f6(right(4))} < A = ${f6(EXACT)}` },
      ],
    },
    {
      id: 'squeezed',
      label: '5',
      title: 'Squeezed',
      narration: 'Showing both sets at once traps the true area between a lower total and an upper total.',
      altText: 'Cyan lower rectangles and amber upper rectangles overlap around the green true area, trapping it between their totals.',
      show: [OBJ.axes, OBJ.curve, OBJ.region, OBJ.leftBars, OBJ.rightBars, OBJ.gap],
      camera: 'front',
      params: { n: 4 },
      controls: [{ param: 'n', label: 'number of rectangles  n', min: 1, max: 64, step: 1, format: String }],
      formula: [
        { tex: (p) => `${f6(right(nFrom(p)))} \\le A = ${f6(EXACT)} \\le ${f6(left(nFrom(p)))}`, highlight: true },
        { tex: (p) => `L_n-R_n = ${f6(gap(nFrom(p)))}` },
      ],
    },
    {
      id: 'gap',
      label: '6',
      title: 'The gap is Δx-sized',
      narration: 'Increasing n shrinks Δx, and the width of the trap shrinks in exactly the same proportion.',
      altText: 'Upper and lower rectangle sets remain on the same curve while their visible gap narrows as the rectangle count increases.',
      show: [OBJ.axes, OBJ.curve, OBJ.region, OBJ.leftBars, OBJ.rightBars, OBJ.gap],
      camera: 'front',
      params: { n: 4 },
      controls: [{ param: 'n', label: 'number of rectangles  n', min: 1, max: 64, step: 1, format: String }],
      formula: [
        { tex: `L_n-R_n = \\bigl(f(${A})-f(${B})\\bigr)\\Delta x = ${String(ENDPOINT_DIFFERENCE)}\\Delta x`, highlight: true },
        { tex: (p) => `\\text{gap at }n=${nFrom(p)}: ${f6(gap(nFrom(p)))}` },
      ],
    },
    {
      id: 'limit',
      label: '7',
      title: 'Δx → 0',
      narration: 'As n doubles through discrete steps, the upper and lower totals are forced together until only one possible area remains.',
      altText: 'The rectangle count doubles from four to sixty-four, making both estimates visually converge on the same shaded area.',
      show: [OBJ.axes, OBJ.curve, OBJ.region, OBJ.leftBars, OBJ.rightBars, OBJ.gap],
      camera: 'front',
      params: { n: 4 },
      autoplay: { param: 'n', from: 4, to: 64, steps: [4, 8, 16, 32, 64], delayMs: 1200, durationMs: 4800 },
      formula: [
        { tex: (p) => `n=${nFrom(p)},\\quad L_n-R_n=${f6(gap(nFrom(p)))}`, highlight: true },
        { tex: 'L_n-R_n \\to 0\\quad\\Longrightarrow\\quad\\text{only one number remains}' },
      ],
    },
    {
      id: 'integral',
      label: '8',
      title: 'That number is the integral',
      narration: 'When the rectangles become infinitely thin, their sum is precisely the solid green area named by the integral sign.',
      altText: 'The thin rectangles fade into one solid green region as the summation notation changes into an integral.',
      show: [OBJ.axes, OBJ.curve, OBJ.region, OBJ.leftBars, OBJ.rightBars, OBJ.transform],
      camera: 'front',
      params: { n: 64, morph: 0 },
      autoplay: { param: 'morph', from: 0, to: 1, delayMs: 1200, durationMs: 1800 },
      formula: [
        { tex: `\\lim_{n\\to\\infty}\\sum_{i=1}^{n} f(x_i)\\,\\Delta x = \\int_{${A}}^{${B}}(4-x^2)\\,dx`, highlight: true },
        { tex: `\\int_{${A}}^{${B}}(4-x^2)\\,dx = \\frac{16}{3} = ${f6(EXACT)}` },
      ],
    },
  ],
};
