/** 用户半径函数的 Disk Method 推导链。 */
import type { Chain } from '../../engine/types';
import { circleArea } from '../../math/geometry';
import { partitionWidth, relativeError, sampleX } from '../../math/riemann';
import { diskRiemann, diskVolume, diskVolumeExact } from '../../math/solids';
import type { CurveSpec } from '../../math/types';
import { OBJ } from './chain';

const f2 = (value: number): string => value.toFixed(2);
const f4 = (value: number): string => value.toFixed(4);
const f6 = (value: number): string => value.toFixed(6);

export function makeCustomDiskChain(curve: CurveSpec): Chain {
  const [a, b] = curve.domain;
  const y0 = sampleX(a, b, 1, 0, 'mid');
  const dy = partitionWidth(curve.domain, 6);
  const yMin = sampleX(a, b, 20, 1, 'left');
  const yMax = sampleX(a, b, 20, 19, 'left');
  const exact = diskVolumeExact(curve);
  const valueAt = (params: Readonly<Record<string, number>>): number => params.y0 ?? y0;
  const widthAt = (params: Readonly<Record<string, number>>): number => params.dy ?? dy;
  const nAt = (params: Readonly<Record<string, number>>): number => Math.max(1, Math.round(params.n ?? 8));
  const radiusAt = (params: Readonly<Record<string, number>>): number => curve.f(valueAt(params));

  return {
    id: 'disk-method-custom',
    title: 'Your Radius → Disk Method',
    subtitle: 'Derivation chain · Custom Disk Method',
    defaultParams: { y0, dy, theta: Math.PI * 2, n: 8 },
    stages: [
      {
        id: 'custom-profile', label: '1', title: 'Your radius profile',
        narration: 'Your function gives the radius at every level of the solid.',
        show: [OBJ.axes, OBJ.curve, OBJ.region], camera: 'front',
        formula: [{ tex: curve.tex, highlight: true }, { tex: `${a} \\le t \\le ${b}` }],
      },
      {
        id: 'custom-slice', label: '2', title: 'One horizontal slice',
        narration: 'A horizontal segment of radius r(t) and thickness Δt will become one disk.',
        show: [OBJ.axes, OBJ.curve, OBJ.region, OBJ.slab], camera: 'front',
        controls: [
          { param: 'y0', label: 'level  t', min: yMin, max: yMax, step: partitionWidth(curve.domain, 100) },
          { param: 'dy', label: 'thickness  Δt', min: partitionWidth(curve.domain, 40), max: partitionWidth(curve.domain, 3), step: partitionWidth(curve.domain, 100) },
        ],
        formula: [
          { tex: (p) => `t=${f2(valueAt(p))}` },
          { tex: (p) => `r(t)=${f2(radiusAt(p))}`, highlight: true },
          { tex: (p) => `\\Delta t=${f2(widthAt(p))}` },
        ],
      },
      {
        id: 'custom-sweep', label: '3', title: 'Spin it into a disk',
        narration: 'After the camera settles, the slice sweeps out a solid coin with no hollow center.',
        show: [OBJ.axes, OBJ.slab, OBJ.disk], camera: 'three-quarter',
        controls: [{ param: 'theta', label: 'sweep angle  θ', min: 0, max: Math.PI * 2, step: 0.01 }],
        autoplay: { param: 'theta', from: 0, to: Math.PI * 2, delayMs: 1150, durationMs: 2200 },
        formula: [{ tex: (p) => `\\theta=${f2((p.theta ?? 0) / Math.PI)}\\pi`, highlight: true }],
      },
      {
        id: 'custom-dims', label: '4', title: 'Measure the coin',
        narration: 'The slice has circle area πr² and thickness Δt, so their product is its small volume.',
        show: [OBJ.axes, OBJ.disk, OBJ.dimLabels], camera: 'three-quarter',
        formula: [
          { tex: (p) => `r=${f2(radiusAt(p))}` },
          { tex: (p) => `\\pi r^2=${f2(circleArea(radiusAt(p)))}` },
          { tex: (p) => `\\Delta V=${f2(diskVolume({ t: valueAt(p), r: radiusAt(p), dt: widthAt(p) }))}`, highlight: true },
        ],
      },
      {
        id: 'custom-stack', label: '5', title: 'Stack the disks',
        narration: 'Midpoint disks form a stepped solid whose total volume is a Riemann sum.',
        show: [OBJ.axes, OBJ.disks], camera: 'three-quarter', params: { n: 4 },
        controls: [{ param: 'n', label: 'number of disks  n', min: 1, max: 40, step: 1 }],
        formula: [
          { tex: 'V \\approx \\sum_{i=1}^{n}\\pi r(t_i)^2\\,\\Delta t', highlight: true },
          { tex: (p) => `\\text{sum}=${f6(diskRiemann(curve, nAt(p)))}` },
          { tex: `\\text{integral}=${f6(exact)}` },
        ],
      },
      {
        id: 'custom-refine', label: '6', title: 'Refine the stack',
        narration: 'More disks reduce the gap between the stepped approximation and the independent numerical integral.',
        show: [OBJ.axes, OBJ.disks], camera: 'three-quarter',
        controls: [{ param: 'n', label: 'number of disks  n', min: 1, max: 64, step: 1 }],
        formula: [
          { tex: (p) => `D_{${nAt(p)}}=${f6(diskRiemann(curve, nAt(p)))}`, highlight: true },
          { tex: (p) => `\\text{error}=${f4(relativeError(diskRiemann(curve, nAt(p)), exact))}\\%` },
        ],
      },
      {
        id: 'custom-limit', label: '7', title: 'Let the disks become thin',
        narration: 'Doubling n makes the disk sum settle onto one numerical volume.',
        show: [OBJ.axes, OBJ.disks], camera: 'three-quarter', params: { n: 4 },
        autoplay: { param: 'n', from: 4, to: 64, steps: [4, 8, 16, 32, 64], delayMs: 800, durationMs: 6200 },
        formula: [
          { tex: `\\sum \\pi r(t_i)^2\\,\\Delta t \\longrightarrow \\pi\\int_{${a}}^{${b}}r(t)^2\\,dt`, highlight: true },
          { tex: (p) => `n=${nAt(p)},\\quad\\text{error}=${f4(relativeError(diskRiemann(curve, nAt(p)), exact))}\\%` },
        ],
      },
      {
        id: 'custom-formula', label: '8', title: 'Your disk integral',
        narration: 'The visible radius and thickness now account for every factor in the integral.',
        show: [OBJ.axes, OBJ.curve, OBJ.region], camera: 'front',
        formula: [
          { tex: `V=\\pi\\int_{${a}}^{${b}}r(t)^2\\,dt`, highlight: true },
          { tex: `V\\approx ${f6(exact)}` },
        ],
      },
    ],
  };
}
