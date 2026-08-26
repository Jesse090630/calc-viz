/**
 * MATH — 「Special Limit Explorer」的引擎:把一道变形题**认回**一条已知的极限。
 *
 * ⭐⭐ 这一节要教的问题不是「我该背哪个技巧」,而是:
 *   **「我能不能把它变成一条我已经会的?」**
 * 所以每道题都带着三样东西:模板是哪一条、换元 u 是什么、以及分母**差了什么**。
 *
 * 每道题长这个样子:
 *   `N(u(x)) / (c · x^p)`,而模板是 `N(u) / u^d`。
 * 于是
 *   `题 = 系数 · 模板`,其中 `系数 = u(x)^d / (c · x^p)` —— 一个**常数**。
 *
 * ⭐ 那个「系数是常数」不是我说的,是测出来的:`coefficientHolds` 在好几个 x 上
 *   计算 `u(x)^d / (c x^p)`,断言它处处一样。声明的有理系数必须与它吻合。
 *
 * ⚠️ 答案用**有理数**算,不用浮点。`16/3 × 1/2` 走浮点会得到
 *   2.6666666666666665,屏幕上就写不出 `8/3`。
 *
 * ⚠️ 每道题的 `at(x)` 都用 `specialForms` 里数值稳定的写法
 *   (`oneMinusCos` / `expMinusOne` / `logOnePlus`),理由见那个文件的开头。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import {
  expMinusOne,
  formOf,
  logOnePlus,
  multiply,
  oneMinusCos,
  rationalPlain,
  rationalTex,
  rationalValue,
  reduce,
  type FormId,
  type Rational,
  type Step,
} from './specialForms';
import { showNumber, showScientific } from './format';

export interface Problem {
  readonly id: string;
  /** 屏幕上的题面 */
  readonly tex: string;
  /** 认成哪一条模板 */
  readonly template: FormId;
  /** 换元:u 是什么 */
  readonly uTex: string;
  readonly u: (x: number) => number;
  /** 分母:`c · x^p` */
  readonly c: number;
  readonly p: number;
  /** ⭐ 声明的系数 `u^d / (c x^p)`。会被 `coefficientHolds` 独立验证。 */
  readonly coefficient: Rational;
  /** 分母上现在有什么、模板要什么 */
  readonly have: string;
  readonly want: string;
  /**
   * 模板**换元之后**的样子。
   * ⚠️ 手写,不用字符串替换生成 —— `{3x}^2` 在 TeX 里渲染成 3x²,
   * 而正确的是 (3x)²。一个括号的差别,屏幕上就是另一道题。
   * 手写的代价由 `templateInstanceMatches` 兜住:它把两边归一化后比对。
   */
  readonly templateInstanceTex: string;
  /** 老老实实算出来的题面值。x = 0 处 null。 */
  readonly at: (x: number) => number | null;
  /** 一句为什么值得做这道题 */
  readonly note: string;
}

/* ══ 题库 ══════════════════════════════════════════════════════════ */

const PROBLEMS: readonly Problem[] = [
  {
    id: 'sin-5x',
    tex: '\\lim_{x \\to 0} \\frac{\\sin 5x}{x}',
    template: 'sin-over-x',
    uTex: '5x',
    u: (x) => 5 * x,
    c: 1,
    p: 1,
    coefficient: { num: 5, den: 1 },
    have: 'x',
    want: '5x',
    templateInstanceTex: '\\frac{\\sin 5x}{5x}',
    at: (x) => (x === 0 ? null : Math.sin(5 * x) / x),
    note: 'The classic. The template needs 5x underneath, not x.',
  },
  {
    id: 'sin-3x-7x',
    tex: '\\lim_{x \\to 0} \\frac{\\sin 3x}{7x}',
    template: 'sin-over-x',
    uTex: '3x',
    u: (x) => 3 * x,
    c: 7,
    p: 1,
    coefficient: { num: 3, den: 7 },
    have: '7x',
    want: '3x',
    templateInstanceTex: '\\frac{\\sin 3x}{3x}',
    at: (x) => (x === 0 ? null : Math.sin(3 * x) / (7 * x)),
    note: 'Two different coefficients. The answer is their ratio, not either one.',
  },
  {
    id: 'exp-4x',
    tex: '\\lim_{x \\to 0} \\frac{e^{4x} - 1}{x}',
    template: 'exp-over-x',
    uTex: '4x',
    u: (x) => 4 * x,
    c: 1,
    p: 1,
    coefficient: { num: 4, den: 1 },
    have: 'x',
    want: '4x',
    templateInstanceTex: '\\frac{e^{4x} - 1}{4x}',
    at: (x) => (x === 0 ? null : expMinusOne(4 * x) / x),
    note: 'Same repair, different template. The pattern travels.',
  },
  {
    id: 'tan-2x',
    tex: '\\lim_{x \\to 0} \\frac{\\tan 2x}{5x}',
    template: 'tan-over-x',
    uTex: '2x',
    u: (x) => 2 * x,
    c: 5,
    p: 1,
    coefficient: { num: 2, den: 5 },
    have: '5x',
    want: '2x',
    templateInstanceTex: '\\frac{\\tan 2x}{2x}',
    at: (x) => (x === 0 ? null : Math.tan(2 * x) / (5 * x)),
    note: 'Tangent works exactly like sine here — because its limit is the same.',
  },
  {
    id: 'cos-3x',
    tex: '\\lim_{x \\to 0} \\frac{1 - \\cos 3x}{x^2}',
    template: 'cos-over-x2',
    uTex: '3x',
    u: (x) => 3 * x,
    c: 1,
    p: 2,
    // u² = 9x², 分母是 x² ⇒ 系数 9。而模板本身给出 ½,于是 9/2。
    coefficient: { num: 9, den: 1 },
    have: 'x^2',
    want: '(3x)^2',
    templateInstanceTex: '\\frac{1 - \\cos 3x}{(3x)^2}',
    at: (x) => (x === 0 ? null : oneMinusCos(3 * x) / (x * x)),
    note: 'Squared denominator squares the coefficient. 3 becomes 9, not 3.',
  },
  {
    id: 'cos-5x-2x',
    tex: '\\lim_{x \\to 0} \\frac{1 - \\cos 5x}{2x}',
    template: 'cos-over-x',
    uTex: '5x',
    u: (x) => 5 * x,
    c: 2,
    p: 1,
    coefficient: { num: 5, den: 2 },
    have: '2x',
    want: '5x',
    templateInstanceTex: '\\frac{1 - \\cos 5x}{5x}',
    at: (x) => (x === 0 ? null : oneMinusCos(5 * x) / (2 * x)),
    note: 'The coefficient does not rescue it. This family still lands on 0.',
  },
  {
    id: 'log-2x',
    tex: '\\lim_{x \\to 0} \\frac{\\ln(1 + 2x)}{3x}',
    template: 'log-over-x',
    uTex: '2x',
    u: (x) => 2 * x,
    c: 3,
    p: 1,
    coefficient: { num: 2, den: 3 },
    have: '3x',
    want: '2x',
    templateInstanceTex: '\\frac{\\ln(1 + 2x)}{2x}',
    at: (x) => (x === 0 || 1 + 2 * x <= 0 ? null : logOnePlus(2 * x) / (3 * x)),
    note: 'The logarithm behaves the same way. Nothing new to learn.',
  },
  {
    id: 'sin-x2',
    tex: '\\lim_{x \\to 0} \\frac{\\sin(x^2)}{x^2}',
    template: 'sin-over-x',
    uTex: 'x^2',
    u: (x) => x * x,
    c: 1,
    p: 2,
    coefficient: { num: 1, den: 1 },
    have: 'x^2',
    want: 'x^2',
    templateInstanceTex: '\\frac{\\sin(x^2)}{x^2}',
    at: (x) => (x === 0 ? null : Math.sin(x * x) / (x * x)),
    note: 'u does not have to be a multiple of x. It already matches — nothing to repair.',
  },
  {
    id: 'cos-4x-3x2',
    tex: '\\lim_{x \\to 0} \\frac{1 - \\cos 4x}{3x^2}',
    template: 'cos-over-x2',
    uTex: '4x',
    u: (x) => 4 * x,
    c: 3,
    p: 2,
    coefficient: { num: 16, den: 3 },
    have: '3x^2',
    want: '(4x)^2',
    templateInstanceTex: '\\frac{1 - \\cos 4x}{(4x)^2}',
    at: (x) => (x === 0 ? null : oneMinusCos(4 * x) / (3 * x * x)),
    note: 'Both moves at once: square the 4, then divide by the 3.',
  },
];

export const PROBLEM_IDS: readonly string[] = PROBLEMS.map((p) => p.id);

export function problemOf(id: string): Problem {
  const found = PROBLEMS.find((p) => p.id === id);
  if (!found) throw new Error(`no such problem: ${id}`);
  return found;
}

export function allProblems(): readonly Problem[] {
  return PROBLEMS;
}

/* ══ 路径 A —— 有理数算术 ══════════════════════════════════════════ */

/** 答案 = 系数 × 模板的极限。全程有理数,不碰浮点。 */
export function answerByPattern(id: string): Rational {
  const problem = problemOf(id);
  return multiply(problem.coefficient, formOf(problem.template).limitRational);
}

export function answerTex(id: string): string {
  return rationalTex(answerByPattern(id));
}

export function answerValue(id: string): number {
  return rationalValue(answerByPattern(id));
}

/**
 * ⭐ 声明的系数**必须**等于 `u(x)^d / (c · x^p)`,而且那个式子必须是**常数**。
 * 这条把「我随手写了个 9」和「9 是算出来的」分开。
 */
export function coefficientAt(id: string, x: number): number {
  const problem = problemOf(id);
  const d = formOf(problem.template).templatePower;
  return problem.u(x) ** d / (problem.c * x ** problem.p);
}

export function coefficientHolds(id: string, xs: readonly number[] = [0.7, 0.3, -0.4, 0.05, -0.02]): boolean {
  const declared = rationalValue(reduce(problemOf(id).coefficient));
  return xs.every((x) => Math.abs(coefficientAt(id, x) - declared) < 1e-9 * Math.max(1, Math.abs(declared)));
}

/* ══ 路径 B —— 取样 ════════════════════════════════════════════════ */

export const PROBE_DEPTH = 6;

/** 直接在很小的 x 上算题面。不看系数、不看模板。 */
export function answerByLadder(id: string, depth = PROBE_DEPTH): number | null {
  return problemOf(id).at(Number(`1e-${depth}`));
}

/** 阶梯表:一档一档看它走向答案。 */
export function rowsFor(id: string, depth = PROBE_DEPTH): readonly { x: number; value: number | null }[] {
  return Array.from({ length: depth }, (_, i) => {
    const x = Number(`1e-${i + 1}`);
    return { x, value: problemOf(id).at(x) };
  });
}

/* ══ 修分母:一步一步 ══════════════════════════════════════════════ */

/**
 * 「差了什么」那块面板。
 * ⚠️ 这里**不**直接说答案 —— 说的是「现在有 x,模板要 5x」。
 * 这一节要练的是认形状,不是套结论。
 */
export interface Need {
  readonly have: string;
  readonly want: string;
  readonly fix: string;
  /** 已经对上了就不用修 */
  readonly matched: boolean;
}

/**
 * TeX 里的上标转成可读的纯文本上标。
 * ⚠️ `fix` 那句话是**散文**,不走 KaTeX —— 直接把 `(4x)^2` 塞进去,
 * 屏幕上就写着 "(4x)^2"(截图上看见的)。同一个字符串既当 TeX 用又当散文用,
 * 总有一头是错的;这里只负责散文那一头。
 */
export function plainTex(tex: string): string {
  return tex
    .replace(/\^\{(\d)\}/g, (_, d: string) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]!)
    .replace(/\^(\d)/g, (_, d: string) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]!)
    .replace(/\\,/g, ' ')
    .trim();
}

export function needOf(id: string): Need {
  const problem = problemOf(id);
  const coefficient = reduce(problem.coefficient);
  const matched = problem.have === problem.want && coefficient.num === 1 && coefficient.den === 1;
  return {
    have: problem.have,
    want: problem.want,
    matched,
    fix: matched
      ? 'Already the template. Nothing to repair.'
      : `Multiply and divide so the denominator becomes ${plainTex(problem.want)}, then carry the leftover ${rationalPlain(coefficient)} out front.`,
  };
}

/**
 * 变形的每一步。⚠️ **生成**的,不是八套手写文案 ——
 * 手写八套,迟早有一套和它自己的系数对不上。
 */
export function repairSteps(id: string): readonly Step[] {
  const problem = problemOf(id);
  const form = formOf(problem.template);
  const coefficient = reduce(problem.coefficient);
  const coefficientTex = rationalTex(coefficient);
  const templateWithU = problem.templateInstanceTex;

  const steps: Step[] = [
    {
      tex: `${form.templateTex} \\to ${rationalTex(form.limitRational)}`,
      note: `The template. It holds for any u that goes to 0 — here u = ${plainTex(problem.uTex)}.`,
    },
  ];

  if (!needOf(id).matched) {
    steps.push({
      tex: `${problem.tex.replace('\\lim_{x \\to 0} ', '')} = ${coefficientTex} \\cdot ${templateWithU}`,
      note: `The denominator has ${plainTex(problem.have)}; the template needs ${plainTex(problem.want)}. Multiply and divide to repair it.`,
    });
  }

  steps.push(
    {
      tex: `${templateWithU} \\to ${rationalTex(form.limitRational)}`,
      note: `Because ${plainTex(problem.uTex)} → 0, this bracket is exactly the template.`,
    },
    {
      tex: `${coefficientTex === '1' ? '' : `${coefficientTex} \\cdot `}${rationalTex(form.limitRational)} = ${answerTex(id)}`,
      note: 'Nothing left to do but multiply.',
    },
  );

  return steps;
}

/* ══ 显示 ══════════════════════════════════════════════════════════ */

export function showValue(value: number | null, places = 6): string {
  return value === null ? 'undefined' : showNumber(value, places);
}

export function showX(x: number): string {
  const abs = Math.abs(x);
  if (abs >= 1e-3 || abs === 0) return showNumber(x, 4);
  return showScientific(x, 0);
}

export const ASK_INSTEAD =
  'Do not ask which trick to memorise. Ask whether this can become a limit you already know.';

/** 参考卡上每条挂的那道例题必须真的存在。 */
export function exampleFor(form: FormId): Problem {
  return problemOf(formOf(form).exampleId);
}

/**
 * ⭐ 手写的 `templateInstanceTex` 与「模板把 u 换成 uTex」必须是同一个东西。
 * 比对前先**归一化**:去掉花括号、圆括号与空白 —— 那些只影响排版,不影响内容。
 * 于是 `{3x}^2` 与 `(3x)^2` 归一化后相同,而 `(3x)^2` 与 `3x^2` 也相同,
 * 但 `\sin 5x` 与 `\sin 3x` 不同 —— 该抓的差别抓得住。
 */
function normalise(tex: string): string {
  return tex.replace(/[{}()\s]/g, '');
}

export function templateInstanceMatches(id: string): boolean {
  const problem = problemOf(id);
  const form = formOf(problem.template);
  // ⚠️ 只替换**独立的** u:前后都不能是字母或反斜杠,否则会误伤 TeX 命令。
  const substituted = form.templateTex.replace(/(?<![a-zA-Z\\])u(?![a-zA-Z])/g, problem.uTex);
  return normalise(substituted) === normalise(problem.templateInstanceTex);
}
