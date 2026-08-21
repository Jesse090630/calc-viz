/**
 * CONCEPT — Disk Method 推导链
 *
 * ⚠️ 这条链刻意用**和 Shell 完全相同的立体**:同一条抛物线、同样绕 y 轴。
 *    唯一的区别是切法 —— 竖着切得到壳,横着切得到圆盘。
 *
 * 诊断(为什么要有这条链):
 *   学生学完两个方法后最常问的是"我怎么知道该用哪个"。
 *   教科书的回答通常是一张对照表(背)。这条链给的是另一个回答:
 *   **先看你切出来的那一片是什么形状**,形状决定公式,方法名只是事后取的标签。
 *
 * 落点(这条链真正的"啊哈"):
 *   同一个立体,Shell 的黎曼和有 O(n⁻²) 误差,Disk 的黎曼和【任意 n 都精确】。
 *   不是哪个方法更准,而是切法决定了被积函数的次数:
 *     Shell → 2πx(4−x²) 是三次;  Disk → π(4−y) 是一次,中点法对一次函数零误差。
 *   而且圆盘堆出来明明是个阶梯、形状肉眼可见地不对,体积却分毫不差 ——
 *   高估与低估严格抵消。这一点几乎没有教材会讲。
 */
import type { Chain } from '../../engine/types';
import { PARABOLA_INVERSE } from '../../math/curves';
import { relativeError } from '../../math/riemann';
import { diskRiemann, diskVolumeExact, shellRiemann } from '../../math/solids';
import { PARABOLA_DOWN } from '../../math/curves';

const CURVE = PARABOLA_INVERSE; // x = √(4 − y),y ∈ [0, 4]
const EXACT = diskVolumeExact(CURVE); // 8π

/** 场景对象 id */
export const OBJ = {
  axes: 'axes',
  curve: 'curve',
  region: 'region',
  slab: 'slab',
  disk: 'disk',
  dimLabels: 'dimLabels',
  disks: 'disks',
  solid: 'solid',
} as const;

const n2 = (v: number): string => v.toFixed(2);
const n4 = (v: number): string => v.toFixed(4);

export const DISK_METHOD_CHAIN: Chain = {
  id: 'disk-method',
  title: 'The Disk Method',
  subtitle: 'Derivation chain · Disk Method',

  defaultParams: { y0: 1.4, dy: 0.4, theta: Math.PI * 2, n: 8 },

  stages: [
    {
      id: 'same-region',
      label: '1',
      title: 'The same region as before',
      narration:
        'This is the exact region the Shell Method used, and we will spin it around the exact same axis. Nothing about the solid changes. The only thing we are going to change is which way we slice it.',
      altText: 'The same downward parabola and shaded region appear beside the y-axis before any rotation begins.',
      show: [OBJ.axes, OBJ.curve, OBJ.region],
      camera: 'front',
    },

    {
      id: 'slice-flat',
      label: '2',
      title: 'Slice horizontally instead',
      narration:
        'Last time we cut vertical strips. This time cut a horizontal one, at height y and of thickness Δy. Its length reaches from the y-axis out to the curve — so that length is the radius at this height.',
      altText: 'One thin horizontal slice reaches from the y-axis to the curve, showing a radius and adjustable thickness.',
      show: [OBJ.axes, OBJ.curve, OBJ.region, OBJ.slab],
      camera: 'front',
      controls: [
        { param: 'y0', label: 'height  y', min: 0.25, max: 3.7, step: 0.01 },
        { param: 'dy', label: 'thickness  Δy', min: 0.1, max: 0.8, step: 0.01 },
      ],
      formula: [
        { tex: (p) => `y = ${n2(p.y0 ?? 0)}` },
        { tex: (p) => `r = \\sqrt{4-y} = ${n2(CURVE.f(p.y0 ?? 0))}`, highlight: true },
        { tex: (p) => `\\Delta y = ${n2(p.dy ?? 0)}` },
      ],
    },

    {
      id: 'sweep',
      label: '3',
      title: 'Spin it — you get a disk, not a shell',
      narration:
        'Camera first, then the strip turns. Because this strip touches the axis, it does not sweep out a hollow tube. It sweeps out a solid coin: a disk of radius r and thickness Δy.',
      altText: 'From an angled view, the horizontal slice rotates around the y-axis and becomes a solid disk with no central hole.',
      show: [OBJ.axes, OBJ.slab, OBJ.disk],
      camera: 'three-quarter',
      controls: [{ param: 'theta', label: 'sweep angle  θ', min: 0, max: Math.PI * 2, step: 0.01 }],
      autoplay: { param: 'theta', from: 0, to: Math.PI * 2, delayMs: 1150, durationMs: 2200 },
      formula: [{ tex: (p) => `\\theta = ${n2((p.theta ?? 0) / Math.PI)}\\pi`, highlight: true }],
    },

    {
      id: 'dims',
      label: '4',
      title: 'A coin has an easy volume',
      narration:
        'No unrolling needed this time. A disk is a circle of area πr² given a thickness Δy — and you already knew the area of a circle before you ever met calculus.',
      altText: 'A single solid disk is labeled with its radius, circular face area, and thickness.',
      show: [OBJ.axes, OBJ.disk, OBJ.dimLabels],
      camera: 'three-quarter',
      formula: [
        { tex: (p) => `r = ${n2(CURVE.f(p.y0 ?? 0))}` },
        { tex: (p) => `\\text{area} = \\pi r^2 = ${n2(Math.PI * CURVE.f(p.y0 ?? 0) ** 2)}` },
        {
          tex: (p) =>
            `\\Delta V = \\pi r^{2}\\,\\Delta y = ${n2(Math.PI * CURVE.f(p.y0 ?? 0) ** 2 * (p.dy ?? 0))}`,
          highlight: true,
        },
      ],
    },

    {
      id: 'stack',
      label: '5',
      title: 'Stack them up',
      narration:
        'Slice the whole region into n horizontal strips and spin every one. The disks stack into something that is clearly a staircase, not a smooth bowl. Hold on to that — it matters in a moment.',
      altText: 'A stack of disks with changing radii forms a visibly stepped approximation of the rotated bowl-shaped solid.',
      show: [OBJ.axes, OBJ.disks],
      camera: 'three-quarter',
      controls: [{ param: 'n', label: 'number of disks  n', min: 1, max: 40, step: 1 }],
      formula: [
        { tex: 'V \\approx \\sum_{i=1}^{n} \\pi\\, r(y_i)^{2}\\,\\Delta y', highlight: true },
        { tex: (p) => `\\text{sum} = ${diskRiemann(CURVE, Math.round(p.n ?? 1)).toFixed(6)}` },
        { tex: `\\text{exact} = 8\\pi = ${EXACT.toFixed(6)}` },
      ],
    },

    {
      id: 'exact',
      label: '5b',
      title: 'The shape is wrong. The number is not.',
      narration:
        'Drag n down to 2. The staircase looks nothing like the solid — yet the volume is already exact, to every digit, and stays exact for every n. Each disk overshoots below its midpoint by precisely what it undershoots above.',
      altText: 'A very coarse stack of disks remains visibly stepped even though the displayed total volume is exact.',
      show: [OBJ.axes, OBJ.disks],
      camera: 'three-quarter',
      controls: [{ param: 'n', label: 'number of disks  n', min: 1, max: 40, step: 1 }],
      formula: [
        { tex: (p) => `n = ${Math.round(p.n ?? 1)}` },
        { tex: (p) => `\\text{sum} = ${diskRiemann(CURVE, Math.round(p.n ?? 1)).toFixed(9)}` },
        {
          tex: (p) =>
            `\\text{error} = ${n4(relativeError(diskRiemann(CURVE, Math.round(p.n ?? 1)), EXACT))}\\%`,
          highlight: true,
        },
      ],
    },

    {
      id: 'why',
      label: '6',
      title: 'Why Shell had an error and Disk does not',
      narration:
        'It is not that one method is more accurate. Slicing decides what you end up integrating. Vertical strips gave a cubic; horizontal ones give something linear, and the midpoint rule is exact on straight lines. The method is a consequence of the cut, not a rule to memorise.',
      altText: 'The disk stack stays visible while the panel contrasts the linear disk integrand with the cubic shell integrand.',
      show: [OBJ.axes, OBJ.disks],
      camera: 'three-quarter',
      formula: [
        {
          tex: (p) =>
            `\\text{Shell: } 2\\pi x(4-x^{2}) \\text{ — cubic, error } ${n4(relativeError(shellRiemann(PARABOLA_DOWN, Math.round(p.n ?? 8)), EXACT))}\\%`,
        },
        {
          tex: (p) =>
            `\\text{Disk: } \\pi(4-y) \\text{ — linear, error } ${n4(relativeError(diskRiemann(CURVE, Math.round(p.n ?? 8)), EXACT))}\\%`,
          highlight: true,
        },
      ],
    },

    {
      id: 'formula',
      label: '7',
      title: 'Same solid, same 8π',
      narration:
        'Two completely different integrals, in two different variables, describing the same object — and they agree. That agreement is not a coincidence to be impressed by; it is the check you should run every time you set one of these up.',
      altText: 'The view returns to the original shaded region as the disk and shell integrals are shown equal to the same volume.',
      show: [OBJ.axes, OBJ.curve, OBJ.region],
      camera: 'front',
      formula: [
        { tex: 'V = \\pi\\int_{0}^{4}\\left(4-y\\right)dy = 8\\pi' },
        { tex: '\\;\\;\\;\\;= 2\\pi\\int_{0}^{2} x\\left(4-x^{2}\\right)dx' },
        { tex: `\\;\\;\\;\\;= 8\\pi \\approx ${EXACT.toFixed(4)}`, highlight: true },
      ],
    },
  ],
};
