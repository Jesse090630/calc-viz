/**
 * CONCEPT — 为什么 ∫dx/x 偏偏是 ln
 *
 * 诊断:学生的原话是「所有幂都给 x^(n+1)/(n+1),凭什么 n = −1 给一个
 * 完全不同种类的函数?」教科书直接换一个公式,于是它只能被当特例背下来。
 *
 * 真相:幂法则在 n = −1 处**不是给出另一个答案,是分母为 0、公式坏掉了**。
 *
 * 看不见的量:`1/x` 在「横拉 b 倍、纵压 1/b 倍」下**回到自己**这件事。
 * 主角:`[1,2]` 下的那块面积 —— 它被拉伸后正好盖住 `[2,4]`。
 *
 * 落点(第 5–7 步):面积因此把乘法变成加法,而只有对数会这样。
 * 底数不是选出来的,是被 `A(t)=1` 定出来的。
 *
 * ⚠️ 显示坐标:`x_display = 0.85·x`,`y_display = 3.2/x`。
 * 纯缩放、**没有平移** —— 因为「横拉 b」必须是关于原点的伸缩,
 * 一旦平移,x→bx 就不再对应显示坐标里的伸缩,整条链的支点就塌了。
 * 面积被统一乘上 0.85×3.2,相等关系因此原样保留。刻度按真值标注。
 */
import type { Chain } from '../../engine/types';
import {
  areaUnderReciprocal,
  baseWhereAreaIsOne,
  multiplicativeDefect,
  powerAntiderivativeAt,
} from '../../math/logIntegral';

export const OBJ = {
  axes: 'axes',
  powerCurve: 'powerCurve',
  powerRegion: 'powerRegion',
  reciprocal: 'reciprocal',
  regionFirst: 'regionFirst',
  regionSecond: 'regionSecond',
  stretchGhost: 'stretchGhost',
  eMark: 'eMark',
  areaReadout: 'areaReadout',
} as const;

const LIMIT_VALUE = areaUnderReciprocal(2)!; // 0.693147…,由数值积分给出
const E_BASE = baseWhereAreaIsOne();

const f6 = (v: number | null): string => (v === null ? '\\text{undefined}' : v.toFixed(6));
const nOf = (p: Record<string, number>): number => p.n ?? -0.5;
const bOf = (p: Record<string, number>): number => p.b ?? 1;
const tOf = (p: Record<string, number>): number => p.t ?? 2;

/** 第 2 步的 n 档位:逼近 −1 但最后一档正好落在上面 */
const N_STEPS = [-0.5, -0.9, -0.99, -0.999, -0.9999, -1] as const;

const N_CONTROL = {
  param: 'ni',
  label: 'exponent  n',
  min: 0,
  max: N_STEPS.length - 1,
  step: 1,
  format: (i: number) => String(N_STEPS[Math.round(i)] ?? -0.5),
} as const;

const nAt = (p: Record<string, number>): number => N_STEPS[Math.round(p.ni ?? 0)] ?? -0.5;

export const LOG_INTEGRAL_CHAIN: Chain = {
  id: 'log-integral',
  title: 'Why ∫dx/x Is a Logarithm',
  subtitle: 'Derivation chain · The Natural Log',

  defaultParams: { ni: 0, n: -0.5, b: 1, t: 2 },

  stages: [
    {
      id: 'hole-in-the-rule',
      label: '1',
      title: 'The power rule has a hole in it',
      narration:
        'One formula covers every exponent — until the denominator n + 1 becomes zero.',
      altText:
        'A table of antiderivatives for several exponents, with the n plus one denominator highlighted in red at the exponent negative one.',
      show: [OBJ.axes, OBJ.powerCurve, OBJ.powerRegion],
      camera: 'front',
      params: { ni: 0 },
      formula: [
        { tex: `\\int x^{n}\\,dx = \\frac{x^{n+1}}{n+1}` },
        { tex: `n = 2,\\;1,\\;0,\\;-2 \\;\\;\\checkmark` },
        { tex: `n = -1 \\;\\Rightarrow\\; \\text{denominator } n+1 = 0`, highlight: true },
      ],
    },

    {
      id: 'watch-it-break',
      label: '2',
      title: 'Watch the formula break',
      narration:
        'Push the exponent toward negative one and the definite integral keeps answering, right up to the moment it cannot.',
      altText:
        'The shaded region under x to the n between one and two changes shape as the exponent slides toward negative one.',
      show: [OBJ.axes, OBJ.powerCurve, OBJ.powerRegion, OBJ.areaReadout],
      camera: 'front',
      params: { ni: 0 },
      controls: [N_CONTROL],
      autoplay: {
        param: 'ni',
        from: 0,
        to: 5,
        steps: [0, 1, 2, 3, 4, 5],
        delayMs: 800,
        durationMs: 6000,
      },
      formula: [
        { tex: (p) => `n = ${N_STEPS[Math.round(p.ni ?? 0)]}` },
        {
          tex: (p) => `\\int_1^2 x^{n}dx = \\frac{2^{\\,n+1}-1}{n+1} = ${f6(powerAntiderivativeAt(nAt(p), 2))}`,
          highlight: true,
        },
      ],
    },

    {
      id: 'zero-over-zero',
      label: '3',
      title: 'It is 0/0, not nonsense',
      narration:
        'Both the numerator and the denominator hit zero together, which is the same removable hole the limits chain opened with.',
      altText:
        'The exponent sits exactly at negative one and the integral readout reports an undefined zero over zero result.',
      show: [OBJ.axes, OBJ.powerCurve, OBJ.powerRegion],
      camera: 'front',
      params: { ni: 5 },
      formula: [
        { tex: `n = -1 \\;\\Rightarrow\\; \\frac{2^{0}-1}{0} = \\frac{0}{0}` },
        { tex: `\\text{undefined — but the values were converging}` },
        { tex: `\\lim_{n \\to -1} \\int_1^2 x^{n}dx = ${LIMIT_VALUE.toFixed(6)}`, highlight: true },
      ],
    },

    {
      id: 'that-number',
      label: '4',
      title: 'So what is that number?',
      narration:
        'It is the area under one over x from one to two — the very integral the power rule refused to do.',
      altText:
        'The curve y equals one over x with the region from one to two shaded, its area matching the limit found in the previous step.',
      show: [OBJ.axes, OBJ.reciprocal, OBJ.regionFirst, OBJ.areaReadout],
      camera: 'front',
      formula: [
        { tex: `A(t) = \\int_1^{t} \\frac{dx}{x}` },
        { tex: `A(2) = ${LIMIT_VALUE.toFixed(6)}`, highlight: true },
        { tex: `\\text{the same number as step 3}` },
      ],
    },

    {
      id: 'stretch-squash',
      label: '5',
      title: 'Stretch it and squash it',
      narration:
        'Widen the block by a factor of b and flatten it by the same factor: it lands exactly on the next block.',
      altText:
        'The shaded block between one and two stretches horizontally and compresses vertically until it coincides with the block between two and four.',
      show: [OBJ.axes, OBJ.reciprocal, OBJ.regionFirst, OBJ.stretchGhost, OBJ.regionSecond],
      camera: 'front',
      params: { b: 1 },
      controls: [{ param: 'b', label: 'stretch  b', min: 1, max: 2, step: 0.01 }],
      autoplay: { param: 'b', from: 1, to: 2, delayMs: 900, durationMs: 2600 },
      formula: [
        { tex: `x \\mapsto bx, \\quad y \\mapsto y/b` },
        { tex: `\\text{area}[1,2] = ${LIMIT_VALUE.toFixed(6)}` },
        {
          tex: `\\text{area}[2,4] = ${(areaUnderReciprocal(4)! - areaUnderReciprocal(2)!).toFixed(6)}`,
          highlight: true,
        },
        { tex: `\\text{wider, shorter, identical}` },
      ],
    },

    {
      id: 'times-becomes-plus',
      label: '6',
      title: 'Area turns × into +',
      narration:
        'Because every stretch copies one block onto the next, walking to bc costs exactly what walking to b and to c cost separately.',
      altText:
        'Two shaded blocks under one over x sit side by side, their combined area equal to the single block reaching the product.',
      show: [OBJ.axes, OBJ.reciprocal, OBJ.regionFirst, OBJ.regionSecond, OBJ.areaReadout],
      camera: 'front',
      params: { t: 4 },
      controls: [{ param: 't', label: 'walk out to  t', min: 1.2, max: 4, step: 0.01 }],
      formula: [
        { tex: `\\int_b^{bc}\\frac{dx}{x} \\;\\overset{x=bu}{=}\\; \\int_1^{c}\\frac{b\\,du}{bu} = \\int_1^{c}\\frac{du}{u}` },
        { tex: `A(bc) = A(b) + A(c)`, highlight: true },
        {
          tex: `A(2)+A(4) = ${(areaUnderReciprocal(2)! + areaUnderReciprocal(4)!).toFixed(6)} = A(8)`,
        },
        { tex: `\\text{residual} = ${Math.abs(multiplicativeDefect(2, 4)!).toExponential(1)}` },
      ],
    },

    {
      id: 'only-logs',
      label: '7',
      title: 'Only logarithms do that',
      narration:
        'A function turning multiplication into addition is a logarithm, and its base is pinned by asking where the area first reaches one.',
      altText:
        'The region under one over x extends until its area equals one, marking the base e on the horizontal axis.',
      show: [OBJ.axes, OBJ.reciprocal, OBJ.regionFirst, OBJ.eMark, OBJ.areaReadout],
      camera: 'front',
      params: { t: 2.718281828459045 },
      controls: [{ param: 't', label: 'walk out to  t', min: 1.2, max: 4, step: 0.01 }],
      formula: [
        { tex: `f(bc) = f(b)+f(c) \\;\\Rightarrow\\; f = \\log` },
        { tex: (p) => `A(${tOf(p).toFixed(3)}) = ${f6(areaUnderReciprocal(tOf(p)))}` },
        { tex: `A(t) = 1 \\;\\Rightarrow\\; t = ${E_BASE.toFixed(6)}`, highlight: true },
      ],
    },

    {
      id: 'that-is-why',
      label: '8',
      title: 'That is why it is ln',
      narration:
        'The gap in the power rule is filled by the one function whose defining property the area already had.',
      altText:
        'The antiderivative table returns with the exponent negative one row now filled in with the natural logarithm.',
      show: [OBJ.axes, OBJ.reciprocal, OBJ.regionFirst],
      camera: 'front',
      formula: [
        { tex: `\\int x^{n}dx = \\frac{x^{n+1}}{n+1} \\quad (n \\neq -1)` },
        { tex: `\\int x^{-1}dx = \\ln|x| + C`, highlight: true },
        { tex: `\\ln 2 = ${LIMIT_VALUE.toFixed(6)}` },
      ],
    },
  ],
};

/** 场景层要用的显示映射,导出给 Scene 与测试共用 */
export const DISPLAY = {
  /** 纯缩放,**不许加平移** —— 平移会破坏 x→bx 的伸缩结构 */
  xScale: 0.85,
  yScale: 3.2,
  toX: (x: number): number => x * 0.85,
  toY: (x: number): number => 3.2 / x,
} as const;

export { LIMIT_VALUE, E_BASE, nOf, bOf, tOf };
