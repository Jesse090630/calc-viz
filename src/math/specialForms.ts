/**
 * MATH — 六条特殊极限的**共用目录**。
 *
 * 这一节的教学落点不是「背下六个公式」,而是:
 *   **一条已知的极限可以生出下一条。** 所以这个模块把六条放在同一张表里,
 *   每一条都写明「它由哪一条推出来」以及「拆成哪几个因子」。
 *
 * ⭐⭐ 两条独立路径:
 *   路径 A `limitByFactors` —— 把因子各自的极限**相乘**。纯推理,不取样。
 *   路径 B `limitByLadder`  —— 沿 10⁻ᵏ 取样,看比值停在哪儿。不看因子表。
 *
 * ⭐ 而且因子分解不只在极限处成立,它是**逐点恒等式**:
 *   `factorProduct(id, x) === ratio(id, x)` 对每个 x ≠ 0 都成立。
 *   于是「conjugate trick」「half-angle」这些代数步骤是被**验证**过的,
 *   不是被声称过的 —— 见 `specialForms.test.ts` 的恒等式那一组。
 *
 * ⚠️⚠️ 浮点陷阱,这一节踩得最狠的一处:
 *   `1 - Math.cos(x)` 在 x = 10⁻⁸ 处**精确地等于 0** —— 因为 cos(10⁻⁸) 在 double 里
 *   就是 1.0。于是 `(1−cos x)/x²` 会显示成 0.000000,而它的极限是 0.5。
 *   屏幕上写出一个假的 0,比崩溃危险得多。
 *   解决办法不是回避,而是用**这一节自己要教的那条恒等式**去算:
 *   `1 − cos x = 2 sin²(x/2)`,它在同样的 x 下精确到最后一位。
 *   `naiveNumerator` 保留下来只为在界面上把这件事**摆出来**。
 *
 * ⚠️ 同理:`e^x − 1` 用 `Math.expm1`、`ln(1+x)` 用 `Math.log1p`。
 *   它们和教科书写法是**同一个函数**,只是算得准。
 *
 * ⚠️ 每个 `ratio` 在 x = 0 处返回 `null`,不返回 NaN。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import { showNumber, showScientific } from './format';

export const A = 0;

export type FormId =
  | 'sin-over-x'
  | 'tan-over-x'
  | 'cos-over-x'
  | 'cos-over-x2'
  | 'exp-over-x'
  | 'log-over-x';

export type Family = 'trigonometric' | 'exponential' | 'logarithmic';

export const FORM_IDS: readonly FormId[] = [
  'sin-over-x',
  'tan-over-x',
  'cos-over-x',
  'cos-over-x2',
  'exp-over-x',
  'log-over-x',
];

/* ══ 数值稳定的写法 ════════════════════════════════════════════════ */

/**
 * `1 − cos x`,用半角恒等式算。
 * ⚠️ 和 `1 - Math.cos(x)` 是同一个函数,但那个写法在小 x 处会把有效数字全丢光
 * (两个几乎相等的数相减)。这里用的恒等式**正是这一节第四课要推的那一条**。
 */
export function oneMinusCos(x: number): number {
  const half = Math.sin(x / 2);
  return 2 * half * half;
}

/** 教科书写法。⚠️ 只用来在界面上演示它什么时候开始说谎,不用于任何结论。 */
export function oneMinusCosNaive(x: number): number {
  return 1 - Math.cos(x);
}

/** `e^x − 1`。⚠️ `Math.exp(x) - 1` 在小 x 处同样丢有效数字。 */
export function expMinusOne(x: number): number {
  return Math.expm1(x);
}

export function expMinusOneNaive(x: number): number {
  return Math.exp(x) - 1;
}

/** `ln(1 + x)`。⚠️ `Math.log(1 + x)` 的问题出在 `1 + x` 那一步就已经丢了位数。 */
export function logOnePlus(x: number): number {
  return Math.log1p(x);
}

export function logOnePlusNaive(x: number): number {
  return Math.log(1 + x);
}

/* ══ 曲线角色 ══════════════════════════════════════════════════════ */

/**
 * 缩放面板里叠在一起的几条线。
 *   subject   = 正在研究的那条
 *   companion = 它在 0 附近的**局部替身**(直线或抛物线)
 *   aside     = 拿来对照的第三条
 */
export type CurveRole = 'subject' | 'companion' | 'aside';

/** 精确有理数。⚠️ 变形题的答案必须写成 8/3,不能写成 2.6666666666666665。 */
export interface Rational {
  readonly num: number;
  readonly den: number;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y > 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x === 0 ? 1 : x;
}

export function reduce(r: Rational): Rational {
  const sign = r.den < 0 ? -1 : 1;
  const d = gcd(r.num, r.den);
  return { num: (sign * r.num) / d, den: (sign * r.den) / d };
}

export function multiply(a: Rational, b: Rational): Rational {
  return reduce({ num: a.num * b.num, den: a.den * b.den });
}

export function rationalValue(r: Rational): number {
  return r.num / r.den;
}

/** 纯文本写法,给不走 KaTeX 的地方用(按钮文字、data-* 属性)。 */
export function rationalPlain(r: Rational): string {
  const reduced = reduce(r);
  return reduced.den === 1 ? String(reduced.num) : `${reduced.num}/${reduced.den}`;
}

export function rationalTex(r: Rational): string {
  const reduced = reduce(r);
  if (reduced.num === 0) return '0';
  if (reduced.den === 1) return String(reduced.num);
  const sign = reduced.num < 0 ? '-' : '';
  return `${sign}\\frac{${Math.abs(reduced.num)}}{${reduced.den}}`;
}

export interface Curve {
  readonly key: string;
  readonly tex: string;
  readonly role: CurveRole;
  readonly at: (x: number) => number | null;
}

/* ══ 因子 ══════════════════════════════════════════════════════════ */

export interface Factor {
  readonly tex: string;
  /** 这个因子自己的极限。⚠️ 写在这里的是**这个因子**的极限,不是整条的答案。 */
  readonly limit: number;
  readonly note: string;
  readonly at: (x: number) => number | null;
}

export interface Step {
  readonly tex: string;
  readonly note: string;
}

export interface SpecialForm {
  readonly id: FormId;
  readonly family: Family;
  /** 课页与目录卡上的标题(概念名) */
  readonly title: string;
  /** 课内的那句钩子 */
  readonly headline: string;
  readonly lede: string;

  readonly numeratorTex: string;
  readonly denominatorTex: string;
  readonly ratioTex: string;
  readonly limitTex: string;
  readonly limit: number;
  /** 答案在界面上怎么写(½ 用分数,不写 0.5) */
  readonly limitDisplay: string;
  /**
   * 极限的**有理数**写法。变形题要拿它做精确算术 ——
   * ⚠️ 用 0.5 去乘 16/3 会得到 2.6666666666666665,屏幕上就写不出 8/3。
   */
  readonly limitRational: Rational;

  /** 换元之后的模板样子:把 x 换成 u。变形题要把自己变成这个形状。 */
  readonly templateTex: string;
  /** 模板分母上 u 的次数。`(1−cos u)/u²` 是 2,其余都是 1。 */
  readonly templatePower: number;

  readonly numerator: (x: number) => number;
  readonly denominator: (x: number) => number;
  /** 教科书写法的分子。和 `numerator` 是同一个函数,只是算得不准。 */
  readonly naiveNumerator: (x: number) => number;

  readonly curves: readonly Curve[];
  /** 缩放面板一开始的半宽 */
  readonly startSpan: number;

  /** 由哪几条更早的极限推出来。空数组表示它不是推出来的。 */
  readonly provenBy: readonly FormId[];
  /**
   * 不是推出来的那两条,得说清楚它**立在什么上面**。
   * ⚠️ 结构约束:`factors` 与 `groundedIn` 必须**恰好有一个**是空的。
   * 否则「这条由那条推出」就成了一句可以随手写、也可以随手不写的话。
   */
  readonly groundedIn: string | null;

  readonly factors: readonly Factor[];
  readonly steps: readonly Step[];

  /** 参考卡上那一句「这张图在说什么」 */
  readonly reading: string;
  /** 参考卡上挂的那道变形题(见 `patternMatch.ts`) */
  readonly exampleId: string;
}

/* ══ 六条 ══════════════════════════════════════════════════════════ */

const SIN_OVER_X: SpecialForm = {
  id: 'sin-over-x',
  family: 'trigonometric',
  title: 'Why sin x / x → 1',
  headline: 'Why Does sin(x)/x Become 1?',
  lede: 'Substitution fails. Numbers hint. Geometry proves it.',
  numeratorTex: '\\sin x',
  denominatorTex: 'x',
  ratioTex: '\\frac{\\sin x}{x}',
  limitTex: '\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1',
  limit: 1,
  limitDisplay: '1',
  limitRational: { num: 1, den: 1 },
  templateTex: '\\frac{\\sin u}{u}',
  templatePower: 1,
  numerator: (x) => Math.sin(x),
  denominator: (x) => x,
  naiveNumerator: (x) => Math.sin(x),
  curves: [
    { key: 'sin', tex: 'y = \\sin x', role: 'subject', at: (x) => Math.sin(x) },
    { key: 'line', tex: 'y = x', role: 'companion', at: (x) => x },
  ],
  startSpan: 1.6,
  provenBy: [],
  groundedIn: 'the unit-circle inequality sin θ < θ < tan θ, then the squeeze theorem',
  factors: [],
  steps: [
    { tex: '\\sin\\theta < \\theta < \\tan\\theta', note: 'Straight from the picture, for small positive θ.' },
    { tex: '1 < \\frac{\\theta}{\\sin\\theta} < \\frac{1}{\\cos\\theta}', note: 'Divide by sin θ — positive here, so the order survives.' },
    { tex: '\\cos\\theta < \\frac{\\sin\\theta}{\\theta} < 1', note: 'Take reciprocals. Flipping positives reverses the order.' },
  ],
  reading: 'Near 0 the sine curve and the line y = x lie on top of each other.',
  exampleId: 'sin-5x',
};

const TAN_OVER_X: SpecialForm = {
  id: 'tan-over-x',
  family: 'trigonometric',
  title: 'Why tan x / x → 1',
  headline: 'Sin and Tan Become Indistinguishable',
  lede: 'One known limit, one identity, and the next limit falls out.',
  numeratorTex: '\\tan x',
  denominatorTex: 'x',
  ratioTex: '\\frac{\\tan x}{x}',
  limitTex: '\\lim_{x \\to 0} \\frac{\\tan x}{x} = 1',
  limit: 1,
  limitDisplay: '1',
  limitRational: { num: 1, den: 1 },
  templateTex: '\\frac{\\tan u}{u}',
  templatePower: 1,
  numerator: (x) => Math.tan(x),
  denominator: (x) => x,
  naiveNumerator: (x) => Math.tan(x),
  curves: [
    { key: 'tan', tex: 'y = \\tan x', role: 'subject', at: (x) => Math.tan(x) },
    { key: 'line', tex: 'y = x', role: 'companion', at: (x) => x },
    { key: 'sin', tex: 'y = \\sin x', role: 'aside', at: (x) => Math.sin(x) },
  ],
  startSpan: 1.2,
  provenBy: ['sin-over-x'],
  groundedIn: null,
  factors: [
    {
      tex: '\\frac{\\sin x}{x}',
      limit: 1,
      note: 'the limit we already proved',
      at: (x) => (x === 0 ? null : Math.sin(x) / x),
    },
    {
      tex: '\\frac{1}{\\cos x}',
      limit: 1,
      note: 'cos 0 = 1, so this one is just continuity',
      at: (x) => 1 / Math.cos(x),
    },
  ],
  steps: [
    { tex: '\\frac{\\tan x}{x} = \\frac{\\sin x}{x \\cos x}', note: 'tan is sine over cosine — nothing has moved yet.' },
    { tex: '= \\frac{\\sin x}{x} \\cdot \\frac{1}{\\cos x}', note: 'Split it into two factors we can take separately.' },
    { tex: '\\to 1 \\cdot 1 = 1', note: 'The first factor is the limit we proved. The second is just cos 0 = 1.' },
  ],
  reading: 'Zoom in far enough and sin x, x and tan x are the same line.',
  exampleId: 'tan-2x',
};

const COS_OVER_X: SpecialForm = {
  id: 'cos-over-x',
  family: 'trigonometric',
  title: 'Why (1 − cos x) / x → 0',
  headline: 'Cosine Changes Much More Slowly',
  lede: 'The numerator reaches zero long before the denominator does.',
  numeratorTex: '1 - \\cos x',
  denominatorTex: 'x',
  ratioTex: '\\frac{1 - \\cos x}{x}',
  limitTex: '\\lim_{x \\to 0} \\frac{1 - \\cos x}{x} = 0',
  limit: 0,
  limitDisplay: '0',
  limitRational: { num: 0, den: 1 },
  templateTex: '\\frac{1 - \\cos u}{u}',
  templatePower: 1,
  numerator: oneMinusCos,
  denominator: (x) => x,
  naiveNumerator: oneMinusCosNaive,
  curves: [
    { key: 'cos', tex: 'y = 1 - \\cos x', role: 'subject', at: oneMinusCos },
    { key: 'line', tex: 'y = x', role: 'aside', at: (x) => x },
    { key: 'parabola', tex: 'y = \\tfrac{x^2}{2}', role: 'companion', at: (x) => (x * x) / 2 },
  ],
  startSpan: 1.4,
  provenBy: ['sin-over-x'],
  groundedIn: null,
  factors: [
    {
      tex: '\\frac{\\sin x}{x}',
      limit: 1,
      note: 'the limit we already proved',
      at: (x) => (x === 0 ? null : Math.sin(x) / x),
    },
    {
      tex: '\\frac{\\sin x}{1 + \\cos x}',
      limit: 0,
      note: 'top → 0, bottom → 2, so this factor goes to 0',
      at: (x) => Math.sin(x) / (1 + Math.cos(x)),
    },
  ],
  steps: [
    { tex: '\\frac{1 - \\cos x}{x} \\cdot \\frac{1 + \\cos x}{1 + \\cos x}', note: 'Multiply by the conjugate — that is multiplying by 1.' },
    { tex: '= \\frac{1 - \\cos^2 x}{x\\,(1 + \\cos x)}', note: 'The top is a difference of squares.' },
    { tex: '= \\frac{\\sin^2 x}{x\\,(1 + \\cos x)}', note: 'And 1 − cos²x is sin²x.' },
    { tex: '= \\frac{\\sin x}{x} \\cdot \\frac{\\sin x}{1 + \\cos x}', note: 'Split off the factor we already know.' },
    { tex: '\\to 1 \\cdot \\frac{0}{2} = 0', note: 'Second factor: sin x → 0 and 1 + cos x → 2.' },
  ],
  reading: 'Cosine leaves 1 almost flat — the gap opens like x², not like x.',
  exampleId: 'cos-5x-2x',
};

const COS_OVER_X2: SpecialForm = {
  id: 'cos-over-x2',
  family: 'trigonometric',
  title: 'Why (1 − cos x) / x² → ½',
  headline: 'How Fast Does Cosine Flatten?',
  lede: 'Same numerator. Square the denominator and the answer stops being 0.',
  numeratorTex: '1 - \\cos x',
  denominatorTex: 'x^2',
  ratioTex: '\\frac{1 - \\cos x}{x^2}',
  limitTex: '\\lim_{x \\to 0} \\frac{1 - \\cos x}{x^2} = \\frac{1}{2}',
  limit: 0.5,
  limitDisplay: '½',
  limitRational: { num: 1, den: 2 },
  templateTex: '\\frac{1 - \\cos u}{u^2}',
  templatePower: 2,
  numerator: oneMinusCos,
  denominator: (x) => x * x,
  naiveNumerator: oneMinusCosNaive,
  curves: [
    { key: 'cos', tex: 'y = 1 - \\cos x', role: 'subject', at: oneMinusCos },
    { key: 'parabola', tex: 'y = \\tfrac{x^2}{2}', role: 'companion', at: (x) => (x * x) / 2 },
    { key: 'square', tex: 'y = x^2', role: 'aside', at: (x) => x * x },
  ],
  startSpan: 1.8,
  provenBy: ['sin-over-x'],
  groundedIn: null,
  factors: [
    {
      tex: '\\frac{1}{2}',
      limit: 0.5,
      note: 'a constant — it never moves',
      at: () => 0.5,
    },
    {
      tex: '\\left(\\frac{\\sin(x/2)}{x/2}\\right)^{2}',
      limit: 1,
      note: 'the same known limit, with x/2 in place of x, squared',
      at: (x) => {
        if (x === 0) return null;
        const inner = Math.sin(x / 2) / (x / 2);
        return inner * inner;
      },
    },
  ],
  steps: [
    { tex: '1 - \\cos x = 2\\sin^2\\!\\left(\\frac{x}{2}\\right)', note: 'The half-angle identity. Nothing approximate about it.' },
    { tex: '\\frac{1 - \\cos x}{x^2} = \\frac{2\\sin^2(x/2)}{x^2}', note: 'Substitute it in.' },
    { tex: '= \\frac{1}{2}\\left(\\frac{\\sin(x/2)}{x/2}\\right)^{2}', note: 'Because x² = 4·(x/2)², and 2/4 = ½.' },
    { tex: '\\to \\frac{1}{2}\\,(1)^2 = \\frac{1}{2}', note: 'The bracket is sin u / u with u = x/2, so it goes to 1.' },
  ],
  reading: 'Measured against x² instead of x, the cosine gap settles on exactly one half.',
  exampleId: 'cos-3x',
};

const EXP_OVER_X: SpecialForm = {
  id: 'exp-over-x',
  family: 'exponential',
  title: 'Why (eˣ − 1) / x → 1',
  headline: 'Zoom Into eˣ',
  lede: 'The quotient is a secant slope. Watch where the slopes settle.',
  numeratorTex: 'e^x - 1',
  denominatorTex: 'x',
  ratioTex: '\\frac{e^x - 1}{x}',
  limitTex: '\\lim_{x \\to 0} \\frac{e^x - 1}{x} = 1',
  limit: 1,
  limitDisplay: '1',
  limitRational: { num: 1, den: 1 },
  templateTex: '\\frac{e^u - 1}{u}',
  templatePower: 1,
  numerator: expMinusOne,
  denominator: (x) => x,
  naiveNumerator: expMinusOneNaive,
  curves: [
    { key: 'exp', tex: 'y = e^x', role: 'subject', at: (x) => Math.exp(x) },
    { key: 'line', tex: 'y = 1 + x', role: 'companion', at: (x) => 1 + x },
  ],
  startSpan: 1.6,
  provenBy: [],
  groundedIn: 'the number e is the one base whose exponential curve leaves (0, 1) at slope exactly 1',
  factors: [],
  steps: [
    { tex: '\\frac{e^x - 1}{x} = \\frac{e^x - e^0}{x - 0}', note: 'Because e⁰ = 1 — this is the slope between two points on the curve.' },
    { tex: '(0, 1) \\;\\text{and}\\; (x, e^x)', note: 'Those two points. The quotient is rise over run.' },
    { tex: '\\text{as } x \\to 0,\\; \\text{the secant slopes settle}', note: 'The second point slides into the first and the line stops turning.' },
    { tex: '\\lim_{x \\to 0} \\frac{b^x - 1}{x} = \\ln b', note: 'For any base b. It equals 1 exactly when b = e — that is what picks e out.' },
  ],
  reading: 'Near (0, 1) the exponential curve and the line y = 1 + x are the same line.',
  exampleId: 'exp-4x',
};

const LOG_OVER_X: SpecialForm = {
  id: 'log-over-x',
  family: 'logarithmic',
  title: 'Why ln(1 + x) / x → 1',
  headline: 'Zoom Into ln(1 + x)',
  lede: 'The mirror image of the exponential limit, reflected across y = x.',
  numeratorTex: '\\ln(1 + x)',
  denominatorTex: 'x',
  ratioTex: '\\frac{\\ln(1 + x)}{x}',
  limitTex: '\\lim_{x \\to 0} \\frac{\\ln(1 + x)}{x} = 1',
  limit: 1,
  limitDisplay: '1',
  limitRational: { num: 1, den: 1 },
  templateTex: '\\frac{\\ln(1 + u)}{u}',
  templatePower: 1,
  numerator: logOnePlus,
  denominator: (x) => x,
  naiveNumerator: logOnePlusNaive,
  curves: [
    { key: 'log', tex: 'y = \\ln(1 + x)', role: 'subject', at: (x) => (x <= -1 ? null : logOnePlus(x)) },
    { key: 'line', tex: 'y = x', role: 'companion', at: (x) => x },
  ],
  startSpan: 0.9,
  provenBy: ['exp-over-x'],
  groundedIn: null,
  factors: [
    {
      tex: '\\frac{1}{\\;\\dfrac{e^u - 1}{u}\\;}',
      limit: 1,
      note: 'with u = ln(1 + x); the denominator is the exponential limit, which goes to 1',
      at: (x) => {
        if (x <= -1) return null;
        const u = logOnePlus(x);
        if (u === 0) return null;
        const inner = expMinusOne(u) / u;
        return inner === 0 ? null : 1 / inner;
      },
    },
  ],
  steps: [
    { tex: 'u = \\ln(1 + x) \\;\\Longleftrightarrow\\; x = e^u - 1', note: 'The two functions are inverses — this is just reading it the other way.' },
    { tex: '\\frac{\\ln(1 + x)}{x} = \\frac{u}{e^u - 1}', note: 'Rewrite the whole quotient in terms of u.' },
    { tex: '= \\left(\\frac{e^u - 1}{u}\\right)^{-1}', note: 'That is the reciprocal of the limit we just did.' },
    { tex: '\\to 1^{-1} = 1', note: 'And x → 0 forces u → 0, so the inside goes to 1.' },
  ],
  reading: 'Reflect y = eˣ across y = x and the tangent at (0, 1) becomes the tangent at (0, 0).',
  exampleId: 'log-2x',
};

const FORMS: Readonly<Record<FormId, SpecialForm>> = {
  'sin-over-x': SIN_OVER_X,
  'tan-over-x': TAN_OVER_X,
  'cos-over-x': COS_OVER_X,
  'cos-over-x2': COS_OVER_X2,
  'exp-over-x': EXP_OVER_X,
  'log-over-x': LOG_OVER_X,
};

export function formOf(id: FormId): SpecialForm {
  return FORMS[id];
}

export const FORMS_BY_FAMILY: Readonly<Record<Family, readonly FormId[]>> = {
  trigonometric: ['sin-over-x', 'tan-over-x', 'cos-over-x', 'cos-over-x2'],
  exponential: ['exp-over-x'],
  logarithmic: ['log-over-x'],
};

/* ══ 比值 ══════════════════════════════════════════════════════════ */

/** ⚠️ x = 0 处返回 null,不返回 NaN。定义域外(log 的 x ≤ −1)同理。 */
export function ratio(id: FormId, x: number): number | null {
  if (!Number.isFinite(x)) return null;
  const form = FORMS[id];
  const y = form.numerator(x) / form.denominator(x);
  return Number.isFinite(y) ? y : null;
}

/** 教科书写法算出来的比值。⚠️ 只用于演示它什么时候开始说谎。 */
export function naiveRatio(id: FormId, x: number): number | null {
  if (!Number.isFinite(x)) return null;
  const form = FORMS[id];
  const y = form.naiveNumerator(x) / form.denominator(x);
  return Number.isFinite(y) ? y : null;
}

/** 直接代入的形状。⭐ 六条**全都**给出 `0/0` —— 这就是它们同属一节的理由。 */
export function substitutionForm(id: FormId): string {
  const form = FORMS[id];
  return `${showNumber(form.numerator(A), 0)}/${showNumber(form.denominator(A), 0)}`;
}

export function isIndeterminate(id: FormId): boolean {
  const form = FORMS[id];
  return form.numerator(A) === 0 && form.denominator(A) === 0;
}

/* ══ 路径 A —— 因子相乘 ════════════════════════════════════════════ */

/**
 * 因子极限的乘积。不取样。
 * ⚠️ 不是推出来的那两条返回 `null` —— 它们没有因子可乘,
 * 硬给一个 1 会让「这条由那条推出」变成一句永远为真的空话。
 *
 * ⚠️ 乘法那一步抽成了 `productOfLimits`。理由和 `substitutionFormOf` 一样:
 * 直接 `return FORMS[id].limit` 在这六条数据上和真乘一遍**结果相同**,
 * 变异测试抓不到 —— 那就等于「两条独立路径」偷偷变成了一条。
 * 用合成的因子表(2 × 3 = 6)去钉乘法本身。
 */
export function productOfLimits(factors: readonly { readonly limit: number }[]): number {
  return factors.reduce((product, factor) => product * factor.limit, 1);
}

export function limitByFactors(id: FormId): number | null {
  const { factors } = FORMS[id];
  if (factors.length === 0) return null;
  return productOfLimits(factors);
}

/**
 * ⭐ 因子分解是**逐点恒等式**,不只是极限处的巧合。
 * 这个函数把因子在 x 处的值乘起来 —— 它必须等于 `ratio(id, x)`。
 */
export function factorProduct(id: FormId, x: number): number | null {
  const { factors } = FORMS[id];
  if (factors.length === 0) return null;
  let product = 1;
  for (const factor of factors) {
    const value = factor.at(x);
    if (value === null || !Number.isFinite(value)) return null;
    product *= value;
  }
  return Number.isFinite(product) ? product : null;
}

/* ══ 路径 B —— 十进位阶梯 ══════════════════════════════════════════ */

export const MAX_DEPTH = 8;

/** ⚠️ 用字符串构造。`10 ** -k` 给的不是精确的十进位。 */
export function decade(k: number): number {
  return Number.isInteger(k) ? Number(`1e-${k}`) : 10 ** -k;
}

/** 提示词点名的那串 x 值:1, 0.5, 0.1, 0.01, 0.001 … */
export const LADDER: readonly number[] = [1, 0.5, 0.1, 0.01, 0.001, 1e-4, 1e-5, 1e-6];

/**
 * ⚠️ 更深的两档,**只给 (1−cos x)/x² 那一课用**。
 *
 * 那一课要演示的是「教科书写法在什么时候开始说谎」,而说谎要到 10⁻⁷、10⁻⁸ 才**看得出来**:
 * 到 10⁻⁶ 为止两列都写着 0.4999…,差别落在第七位以后,屏幕上根本读不出区别 ——
 * 摆一列看不出差别的数字,等于什么都没演示。(浏览器检查量出「最大差 4.45×10⁻⁵」时发现的。)
 * 到 10⁻⁸,教科书那一列会**整个塌成 0.0000000**,而正确答案是 0.5。那一格才是这一课的画面。
 */
export const DEEP_LADDER: readonly number[] = [...LADDER, 1e-7, 1e-8];

export function ladderValue(id: FormId, k: number): number | null {
  return ratio(id, decade(k));
}

/** 沿阶梯走到底,返回最后一个有效读数。不看因子表。 */
export function limitByLadder(id: FormId, depth = MAX_DEPTH): number {
  let last = Number.NaN;
  for (let k = 1; k <= depth; k += 1) {
    const value = ladderValue(id, k);
    if (value !== null) last = value;
  }
  return last;
}

/** 阶梯上的一行:x、稳定写法的读数、教科书写法的读数。 */
export interface Row {
  readonly x: number;
  readonly value: number | null;
  readonly naive: number | null;
  /** 离极限还有多远 */
  readonly gap: number | null;
}

export function rowsFor(id: FormId, xs: readonly number[] = LADDER): readonly Row[] {
  const { limit } = FORMS[id];
  return xs.map((x) => {
    const value = ratio(id, x);
    return {
      x,
      value,
      naive: naiveRatio(id, x),
      gap: value === null ? null : Math.abs(value - limit),
    };
  });
}

/**
 * 教科书写法从第几档开始**错得看得见**(相对误差超过 tolerance)。
 * 找不到就返回 null —— 那一条本来就没有相减抵消的问题。
 */
export function naiveBreaksAt(id: FormId, tolerance = 1e-3, depth = 12): number | null {
  for (let k = 1; k <= depth; k += 1) {
    const x = decade(k);
    const good = ratio(id, x);
    const bad = naiveRatio(id, x);
    if (good === null || bad === null) continue;
    const scale = Math.max(Math.abs(good), 1e-300);
    if (Math.abs(bad - good) / scale > tolerance) return k;
  }
  return null;
}

/* ══ 为什么是 e:一条真正独立的旁证 ════════════════════════════════ */

/**
 * ⭐ `(e^x − 1)/x → 1` 不能靠更早的特殊极限推出来 —— 它**就是** e 的定义性质。
 * 所以这里给它另一条路:对任意底数 b,`(b^x − 1)/x → ln b`。
 * 取样得到的斜率与 `Math.log(b)` 对得上,而 b = e 时那个值恰好是 1。
 *
 * 这比「记住这条」有用得多:学生能看见 2 给出 0.693、3 给出 1.099,
 * 而**只有 e** 给出 1。
 */
export function baseSlope(base: number, depth = 7): number {
  const x = decade(depth);
  // ⚠️ 写成 `base ** x - 1` 会踩和 `1 - cos x` 同一个坑:两个几乎相等的数相减。
  //    `b^x − 1 = expm1(x·ln b)` 是同一个函数,只是不丢有效数字。
  return expMinusOne(x * Math.log(base)) / x;
}

export function baseSlopeExact(base: number): number {
  return Math.log(base);
}

/** 对数那一侧的同一件事:`log_b(1+x)/x → 1/ln b`。 */
export function logSlope(base: number, depth = 7): number {
  const x = decade(depth);
  return logOnePlus(x) / (Math.log(base) * x);
}

export function logSlopeExact(base: number): number {
  return 1 / Math.log(base);
}

/** 界面上摆出来的那几个底数。⚠️ e 必须在里面,而且不能只有 e。 */
export const BASES: readonly { readonly label: string; readonly value: number }[] = [
  { label: '2', value: 2 },
  { label: 'e', value: Math.E },
  { label: '3', value: 3 },
  { label: '10', value: 10 },
];

/* ══ 缩放 ══════════════════════════════════════════════════════════ */

export const ZOOM_LEVELS = 6;

/** 第 level 档的半宽。每档缩到 40%。 */
export function spanAt(id: FormId, level: number): number {
  const clamped = Math.min(Math.max(level, 0), ZOOM_LEVELS);
  return FORMS[id].startSpan * 0.4 ** clamped;
}

/**
 * 两条曲线在这一档里**最大**差多少(相对于半宽)。
 * ⚠️ 这个数必须随档位**单调下降** —— 否则「越放大越像」就只是我的说法。
 */
export function relativeGapAt(id: FormId, level: number, samples = 200): number {
  const form = FORMS[id];
  const subject = form.curves.find((c) => c.role === 'subject');
  const companion = form.curves.find((c) => c.role === 'companion');
  if (!subject || !companion) return 0;
  const span = spanAt(id, level);
  let worst = 0;
  for (let i = 0; i <= samples; i += 1) {
    const x = -span + (2 * span * i) / samples;
    const a = subject.at(x);
    const b = companion.at(x);
    if (a === null || b === null) continue;
    worst = Math.max(worst, Math.abs(a - b));
  }
  return worst / span;
}

export function sampleCurve(
  at: (x: number) => number | null,
  from: number,
  to: number,
  count = 220,
): readonly { x: number; y: number | null }[] {
  return Array.from({ length: count + 1 }, (_, i) => {
    const x = from + ((to - from) * i) / count;
    return { x, y: at(x) };
  });
}

/** 比值曲线本身,**在 0 处断开**。 */
export function sampleRatio(
  id: FormId,
  from: number,
  to: number,
  count = 240,
): readonly { x: number; y: number | null }[] {
  const gap = (to - from) / (count * 4);
  const half = Math.max(2, Math.floor(count / 2));
  const arm = (start: number, end: number) =>
    Array.from({ length: half + 1 }, (_, i) => {
      const x = start + ((end - start) * i) / half;
      return { x, y: ratio(id, x) };
    });
  return [...arm(from, -gap), ...arm(gap, to)];
}

/* ══ 拖动 ══════════════════════════════════════════════════════════ */

/** 滑块**到不了 0** —— 那里没有值。 */
export const MIN_X = 1e-4;

export function clampX(id: FormId, x: number): number {
  if (!Number.isFinite(x)) return FORMS[id].startSpan / 2;
  const span = FORMS[id].startSpan;
  const magnitude = Math.min(Math.max(Math.abs(x), MIN_X), span);
  return x < 0 ? -magnitude : magnitude;
}

export function halve(id: FormId, x: number): number {
  return clampX(id, x / 2);
}

/* ══ 显示 ══════════════════════════════════════════════════════════ */

export function showX(x: number): string {
  const abs = Math.abs(x);
  if (abs >= 1e-3 || abs === 0) return showNumber(x, 5);
  return showScientific(x, 0);
}

/**
 * ⚠️ 比值要**七位**。提示词点名的那串里 `0.9999998` 就有七位小数;
 * 四位会把 0.999983 和 0.9999998 显示成同一个 `1.0000`,
 * 而这一节全靠「一档比一档更接近」说话。
 */
export function showRatio(value: number | null): string {
  return value === null ? 'undefined' : showNumber(value, 7);
}

/**
 * 离极限还有多远。⚠️ 用科学记数,**永远不显示成 0** ——
 * 除非它在浮点里真的等于极限,那时明说是精度到头了,而不是假装差距为零。
 */
export function showGap(gap: number | null): string {
  if (gap === null) return '—';
  if (gap === 0) return '< 10⁻¹⁶';
  return showScientific(gap, 1);
}

export const INDETERMINATE_WORDS = 'INDETERMINATE — substitution alone does not decide this.';
export const NUMERIC_CAVEAT = 'Numerical evidence is not a proof.';
