/** 用户函数的 Riemann 推导链：保留“过程播放器”，不退化成答案计算器。 */
import type { Chain } from '../../engine/types';
import { relativeError, riemannSum } from '../../math/riemann';
import type { CurveSpec } from '../../math/types';
import { formatCoordinate } from '../../math/format';
import { OBJ } from './chain';

const count = (value: number): number => Math.max(1, Math.round(value));
const nFrom = (params: Readonly<Record<string, number>>): number => count(params.n ?? 4);
const f6 = (value: number): string => value.toFixed(6);

export function makeCustomRiemannChain(curve: CurveSpec, exact: number): Chain {
  const [a, b] = curve.domain;
  const aTex = formatCoordinate(a, 'tex');
  const bTex = formatCoordinate(b, 'tex');
  const mid = (n: number): number => riemannSum(curve.f, curve.domain, n, 'mid');
  const error = (n: number): number => relativeError(mid(n), exact);

  return {
    id: 'riemann-sum-custom',
    title: 'Your Function → the Integral',
    subtitle: 'Derivation chain · Custom Riemann Sum',
    defaultParams: { n: 4, morph: 0 },
    stages: [
      {
        id: 'custom-area', label: '1', title: 'Your area',
        narration: 'The shaded region is the area defined by your function and interval.',
        show: [OBJ.axes, OBJ.curve, OBJ.region], camera: 'front',
        formula: [{ tex: curve.tex, highlight: true }, { tex: `${aTex} \\le x \\le ${bTex}` }],
      },
      {
        id: 'custom-rectangles', label: '2', title: 'Measure with midpoints',
        narration: 'Four midpoint rectangles turn the curved region into measurable pieces.',
        show: [OBJ.axes, OBJ.curve, OBJ.region, OBJ.leftBars], camera: 'front', params: { n: 4 },
        formula: [{ tex: `M_4 = ${f6(mid(4))}`, highlight: true }],
      },
      {
        id: 'custom-sum', label: '3', title: 'Add the pieces',
        narration: 'Each rectangle contributes its midpoint height times the shared width.',
        show: [OBJ.axes, OBJ.curve, OBJ.region, OBJ.leftBars], camera: 'front', params: { n: 4 },
        formula: [
          { tex: 'M_n = \\sum_{i=1}^{n} f(x_i^*)\\,\\Delta x', highlight: true },
          { tex: `M_4 = ${f6(mid(4))}` },
        ],
      },
      {
        id: 'custom-compare', label: '4', title: 'A numerical checkpoint',
        narration: 'An independent adaptive integral gives us a trustworthy value to compare against.',
        show: [OBJ.axes, OBJ.curve, OBJ.region, OBJ.leftBars], camera: 'front', params: { n: 4 },
        formula: [
          { tex: `M_4 = ${f6(mid(4))}`, highlight: true },
          { tex: `\\int_{${aTex}}^{${bTex}} f(x)\\,dx = ${f6(exact)}` },
        ],
      },
      {
        id: 'custom-refine', label: '5', title: 'Make the pieces thinner',
        narration: 'Increasing n makes every midpoint rectangle thinner and improves the approximation.',
        show: [OBJ.axes, OBJ.curve, OBJ.region, OBJ.leftBars], camera: 'front', params: { n: 4 },
        controls: [{ param: 'n', label: 'number of rectangles  n', min: 1, max: 64, step: 1, format: String }],
        formula: [{ tex: (p) => `M_{${nFrom(p)}} = ${f6(mid(nFrom(p)))}`, highlight: true }],
      },
      {
        id: 'custom-error', label: '6', title: 'Watch the error shrink',
        narration: 'The percentage gap between the rectangle sum and the independent integral shrinks as n grows.',
        show: [OBJ.axes, OBJ.curve, OBJ.region, OBJ.leftBars], camera: 'front', params: { n: 4 },
        controls: [{ param: 'n', label: 'number of rectangles  n', min: 1, max: 64, step: 1, format: String }],
        formula: [
          { tex: (p) => `M_{${nFrom(p)}} = ${f6(mid(nFrom(p)))}`, highlight: true },
          { tex: (p) => `\\text{relative error} = ${f6(error(nFrom(p)))}\\%` },
        ],
      },
      {
        id: 'custom-limit', label: '7', title: 'Let n grow',
        narration: 'Doubling n through discrete steps makes the midpoint sum settle onto one value.',
        show: [OBJ.axes, OBJ.curve, OBJ.region, OBJ.leftBars], camera: 'front', params: { n: 4 },
        autoplay: { param: 'n', from: 4, to: 64, steps: [4, 8, 16, 32, 64], delayMs: 1200, durationMs: 4800 },
        formula: [
          { tex: (p) => `n=${nFrom(p)},\\quad M_n=${f6(mid(nFrom(p)))}`, highlight: true },
          { tex: (p) => `\\text{relative error}=${f6(error(nFrom(p)))}\\%` },
        ],
      },
      {
        id: 'custom-integral', label: '8', title: 'The limit is the integral',
        narration: 'When the rectangles become infinitely thin, their limiting sum is the integral of your function.',
        show: [OBJ.axes, OBJ.curve, OBJ.region, OBJ.leftBars, OBJ.transform], camera: 'front',
        params: { n: 64, morph: 0 },
        autoplay: { param: 'morph', from: 0, to: 1, delayMs: 1200, durationMs: 1800 },
        formula: [
          { tex: `\\lim_{n\\to\\infty}M_n = \\int_{${aTex}}^{${bTex}}f(x)\\,dx`, highlight: true },
          { tex: `\\int_{${aTex}}^{${bTex}}f(x)\\,dx = ${f6(exact)}` },
        ],
      },
    ],
  };
}
