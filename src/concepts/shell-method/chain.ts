/**
 * CONCEPT — Shell Method 推导链(旗舰)
 *
 * 这是纯数据。任何数值都调用 src/math/,本文件里不允许出现裸算式(CLAUDE.md 禁止 2)。
 *
 * 诊断(为什么要有这条链):
 *   学生的真实卡点不是"记不住 2πrh",是【看不出 2πx 是一个圆的周长】。
 *   只要他一眼看出"那个 2πx 就是壳绕一圈的长度",公式自己就站起来了。
 *
 * 例子:f(x) = 4 − x²,x ∈ [0,2],绕 y 轴 → V = 8π。
 * 选它的理由:区域简单、立体好看、答案是干净的 8π(方便核对)。
 */
import type { Chain } from '../../engine/types';
import { PARABOLA_DOWN } from '../../math/curves';
import { circumference } from '../../math/geometry';
import { relativeError } from '../../math/riemann';
import {
  shellRiemann,
  shellVolumeExact,
  slabVolume,
  ringVolume,
} from '../../math/solids';

const CURVE = PARABOLA_DOWN;
const EXACT = shellVolumeExact(CURVE);

/** 场景对象 id —— 由本概念自行约定,引擎只负责搬运 */
export const OBJ = {
  axes: 'axes',
  curve: 'curve',
  region: 'region',
  rect: 'rect',
  shell: 'shell',
  dimLabels: 'dimLabels',
  circRing: 'circRing',
  flatLabels: 'flatLabels',
  shells: 'shells',
} as const;

const n2 = (v: number): string => v.toFixed(2);
const n4 = (v: number): string => v.toFixed(4);

export const SHELL_METHOD_CHAIN: Chain = {
  id: 'shell-method',
  title: 'The Shell Method',
  subtitle: 'Derivation chain · Shell Method',

  defaultParams: { x0: 1.2, dx: 0.3, theta: Math.PI * 2, bend: 1, n: 8 },

  stages: [
    {
      id: 'region',
      label: '1',
      title: 'The region',
      narration:
        'We start with the region bounded by y = 4 − x², the x-axis and the y-axis. Nothing is rotating yet — just look at the flat shape we are about to spin.',
      show: [OBJ.axes, OBJ.curve, OBJ.region],
      camera: 'front',
    },

    {
      id: 'strip',
      label: '2',
      title: 'One thin strip',
      narration:
        'Pull one vertical rectangle out of the region. Its position is x, its width is Δx, and its height is not free — it is forced to be f(x). Drag the sliders and watch the height follow the curve.',
      show: [OBJ.axes, OBJ.curve, OBJ.region, OBJ.rect],
      camera: 'front',
      params: { theta: Math.PI * 2, bend: 1 },
      controls: [
        { param: 'x0', label: 'position  x', min: 0.15, max: 1.9, step: 0.01 },
        { param: 'dx', label: 'width  Δx', min: 0.06, max: 0.6, step: 0.01 },
      ],
      formula: [
        { tex: (p) => `x = ${n2(p.x0 ?? 0)}` },
        { tex: (p) => `h = f(x) = ${n2(CURVE.f(p.x0 ?? 0))}`, highlight: true },
        { tex: (p) => `\\Delta x = ${n2(p.dx ?? 0)}` },
      ],
    },

    {
      id: 'sweep',
      label: '3',
      title: 'Sweep it around the y-axis',
      narration:
        'The camera moves first, then the rectangle starts turning — never both at once, or you lose track of what is moving. Watch the rectangle sweep through space. The solid it leaves behind is a cylindrical shell.',
      show: [OBJ.axes, OBJ.curve, OBJ.rect, OBJ.shell],
      camera: 'three-quarter',
      params: { bend: 1 },
      controls: [{ param: 'theta', label: 'sweep angle  θ', min: 0, max: Math.PI * 2, step: 0.01 }],
      autoplay: { param: 'theta', from: 0, to: Math.PI * 2, delayMs: 1150, durationMs: 2200 },
      formula: [
        {
          tex: (p) => `\\theta = ${n2((p.theta ?? 0) / Math.PI)}\\pi`,
          highlight: true,
        },
      ],
    },

    {
      id: 'dims',
      label: '4',
      title: 'What are its dimensions?',
      narration:
        'Three measurements describe this shell completely, and all three were already visible in the flat rectangle. The one thing that is new is the distance the rectangle travelled: one full circle of radius x.',
      show: [OBJ.axes, OBJ.shell, OBJ.dimLabels, OBJ.circRing],
      camera: 'three-quarter',
      params: { theta: Math.PI * 2, bend: 1 },
      formula: [
        { tex: (p) => `\\text{radius } r = x = ${n2(p.x0 ?? 0)}` },
        { tex: (p) => `\\text{height } h = f(x) = ${n2(CURVE.f(p.x0 ?? 0))}` },
        { tex: (p) => `\\text{thickness } t = \\Delta x = ${n2(p.dx ?? 0)}` },
        {
          tex: (p) => `\\text{circumference } C = 2\\pi x = ${n2(circumference(p.x0 ?? 0))}`,
          highlight: true,
        },
      ],
    },

    {
      id: 'unroll',
      label: '5',
      title: 'Unroll it',
      narration:
        'Cut the shell along one vertical seam and flatten it. It becomes a slab — and a slab is something we already know how to measure: length × height × thickness.',
      // 刻意不显示 axes:摊平后的板已经不绕 y 轴了,再画一根轴穿过它是误导
      show: [OBJ.shell, OBJ.flatLabels],
      camera: 'wide', // 摊平后长 2πx ≈ 7.5,three-quarter 会把右端裁掉
      params: { theta: Math.PI * 2 },
      controls: [{ param: 'bend', label: 'unroll', min: 0, max: 1, step: 0.01 }],
      autoplay: { param: 'bend', from: 1, to: 0, delayMs: 900, durationMs: 2000 },
      formula: [
        {
          tex: '\\Delta V \\approx \\underbrace{2\\pi x}_{\\text{length}}\\cdot\\underbrace{f(x)}_{\\text{height}}\\cdot\\underbrace{\\Delta x}_{\\text{thickness}}',
          highlight: true,
        },
      ],
    },

    {
      id: 'exact',
      label: '5b',
      title: 'That was not an approximation',
      narration:
        'Textbooks call 2πrhΔx an approximation of the shell. It is not. With r measured at the middle of the shell it equals the true ring volume exactly — compare the two numbers. The only thing we approximated is treating the height as constant across the thickness.',
      // 刻意不显示 axes:摊平后的板已经不绕 y 轴了,再画一根轴穿过它是误导
      show: [OBJ.shell, OBJ.flatLabels],
      camera: 'wide', // 摊平后长 2πx ≈ 7.5,three-quarter 会把右端裁掉
      params: { theta: Math.PI * 2, bend: 0 },
      formula: [
        { tex: '2\\pi r h\\,\\Delta x \\;=\\; \\pi\\left(R^{2}-r^{2}\\right)h', highlight: true },
        {
          tex: (p) =>
            `\\text{slab} = ${slabVolume({ x: p.x0 ?? 0, dx: p.dx ?? 0, h: CURVE.f(p.x0 ?? 0) }).toFixed(9)}`,
        },
        {
          tex: (p) =>
            `\\text{ring} = ${ringVolume({ x: p.x0 ?? 0, dx: p.dx ?? 0, h: CURVE.f(p.x0 ?? 0) }).toFixed(9)}`,
        },
      ],
    },

    {
      id: 'many',
      label: '6',
      title: 'Many shells',
      narration:
        'Slice the region into n rectangles and spin all of them. Together the shells fill the solid — but not perfectly, because each one pretends its height is constant. Drag n and watch the gap close.',
      show: [OBJ.axes, OBJ.curve, OBJ.shells],
      camera: 'three-quarter',
      controls: [{ param: 'n', label: 'number of shells  n', min: 1, max: 40, step: 1 }],
      formula: [
        { tex: 'V \\approx \\sum_{i=1}^{n} 2\\pi x_i\\, f(x_i)\\,\\Delta x', highlight: true },
        { tex: (p) => `\\text{sum} = ${shellRiemann(CURVE, Math.round(p.n ?? 1)).toFixed(6)}` },
        { tex: `\\text{exact} = 8\\pi = ${EXACT.toFixed(6)}` },
        {
          tex: (p) =>
            `\\text{error} = ${n4(relativeError(shellRiemann(CURVE, Math.round(p.n ?? 1)), EXACT))}\\%`,
        },
      ],
    },

    {
      id: 'limit',
      label: '7',
      title: 'Let Δx → 0',
      narration:
        'Every time n doubles the error drops to about a quarter. The sum is converging, and it is converging to one specific number. A sum of infinitely many infinitely thin shells is exactly what an integral is.',
      show: [OBJ.axes, OBJ.shells],
      camera: 'three-quarter',
      params: { n: 4 },
      controls: [{ param: 'n', label: 'number of shells  n', min: 1, max: 64, step: 1 }],
      // 刻意用倍增档位而不是连续爬升:这一步要讲的就是"n 翻倍 → 误差缩到 1/4",
      // 连续变化会把这个倍增关系糊掉。顺带也避免了每帧重建几十个几何体。
      autoplay: {
        param: 'n',
        from: 4,
        to: 64,
        steps: [4, 8, 16, 32, 64],
        delayMs: 800,
        durationMs: 6500,
      },
      formula: [
        {
          tex: '\\sum_{i=1}^{n} 2\\pi x_i f(x_i)\\,\\Delta x \\;\\longrightarrow\\; 2\\pi\\!\\int_{0}^{2}\\! x\\,f(x)\\,dx',
          highlight: true,
        },
        {
          tex: (p) =>
            `n = ${Math.round(p.n ?? 1)},\\quad \\text{error} = ${n4(relativeError(shellRiemann(CURVE, Math.round(p.n ?? 1)), EXACT))}\\%`,
        },
      ],
    },

    {
      id: 'formula',
      label: '8',
      title: 'The formula',
      narration:
        'Every symbol on this line is something you watched happen. 2πx is the circle the rectangle traced. f(x) is its height. dx is what Δx became. Nothing here was memorised.',
      show: [OBJ.axes, OBJ.curve, OBJ.region],
      camera: 'front',
      formula: [
        { tex: 'V = 2\\pi\\int_{0}^{2} x\\left(4-x^{2}\\right)dx' },
        { tex: '\\;\\;= 2\\pi\\Big[2x^{2}-\\tfrac{x^{4}}{4}\\Big]_{0}^{2}' },
        { tex: `\\;\\;= 8\\pi \\approx ${EXACT.toFixed(4)}`, highlight: true },
      ],
    },
  ],
};
