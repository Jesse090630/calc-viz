/** 用户函数的 Shell Method 推导链。 */
import type { Chain } from '../../engine/types';
import { circumference } from '../../math/geometry';
import { partitionWidth, relativeError, sampleX } from '../../math/riemann';
import { ringVolume, shellRiemann, shellVolumeExact, slabVolume } from '../../math/solids';
import type { CurveSpec } from '../../math/types';
import { OBJ } from './chain';

const f2 = (value: number): string => value.toFixed(2);
const f4 = (value: number): string => value.toFixed(4);
const f6 = (value: number): string => value.toFixed(6);

export function makeCustomShellChain(curve: CurveSpec): Chain {
  const [a, b] = curve.domain;
  const x0 = sampleX(a, b, 1, 0, 'mid');
  const dx = partitionWidth(curve.domain, 6);
  const positionMin = sampleX(a, b, 20, 1, 'left');
  const positionMax = sampleX(a, b, 20, 19, 'left');
  const exact = shellVolumeExact(curve);
  const valueAt = (params: Readonly<Record<string, number>>): number => params.x0 ?? x0;
  const widthAt = (params: Readonly<Record<string, number>>): number => params.dx ?? dx;
  const nAt = (params: Readonly<Record<string, number>>): number => Math.max(1, Math.round(params.n ?? 8));
  const sliceAt = (params: Readonly<Record<string, number>>) => ({
    x: valueAt(params), dx: widthAt(params), h: curve.f(valueAt(params)),
  });

  return {
    id: 'shell-method-custom',
    title: 'Your Function → Shell Method',
    subtitle: 'Derivation chain · Custom Shell Method',
    defaultParams: { x0, dx, theta: Math.PI * 2, bend: 1, n: 8 },
    stages: [
      {
        id: 'custom-region', label: '1', title: 'Your region',
        narration: 'Your function and interval define the flat region that will rotate around the y-axis.',
        show: [OBJ.axes, OBJ.curve, OBJ.region], camera: 'front',
        formula: [{ tex: curve.tex, highlight: true }, { tex: `${a} \\le x \\le ${b}` }],
      },
      {
        id: 'custom-strip', label: '2', title: 'One vertical strip',
        narration: 'A strip at x has height f(x) and a small thickness that you can change.',
        show: [OBJ.axes, OBJ.curve, OBJ.region, OBJ.rect], camera: 'front',
        controls: [
          { param: 'x0', label: 'position  x', min: positionMin, max: positionMax, step: partitionWidth(curve.domain, 100) },
          { param: 'dx', label: 'width  Δx', min: partitionWidth(curve.domain, 40), max: partitionWidth(curve.domain, 3), step: partitionWidth(curve.domain, 100) },
        ],
        formula: [
          { tex: (p) => `x=${f2(valueAt(p))}` },
          { tex: (p) => `h=f(x)=${f2(curve.f(valueAt(p)))}`, highlight: true },
          { tex: (p) => `\\Delta x=${f2(widthAt(p))}` },
        ],
      },
      {
        id: 'custom-sweep', label: '3', title: 'Sweep it around the axis',
        narration: 'After the camera settles, the strip traces a cylindrical shell around the y-axis.',
        show: [OBJ.axes, OBJ.curve, OBJ.rect, OBJ.shell], camera: 'three-quarter', params: { bend: 1 },
        controls: [{ param: 'theta', label: 'sweep angle  θ', min: 0, max: Math.PI * 2, step: 0.01 }],
        autoplay: { param: 'theta', from: 0, to: Math.PI * 2, delayMs: 1150, durationMs: 2200 },
        formula: [{ tex: (p) => `\\theta=${f2((p.theta ?? 0) / Math.PI)}\\pi`, highlight: true }],
      },
      {
        id: 'custom-dims', label: '4', title: 'Read the three dimensions',
        narration: 'The radius is x, the height is f(x), and one trip around contributes the circumference 2πx.',
        show: [OBJ.axes, OBJ.shell, OBJ.dimLabels, OBJ.circRing], camera: 'three-quarter',
        params: { theta: Math.PI * 2, bend: 1 },
        formula: [
          { tex: (p) => `r=x=${f2(valueAt(p))}` },
          { tex: (p) => `h=f(x)=${f2(curve.f(valueAt(p)))}` },
          { tex: (p) => `C=2\\pi x=${f2(circumference(valueAt(p)))}`, highlight: true },
        ],
      },
      {
        id: 'custom-unroll', label: '5', title: 'Unroll the shell',
        narration: 'Cutting and flattening the shell reveals a slab whose length is the circumference.',
        show: [OBJ.shell, OBJ.flatLabels], camera: 'wide', params: { theta: Math.PI * 2 },
        controls: [{ param: 'bend', label: 'unroll', min: 0, max: 1, step: 0.01 }],
        autoplay: { param: 'bend', from: 1, to: 0, delayMs: 900, durationMs: 2000 },
        formula: [{ tex: '\\Delta V \\approx 2\\pi x\\,f(x)\\,\\Delta x', highlight: true }],
      },
      {
        id: 'custom-identity', label: '5b', title: 'The slab identity is exact',
        narration: 'With the radius measured at the middle, the flattened slab and the true ring have exactly the same volume.',
        show: [OBJ.shell, OBJ.flatLabels], camera: 'wide', params: { theta: Math.PI * 2, bend: 0 },
        formula: [
          { tex: '2\\pi r h\\,\\Delta x = \\pi(R^2-r^2)h', highlight: true },
          { tex: (p) => `\\text{slab}=${slabVolume(sliceAt(p)).toFixed(9)}` },
          { tex: (p) => `\\text{ring}=${ringVolume(sliceAt(p)).toFixed(9)}` },
        ],
      },
      {
        id: 'custom-many', label: '6', title: 'Fill it with shells',
        narration: 'Midpoint shells fill the solid more closely as their number increases.',
        show: [OBJ.axes, OBJ.curve, OBJ.shells], camera: 'three-quarter', params: { n: 4 },
        controls: [{ param: 'n', label: 'number of shells  n', min: 1, max: 40, step: 1 }],
        formula: [
          { tex: 'V \\approx \\sum_{i=1}^{n}2\\pi x_i f(x_i)\\,\\Delta x', highlight: true },
          { tex: (p) => `\\text{sum}=${f6(shellRiemann(curve, nAt(p)))}` },
          { tex: `\\text{integral}=${f6(exact)}` },
        ],
      },
      {
        id: 'custom-limit', label: '7', title: 'Let the thickness vanish',
        narration: 'Doubling n turns the shell sum into a stable numerical integral.',
        show: [OBJ.axes, OBJ.shells], camera: 'three-quarter', params: { n: 4 },
        autoplay: { param: 'n', from: 4, to: 64, steps: [4, 8, 16, 32, 64], delayMs: 800, durationMs: 6500 },
        formula: [
          { tex: `\\sum 2\\pi x_i f(x_i)\\,\\Delta x \\longrightarrow 2\\pi\\int_{${a}}^{${b}}x f(x)\\,dx`, highlight: true },
          { tex: (p) => `n=${nAt(p)},\\quad\\text{error}=${f4(relativeError(shellRiemann(curve, nAt(p)), exact))}\\%` },
        ],
      },
      {
        id: 'custom-formula', label: '8', title: 'Your shell integral',
        narration: 'Every factor now names a visible measurement from the rotating strip.',
        show: [OBJ.axes, OBJ.curve, OBJ.region], camera: 'front',
        formula: [
          { tex: `V=2\\pi\\int_{${a}}^{${b}}x f(x)\\,dx`, highlight: true },
          { tex: `V\\approx ${f6(exact)}` },
        ],
      },
    ],
  };
}
