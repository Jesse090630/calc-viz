/**
 * CONCEPT — 左右极限推导链
 *
 * 诊断:学生以为"求极限 = 把数代进去算"。一遇到该点无定义就卡死,
 * 因为在他们的模型里"函数在这一点的值"和"极限"是同一个东西。
 *
 * 看不见的量:两侧**分别**逼近的过程。
 * 主角:x 轴上那个向 a 移动的点。
 *
 * 落点(第 5 步):**极限不是函数值。** 洞还在那儿,极限照样存在。
 *
 * ⚠️ 与 HANDOFF 4.3 的一处刻意偏离:
 * 原分镜第 6–7 步用 x/|x| 作跳跃反例。它的图像在原点附近(y = ±1),
 * 现有 front 相机对准 (0.9, 2.0) 装不下,而新增相机预设要改 engine/types.ts
 * 的 CameraPreset —— 那是改引擎。于是换成**跳跃点仍在 x=1** 的分段函数,
 * 且让它**左侧行为与 g 完全相同**(都趋向 2)。
 * 结果反而更好:两条曲线之间唯一变化的只有右侧,变量控制干净,对比更锐利。
 */
import type { Chain } from '../../engine/types';
import { DISTANCES, JUMP, REMOVABLE, limitAt } from '../../math/limits';

const A = 1;
const f6 = (v: number | null): string => (v === null ? '\\text{undefined}' : v.toFixed(6));

export const OBJ = {
  axes: 'axes',
  curveG: 'curveG',
  curveJ: 'curveJ',
  hole: 'hole',
  leftProbe: 'leftProbe',
  rightProbe: 'rightProbe',
  limitMark: 'limitMark',
} as const;

/** 逼近距离滑块。用档位序号而不是距离本身,否则滑块在 0.001 那端几乎动不了。 */
const D_CONTROL = {
  param: 'd',
  label: 'distance from x = 1',
  min: 0,
  max: DISTANCES.length - 1,
  step: 1,
  format: (i: number) => String(DISTANCES[Math.round(i)] ?? 0.5),
} as const;

/** 滑块存的是档位序号,取值时换算成真实距离 */
const distOf = (p: Record<string, number>): number =>
  DISTANCES[Math.round(p.di ?? 0)] ?? DISTANCES[0]!;

export const LIMITS_CHAIN: Chain = {
  id: 'limits',
  title: 'Left and Right Limits',
  subtitle: 'Derivation chain · Limits',

  defaultParams: { di: 0, d: 0.5 },

  stages: [
    {
      id: 'hole',
      label: '1',
      title: 'A graph with a hole in it',
      narration:
        'This function is a straight line everywhere except at x = 1, where the formula turns into 0/0. There is no value there at all — that is what the open circle means.',
      show: [OBJ.axes, OBJ.curveG, OBJ.hole],
      camera: 'front',
      formula: [
        { tex: REMOVABLE.tex },
        { tex: `g(1) = \\dfrac{0}{0} \\;\\Rightarrow\\; \\text{undefined}`, highlight: true },
      ],
    },

    {
      id: 'from-left',
      label: '2',
      title: 'Walk in from the left',
      narration:
        'Never mind x = 1 itself. Come at it from below and watch the height of the graph. Step closer and the readout settles down.',
      show: [OBJ.axes, OBJ.curveG, OBJ.hole, OBJ.leftProbe],
      camera: 'front',
      params: { di: 0 },
      controls: [{ ...D_CONTROL, param: 'di' }],
      autoplay: { param: 'di', from: 0, to: 3, steps: [0, 1, 2, 3], delayMs: 800, durationMs: 4000 },
      formula: [
        { tex: (p) => `x = ${(A - distOf(p)).toFixed(3)}` },
        { tex: (p) => `g(x) = ${f6(REMOVABLE.at(A - distOf(p)))}`, highlight: true },
      ],
    },

    {
      id: 'from-right',
      label: '3',
      title: 'Now from the right',
      narration:
        'Same thing from above. The x values are different, the heights are different, but they are closing on the same place.',
      show: [OBJ.axes, OBJ.curveG, OBJ.hole, OBJ.rightProbe],
      camera: 'front',
      params: { di: 0 },
      controls: [{ ...D_CONTROL, param: 'di' }],
      autoplay: { param: 'di', from: 0, to: 3, steps: [0, 1, 2, 3], delayMs: 800, durationMs: 4000 },
      formula: [
        { tex: (p) => `x = ${(A + distOf(p)).toFixed(3)}` },
        { tex: (p) => `g(x) = ${f6(REMOVABLE.at(A + distOf(p)))}`, highlight: true },
      ],
    },

    {
      id: 'agree',
      label: '4',
      title: 'Both sides agree',
      narration:
        'Put the two walks side by side. They start far apart and squeeze together. Drag the distance down and the two readouts become the same number to as many digits as you like.',
      show: [OBJ.axes, OBJ.curveG, OBJ.hole, OBJ.leftProbe, OBJ.rightProbe],
      camera: 'front',
      params: { di: 0 },
      controls: [{ ...D_CONTROL, param: 'di' }],
      formula: [
        { tex: (p) => `\\text{from the left: } ${f6(REMOVABLE.at(A - distOf(p)))}` },
        { tex: (p) => `\\text{from the right: } ${f6(REMOVABLE.at(A + distOf(p)))}` },
        { tex: `\\lim_{x \\to 1} g(x) = 2`, highlight: true },
      ],
    },

    {
      id: 'not-the-value',
      label: '5',
      title: 'The limit is not the value',
      narration:
        'The hole never closed. The function still has no value at x = 1 — and the limit is still 2. A limit describes where the function is heading, which is a different question from where it is.',
      show: [OBJ.axes, OBJ.curveG, OBJ.hole, OBJ.limitMark],
      camera: 'front',
      formula: [
        { tex: `\\lim_{x \\to 1} g(x) = 2` },
        { tex: `g(1) \\text{ is undefined}` },
        { tex: `\\text{both statements are true at once}`, highlight: true },
      ],
    },

    {
      id: 'disagree',
      label: '6',
      title: 'Change only the right-hand side',
      narration:
        'Here is a different function. Its left half is exactly the one you just studied — same values, same approach to 2. Only the right half has been moved. Walk in from both sides again.',
      show: [OBJ.axes, OBJ.curveJ, OBJ.hole, OBJ.leftProbe, OBJ.rightProbe],
      camera: 'front',
      params: { di: 0 },
      controls: [{ ...D_CONTROL, param: 'di' }],
      autoplay: { param: 'di', from: 0, to: 3, steps: [0, 1, 2, 3], delayMs: 800, durationMs: 4000 },
      formula: [
        { tex: (p) => `\\text{from the left: } ${f6(JUMP.at(A - distOf(p)))}` },
        { tex: (p) => `\\text{from the right: } ${f6(JUMP.at(A + distOf(p)))}`, highlight: true },
      ],
    },

    {
      id: 'no-limit',
      label: '7',
      title: 'When the sides disagree, there is no limit',
      narration:
        'The left walk still arrives at 2. The right walk arrives at 3.5 and stays there. Getting closer does not help — there is no single number the function is heading for, so the limit simply does not exist.',
      show: [OBJ.axes, OBJ.curveJ, OBJ.hole],
      camera: 'front',
      formula: [
        { tex: `\\lim_{x \\to 1^-} J(x) = ${f6(limitAt(JUMP, A).left)}` },
        { tex: `\\lim_{x \\to 1^+} J(x) = ${f6(limitAt(JUMP, A).right)}` },
        { tex: `\\lim_{x \\to 1} J(x) \\text{ does not exist}`, highlight: true },
      ],
    },
  ],
};
