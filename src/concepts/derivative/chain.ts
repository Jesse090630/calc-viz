/**
 * CONCEPT — Secant → Tangent 推导链
 *
 * 诊断:学生会背"导数是切线斜率",但说不出**两个点怎么变成一个点而斜率还有意义**。
 * 他们能算差商,也能背公式,但中间那一步在他们脑子里是空的。
 *
 * 看不见的量:割线**趋近**的过程本身。
 * 主角:曲线上那个可移动的第二点 Q。
 *
 * 钉死的例子:f(x)=x²,定点 a=1,f'(1)=2。
 * 选它是因为割线斜率有恒等式 m(h) = (2h+h²)/h = **2 + h**。
 * 第 4 步把这个恒等式摊开之后,后面每一步用户都能【预测】数字 ——
 * 极限不再是"越来越接近"这种含糊说法,而是一个看得见的加法项在缩小。
 */
import type { Chain } from '../../engine/types';
import { PARABOLA_UP } from '../../math/curves';
import { clampH, secant } from '../../math/derivative';

const CURVE = PARABOLA_UP;
const A = 1;

export const OBJ = {
  axes: 'axes',
  curve: 'curve',
  pointP: 'pointP',
  pointQ: 'pointQ',
  secantLine: 'secantLine',
  triangle: 'triangle',
  tangentLine: 'tangentLine',
  slidingTangent: 'slidingTangent',
} as const;

const f6 = (v: number): string => v.toFixed(6);
const hOf = (p: Record<string, number>): number => clampH(p.h ?? 1);
const slopeOf = (p: Record<string, number>): number => secant(CURVE, A, hOf(p)).slope;

/** h 滑块。范围刻意不含 0 附近的死区 —— clampH 会把落进去的值推开。 */
const H_CONTROL = {
  param: 'h',
  label: 'gap  h',
  min: -0.9,
  max: 1,
  step: 0.01,
  format: (v: number) => clampH(v).toFixed(2),
} as const;

export const DERIVATIVE_CHAIN: Chain = {
  id: 'derivative',
  title: 'Secant → Tangent',
  subtitle: 'Derivation chain · The Derivative',

  defaultParams: { h: 1, x0: 1 },

  stages: [
    {
      id: 'two-points',
      label: '1',
      title: 'Two points on the curve',
      narration:
        'P sits at x = 1 and stays there. Q sits h to its right. Everything that follows is about what happens to the line through them as Q slides toward P.',
      altText: 'An upward parabola carries a fixed point P at one comma one and a movable point Q to its right.',
      show: [OBJ.axes, OBJ.curve, OBJ.pointP, OBJ.pointQ],
      camera: 'front',
      controls: [H_CONTROL],
      formula: [
        { tex: `P = (1,\\; 1)` },
        {
          tex: (p) => {
            const s = secant(CURVE, A, hOf(p));
            return `Q = (${s.q[0].toFixed(2)},\\; ${s.q[1].toFixed(2)})`;
          },
          highlight: true,
        },
      ],
    },

    {
      id: 'the-line',
      label: '2',
      title: 'The line through them',
      narration:
        'Draw the line joining P and Q — a secant. Its slope is rise over run, and both of those are things you can measure off the picture right now.',
      altText: 'A secant line joins P and Q on the parabola, with a right triangle marking the horizontal run and vertical rise.',
      show: [OBJ.axes, OBJ.curve, OBJ.pointP, OBJ.pointQ, OBJ.secantLine, OBJ.triangle],
      camera: 'front',
      params: { h: 1 },
      controls: [H_CONTROL],
      formula: [
        { tex: (p) => `\\Delta x = h = ${hOf(p).toFixed(2)}` },
        { tex: (p) => `\\Delta y = ${secant(CURVE, A, hOf(p)).dy.toFixed(4)}` },
        { tex: (p) => `m = \\dfrac{\\Delta y}{\\Delta x} = ${f6(slopeOf(p))}`, highlight: true },
      ],
    },

    {
      id: 'slide',
      label: '3',
      title: 'Slide Q toward P',
      narration:
        'Drag h down. The secant pivots around P, and its slope keeps changing — but notice it is not wandering. It is heading somewhere.',
      altText: 'Point Q slides toward fixed point P while the secant line pivots and the rise-run triangle shrinks.',
      show: [OBJ.axes, OBJ.curve, OBJ.pointP, OBJ.pointQ, OBJ.secantLine, OBJ.triangle],
      camera: 'front',
      params: { h: 1 },
      controls: [H_CONTROL],
      autoplay: { param: 'h', from: 1, to: 0.25, delayMs: 800, durationMs: 2600 },
      formula: [
        { tex: (p) => `h = ${hOf(p).toFixed(2)}` },
        { tex: (p) => `m = ${f6(slopeOf(p))}`, highlight: true },
      ],
    },

    {
      id: 'identity',
      label: '4',
      title: 'The slope is literally 2 + h',
      narration:
        'Do the algebra once and the mystery goes away. The h in the denominator cancels, and what is left is 2 plus the gap itself. From here you can predict every number before you drag.',
      altText: 'The parabola shows P, nearby Q, and their secant while the panel identifies its changing slope as two plus h.',
      show: [OBJ.axes, OBJ.curve, OBJ.pointP, OBJ.pointQ, OBJ.secantLine],
      camera: 'front',
      params: { h: 0.5 },
      controls: [H_CONTROL],
      formula: [
        { tex: `m(h) = \\dfrac{(1+h)^2 - 1}{h} = \\dfrac{2h + h^2}{h}` },
        { tex: `\\;\\;\\;\\;\\;\\; = 2 + h`, highlight: true },
        { tex: (p) => `h = ${hOf(p).toFixed(2)} \\;\\Rightarrow\\; m = 2 + ${hOf(p).toFixed(2)} = ${f6(slopeOf(p))}` },
      ],
    },

    {
      id: 'both-sides',
      label: '5',
      title: 'Come in from the other side too',
      narration:
        'Push h negative and Q moves to the left of P. The secant now leans the other way, but the slope closes on the same number from below. Both sides agree — that is what makes the limit exist.',
      altText: 'Point Q sits to the left of P and the secant approaches the same tangent direction from the opposite side.',
      show: [OBJ.axes, OBJ.curve, OBJ.pointP, OBJ.pointQ, OBJ.secantLine],
      camera: 'front',
      params: { h: -0.1 },
      controls: [H_CONTROL],
      formula: [
        { tex: (p) => `h = ${hOf(p).toFixed(2)} \\;\\Rightarrow\\; m = ${f6(slopeOf(p))}`, highlight: true },
        { tex: `h = +0.10 \\Rightarrow 2.100000, \\quad h = -0.10 \\Rightarrow 1.900000` },
      ],
    },

    {
      id: 'shrink',
      label: '6',
      title: 'Let h → 0',
      narration:
        'h halves, then halves again. The "+ h" on the end of the slope is the entire error, so watching it shrink is watching the limit happen. The secant becomes indistinguishable from a single line.',
      altText: 'Point Q advances toward P in smaller steps and the secant becomes visually indistinguishable from the limiting line.',
      show: [OBJ.axes, OBJ.curve, OBJ.pointP, OBJ.pointQ, OBJ.secantLine],
      camera: 'front',
      params: { h: 0.5 },
      controls: [H_CONTROL],
      autoplay: {
        param: 'h',
        from: 0.5,
        to: 0.02,
        steps: [0.5, 0.25, 0.1, 0.05, 0.02],
        delayMs: 800,
        durationMs: 5200,
      },
      formula: [
        { tex: (p) => `m = 2 + ${hOf(p).toFixed(2)} = ${f6(slopeOf(p))}`, highlight: true },
        { tex: `\\text{the error is exactly } h` },
      ],
    },

    {
      id: 'tangent',
      label: '7',
      title: 'The tangent line',
      narration:
        'Q is gone. What is left is not a very short secant — it is the line the secants were converging to, and its slope is exactly 2. That number is the derivative at x = 1.',
      altText: 'Only point P and the amber tangent line remain on the parabola, with tangent slope two.',
      show: [OBJ.axes, OBJ.curve, OBJ.pointP, OBJ.tangentLine],
      camera: 'front',
      formula: [
        { tex: `m = \\lim_{h \\to 0} (2 + h) = 2` },
        { tex: `f'(1) = 2`, highlight: true },
      ],
    },

    {
      id: 'everywhere',
      label: '8',
      title: 'Do it at every point',
      narration:
        'Nothing about x = 1 was special. Run the same argument at every x and the slopes themselves trace out a new function — which is all a derivative ever was.',
      altText: 'A tangent point slides along the parabola and its tangent line rotates to match the local slope at every position.',
      show: [OBJ.axes, OBJ.curve, OBJ.slidingTangent],
      camera: 'front',
      params: { x0: 0.5 },
      controls: [{ param: 'x0', label: 'tangent point  x', min: 0.15, max: 1.95, step: 0.01 }],
      autoplay: { param: 'x0', from: 0.5, to: 1.9, delayMs: 800, durationMs: 3200 },
      formula: [
        { tex: (p) => `\\text{slope at } x = ${(p.x0 ?? 1).toFixed(2)} \\text{ is } ${f6(CURVE.df(p.x0 ?? 1))}` },
        { tex: `f'(x) = 2x`, highlight: true },
      ],
    },
  ],
};
