/**
 * MATH — 特殊极限的**练习题生成器**(不用洛必达)。
 *
 * ⭐⭐ 这一页要训练的不是计算,是**模式识别**:
 *     「先代入。得到 0/0,就找出**哪个式子趋于 0**,再看能不能把它变成一条认识的特殊极限。」
 *
 * ⚠️ 学生最深的两个误解,题库必须正面打:
 *   ① **以为 x 必须趋于 0。** 不是。要趋于 0 的是**里面那个式子**。
 *      `x → 3` 时 `x − 3 → 0`,`sin(x−3)/(x−3)` 照样是那条特殊极限。
 *   ② **见了 0/0 就往特殊极限上套。** 所以题库里**必须**掺进
 *      直接代入就能做的题、纯代数约分的题、以及长得很像却答案完全不同的题
 *      (`(1−cos x)/x → 0`,不是 1/2)。
 *
 * ⭐⭐ 两条互不相干的路径验证**每一道题的答案**:
 *   ① `answer` —— 出题时按特殊极限推出来的精确值;
 *   ② `numericLimit` —— 拿题目里那个**真实的函数** `f`,在趋近点两侧取样求极限,
 *      完全不知道这题"打算"用哪条特殊极限。
 *   ⚠️ 生成器写错一个系数,① 会跟着错,而 ② 不会 —— 这就是它存在的理由。
 *   测试里对**每个等级的成百道题**都跑这条比对。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */

/* ══ 八条特殊极限 ══════════════════════════════════════════════════ */

export type Kind =
  | 'sin-u' | 'u-sin'
  | 'exp-u' | 'u-exp'
  | 'log-u' | 'u-log'
  | 'cos-u2' | 'u2-cos'
  | 'none';                       // 直接代入或纯代数,不需要特殊极限

export interface SpecialLimit {
  readonly kind: Kind;
  readonly tex: string;
  readonly value: number;
  readonly label: string;
}

export const SPECIALS: readonly SpecialLimit[] = [
  { kind: 'sin-u', tex: '\\lim_{u \\to 0} \\frac{\\sin u}{u} = 1', value: 1, label: 'sin u / u' },
  { kind: 'u-sin', tex: '\\lim_{u \\to 0} \\frac{u}{\\sin u} = 1', value: 1, label: 'u / sin u' },
  { kind: 'exp-u', tex: '\\lim_{u \\to 0} \\frac{e^u - 1}{u} = 1', value: 1, label: '(e^u − 1) / u' },
  { kind: 'u-exp', tex: '\\lim_{u \\to 0} \\frac{u}{e^u - 1} = 1', value: 1, label: 'u / (e^u − 1)' },
  { kind: 'log-u', tex: '\\lim_{u \\to 0} \\frac{\\ln(1+u)}{u} = 1', value: 1, label: 'ln(1+u) / u' },
  { kind: 'u-log', tex: '\\lim_{u \\to 0} \\frac{u}{\\ln(1+u)} = 1', value: 1, label: 'u / ln(1+u)' },
  { kind: 'cos-u2', tex: '\\lim_{u \\to 0} \\frac{1 - \\cos u}{u^2} = \\tfrac{1}{2}', value: 0.5, label: '(1 − cos u) / u²' },
  { kind: 'u2-cos', tex: '\\lim_{u \\to 0} \\frac{u^2}{1 - \\cos u} = 2', value: 2, label: 'u² / (1 − cos u)' },
] as const;

export function specialOf(k: Kind): SpecialLimit | null {
  return SPECIALS.find((s) => s.kind === k) ?? null;
}

/* ══ 题目 ══════════════════════════════════════════════════════════ */

export type Level = 1 | 2 | 3 | 4 | 5;

/** 答案可以是一个数,也可以是"不存在"。 */
export type Answer = { readonly kind: 'number'; readonly value: number }
  | { readonly kind: 'dne' };

export const num = (value: number): Answer => ({ kind: 'number', value });
export const DNE: Answer = { kind: 'dne' };

export interface Step {
  readonly say: string;
  readonly tex?: string;
}

export interface Problem {
  readonly level: Level;
  /** 这题**真正**用到的特殊极限。`none` 表示根本不需要。 */
  readonly kind: Kind;
  readonly tex: string;
  /** x 趋于哪个值 */
  readonly approach: number;
  /** ⭐ 题目里那个**真实的函数** —— 数值验证全靠它 */
  readonly f: (x: number) => number;
  readonly answer: Answer;
  /** 第一条提示只说"什么东西趋于 0",不解题;第二条点出是哪条特殊极限。 */
  readonly hints: readonly [string, string];
  readonly steps: readonly Step[];
  /** 有代换时写出来,如 `u = x − 3`,`x → 3` 时 `u → 0` */
  readonly substitution: string | null;
}

/* ══ 随机数:可复现 ═══════════════════════════════════════════════ */

/** ⚠️ 用**可复现**的伪随机,测试才能钉住具体题目。 */
export function makeRng(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const pick = <T,>(rng: () => number, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length) % xs.length]!;

/* ══ 答案解析 ═════════════════════════════════════════════════════ */

/**
 * 学生输入的答案。接受整数、小数、分数 `a/b`,以及 DNE。
 * ⚠️ 负号要认全角减号和 Unicode 减号 —— 手机上很容易打出来。
 */
export function parseAnswer(raw: string): Answer | null {
  const t = raw.trim().toLowerCase()
    .replace(/[−–—]/g, '-')
    .replace(/\s+/g, '');
  if (t === '') return null;
  if (t === 'dne' || t === 'doesnotexist' || t === 'none' || t === 'nolimit') return DNE;
  const frac = /^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/.exec(t);
  if (frac) {
    const a = Number(frac[1]);
    const b = Number(frac[2]);
    if (b === 0) return null;
    return num(a / b);
  }
  if (/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(t)) return num(Number(t));
  return null;
}

/** ⚠️ 比较要留容差:学生打 0.333 也该算对 1/3。 */
export function sameAnswer(a: Answer, b: Answer, tol = 5e-3): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'dne' || b.kind === 'dne') return true;
  return Math.abs(a.value - b.value) <= tol * Math.max(1, Math.abs(b.value));
}

export function answerText(a: Answer): string {
  if (a.kind === 'dne') return 'does not exist';
  const v = a.value;
  if (Number.isInteger(v)) return String(v);
  // 常见分数写成分数更好读
  for (let d = 2; d <= 12; d += 1) {
    const n = v * d;
    if (Math.abs(n - Math.round(n)) < 1e-9) return `${Math.round(n)}/${d}`;
  }
  return v.toFixed(4);
}

/* ══ 路径 ② —— 数值求极限,完全不看出题意图 ═══════════════════════ */

/**
 * ⭐⭐ 在趋近点两侧取样,看函数值稳不稳。
 *
 * ⚠️ 步长不能太小:`1 − cos u` 在 `u = 1e-8` 处只剩 `5e-17`,
 *   双精度下已经被舍入吃干净了。`1e-3 ~ 1e-5` 这一段既够近,又还没到抵消失效的地方。
 *
 * 两侧不一致(或发散)就返回 `DNE` —— 这正是那些"看起来像特殊极限"的陷阱题要的答案。
 */
export function numericLimit(f: (x: number) => number, at: number): Answer {
  const hs = [1e-3, 3e-4, 1e-4, 3e-5];
  const left: number[] = [];
  const right: number[] = [];
  for (const h of hs) {
    const l = f(at - h);
    const r = f(at + h);
    if (Number.isFinite(l)) left.push(l);
    if (Number.isFinite(r)) right.push(r);
  }
  if (left.length < 2 || right.length < 2) return DNE;
  const lastL = left[left.length - 1]!;
  const lastR = right[right.length - 1]!;
  /**
   * ⚠️ 这里**故意不**按"值超过某个大数就算发散"来判。
   *   那条判据既多余、又会冤枉人:
   *   · 多余 —— 爆掉的函数在 h 变小时值会一直变,下面那条"自己要稳"会抓住它;
   *   · 冤枉 —— `f(x) = 10⁹ + x` 的极限**确实**是 10⁹,是个正常的有限极限,
   *     按大小判会把它错报成不存在。
   *   **发散的特征是"随 h 一直跑",不是"数字大"。**
   */
  // 左右不一致
  const scale = Math.max(1, Math.abs(lastL), Math.abs(lastR));
  if (Math.abs(lastL - lastR) > 2e-2 * scale) return DNE;
  // 自己也要稳:最细的两个步长给出的值应当接近
  const prevR = right[right.length - 2]!;
  if (Math.abs(prevR - lastR) > 2e-2 * scale) return DNE;
  return num((lastL + lastR) / 2);
}

/* ══ 出题:按等级 ═════════════════════════════════════════════════ */

const COEF = [2, 3, 4, 5] as const;
const SHIFT = [1, 2, 3, 4, 5, -2, -3] as const;

/** `x - c` 的 TeX,c 为负时写成 `x + |c|` */
const shiftTex = (c: number) => (c < 0 ? `(x + ${-c})` : `(x - ${c})`);

const HINT_ZERO = (what: string) => `As x approaches the given value, ${what} approaches 0. That is the piece to build the special limit around.`;

/** 等级 1:八条特殊极限直接考。 */
function level1(rng: () => number): Problem {
  const s = pick(rng, SPECIALS);
  const body: Record<Kind, { tex: string; f: (x: number) => number }> = {
    'sin-u': { tex: '\\frac{\\sin x}{x}', f: (x) => Math.sin(x) / x },
    'u-sin': { tex: '\\frac{x}{\\sin x}', f: (x) => x / Math.sin(x) },
    'exp-u': { tex: '\\frac{e^{x} - 1}{x}', f: (x) => (Math.exp(x) - 1) / x },
    'u-exp': { tex: '\\frac{x}{e^{x} - 1}', f: (x) => x / (Math.exp(x) - 1) },
    'log-u': { tex: '\\frac{\\ln(1+x)}{x}', f: (x) => Math.log(1 + x) / x },
    'u-log': { tex: '\\frac{x}{\\ln(1+x)}', f: (x) => x / Math.log(1 + x) },
    'cos-u2': { tex: '\\frac{1 - \\cos x}{x^2}', f: (x) => (1 - Math.cos(x)) / (x * x) },
    'u2-cos': { tex: '\\frac{x^2}{1 - \\cos x}', f: (x) => (x * x) / (1 - Math.cos(x)) },
    none: { tex: '', f: () => 0 },
  };
  const b = body[s.kind];
  return {
    level: 1, kind: s.kind, approach: 0, f: b.f,
    tex: `\\lim_{x \\to 0} ${b.tex}`,
    answer: num(s.value),
    hints: [HINT_ZERO('x itself'), `This is exactly the special limit ${s.label}.`],
    steps: [
      { say: 'Substituting x = 0 gives 0/0, so there is something to do.' },
      { say: 'The expression is already in the shape of a known special limit.', tex: s.tex },
      { say: `So the value is ${answerText(num(s.value))}.` },
    ],
    substitution: null,
  };
}

/** 等级 2:系数。要把内外的宗量凑成一样。 */
function level2(rng: () => number): Problem {
  const s = pick(rng, SPECIALS);
  const a = pick(rng, COEF);
  const b = pick(rng, [1, 1, 2, 3] as const);
  const bt = b === 1 ? '' : String(b);
  const shapes: Record<Kind, { tex: string; f: (x: number) => number; ans: number; inner: string }> = {
    'sin-u': {
      tex: `\\frac{\\sin(${a}x)}{${bt}x}`, f: (x) => Math.sin(a * x) / (b * x), ans: a / b, inner: `${a}x`,
    },
    'u-sin': {
      tex: `\\frac{${bt}x}{\\sin(${a}x)}`, f: (x) => (b * x) / Math.sin(a * x), ans: b / a, inner: `${a}x`,
    },
    'exp-u': {
      tex: `\\frac{e^{${a}x} - 1}{${bt}x}`, f: (x) => (Math.exp(a * x) - 1) / (b * x), ans: a / b, inner: `${a}x`,
    },
    'u-exp': {
      tex: `\\frac{${bt}x}{e^{${a}x} - 1}`, f: (x) => (b * x) / (Math.exp(a * x) - 1), ans: b / a, inner: `${a}x`,
    },
    'log-u': {
      tex: `\\frac{\\ln(1 + ${a}x)}{${bt}x}`, f: (x) => Math.log(1 + a * x) / (b * x), ans: a / b, inner: `${a}x`,
    },
    'u-log': {
      tex: `\\frac{${bt}x}{\\ln(1 + ${a}x)}`, f: (x) => (b * x) / Math.log(1 + a * x), ans: b / a, inner: `${a}x`,
    },
    'cos-u2': {
      tex: `\\frac{1 - \\cos(${a}x)}{${bt}x^2}`,
      f: (x) => (1 - Math.cos(a * x)) / (b * x * x), ans: (a * a) / (2 * b), inner: `${a}x`,
    },
    'u2-cos': {
      tex: `\\frac{${bt}x^2}{1 - \\cos(${a}x)}`,
      f: (x) => (b * x * x) / (1 - Math.cos(a * x)), ans: (2 * b) / (a * a), inner: `${a}x`,
    },
    none: { tex: '', f: () => 0, ans: 0, inner: '' },
  };
  const sh = shapes[s.kind];
  const sq = s.kind === 'cos-u2' || s.kind === 'u2-cos';
  return {
    level: 2, kind: s.kind, approach: 0, f: sh.f,
    tex: `\\lim_{x \\to 0} ${sh.tex}`,
    answer: num(sh.ans),
    hints: [
      HINT_ZERO(`the inside of the function, ${sh.inner},`),
      `Make the two arguments match, then use ${s.label}.`,
    ],
    steps: [
      { say: 'Substituting x = 0 gives 0/0.' },
      { say: `The special limit needs the same expression on top and bottom. Here the inside is ${sh.inner}, so rewrite to get ${sh.inner}${sq ? ' squared' : ''} in both places.` },
      { say: 'Multiply and divide by whatever constant is needed — constants pull straight out of a limit.' },
      { say: `Now the special limit applies.`, tex: s.tex },
      { say: `The leftover constant is the answer: ${answerText(num(sh.ans))}.` },
    ],
    substitution: `u = ${sh.inner}, so as x → 0, u → 0`,
  };
}

/** 等级 3:趋近点不是 0。要点:趋于 0 的是**里面那个式子**。 */
function level3(rng: () => number): Problem {
  const s = pick(rng, SPECIALS);
  const c = pick(rng, SHIFT);
  const st = shiftTex(c);
  const shapes: Record<Kind, { tex: string; f: (x: number) => number }> = {
    'sin-u': { tex: `\\frac{\\sin${st}}{${st}}`, f: (x) => Math.sin(x - c) / (x - c) },
    'u-sin': { tex: `\\frac{${st}}{\\sin${st}}`, f: (x) => (x - c) / Math.sin(x - c) },
    'exp-u': { tex: `\\frac{e^{${st}} - 1}{${st}}`, f: (x) => (Math.exp(x - c) - 1) / (x - c) },
    'u-exp': { tex: `\\frac{${st}}{e^{${st}} - 1}`, f: (x) => (x - c) / (Math.exp(x - c) - 1) },
    'log-u': { tex: `\\frac{\\ln(1 + ${st})}{${st}}`, f: (x) => Math.log(1 + (x - c)) / (x - c) },
    'u-log': { tex: `\\frac{${st}}{\\ln(1 + ${st})}`, f: (x) => (x - c) / Math.log(1 + (x - c)) },
    'cos-u2': { tex: `\\frac{1 - \\cos${st}}{${st}^2}`, f: (x) => (1 - Math.cos(x - c)) / ((x - c) ** 2) },
    'u2-cos': { tex: `\\frac{${st}^2}{1 - \\cos${st}}`, f: (x) => ((x - c) ** 2) / (1 - Math.cos(x - c)) },
    none: { tex: '', f: () => 0 },
  };
  const sh = shapes[s.kind];
  return {
    level: 3, kind: s.kind, approach: c, f: sh.f,
    tex: `\\lim_{x \\to ${c}} ${sh.tex}`,
    answer: num(s.value),
    hints: [
      HINT_ZERO(`x ${c < 0 ? '+' : '−'} ${Math.abs(c)}`),
      `Let u = x ${c < 0 ? '+' : '−'} ${Math.abs(c)}. Then this is ${s.label}.`,
    ],
    steps: [
      { say: `x is not approaching 0 here — but it does not have to. What matters is that the inside approaches 0.` },
      { say: `Substitute u = x ${c < 0 ? '+' : '−'} ${Math.abs(c)}. As x → ${c}, u → 0.` },
      { say: 'In terms of u the expression is exactly the special limit.', tex: s.tex },
      { say: `So the value is ${answerText(num(s.value))}.` },
    ],
    substitution: `u = x ${c < 0 ? '+' : '−'} ${Math.abs(c)}, so as x → ${c}, u → 0`,
  };
}

/** 等级 4:代换藏起来了。 */
function level4(rng: () => number): Problem {
  const c = pick(rng, [2, 3, 4, 5] as const);
  const a = pick(rng, COEF);
  const which = Math.floor(rng() * 6);

  // ⭐ 因式分解型:x² − c² = (x − c)(x + c),多出来的 (x + c) → 2c
  if (which === 0) {
    return {
      level: 4, kind: 'sin-u', approach: c, f: (x) => Math.sin(x * x - c * c) / (x - c),
      tex: `\\lim_{x \\to ${c}} \\frac{\\sin(x^2 - ${c * c})}{x - ${c}}`,
      answer: num(2 * c),
      hints: [
        HINT_ZERO(`x² − ${c * c}`),
        `Factor x² − ${c * c}, then match the sine argument with a copy of itself.`,
      ],
      steps: [
        { say: `Substituting gives 0/0. The inside is u = x² − ${c * c}, and u → 0 as x → ${c}.` },
        { say: `Factor: x² − ${c * c} = (x − ${c})(x + ${c}).` },
        { say: `Write the fraction as [sin(u)/u] · (x + ${c}), where u = x² − ${c * c}.` },
        { say: `The first factor → 1, and (x + ${c}) → ${2 * c}.` },
        { say: `So the value is ${2 * c}.` },
      ],
      substitution: `u = x² − ${c * c} = (x − ${c})(x + ${c}), so as x → ${c}, u → 0`,
    };
  }
  if (which === 1) {
    return {
      level: 4, kind: 'exp-u', approach: c, f: (x) => (Math.exp(x * x - c * c) - 1) / (x - c),
      tex: `\\lim_{x \\to ${c}} \\frac{e^{x^2 - ${c * c}} - 1}{x - ${c}}`,
      answer: num(2 * c),
      hints: [
        HINT_ZERO(`x² − ${c * c}`),
        `Factor the exponent, then build (e^u − 1)/u with u = x² − ${c * c}.`,
      ],
      steps: [
        { say: `Substituting gives 0/0. Let u = x² − ${c * c}; then u → 0.` },
        { say: `x² − ${c * c} = (x − ${c})(x + ${c}).` },
        { say: `The fraction is [(e^u − 1)/u] · (x + ${c}).` },
        { say: `That is 1 · ${2 * c} = ${2 * c}.` },
      ],
      substitution: `u = x² − ${c * c}, so as x → ${c}, u → 0`,
    };
  }
  // ⭐ 系数藏在展开式里:a·x − a·c 其实就是 a(x − c)
  const inner = `${a}x - ${a * c}`;
  if (which === 2) {
    return {
      level: 4, kind: 'sin-u', approach: c, f: (x) => Math.sin(a * x - a * c) / (x - c),
      tex: `\\lim_{x \\to ${c}} \\frac{\\sin(${inner})}{x - ${c}}`,
      answer: num(a),
      hints: [HINT_ZERO(`${inner}`), `Notice ${inner} = ${a}(x − ${c}). Then use sin u / u.`],
      steps: [
        { say: `Factor the argument: ${inner} = ${a}(x − ${c}).` },
        { say: `Let u = ${a}(x − ${c}). As x → ${c}, u → 0.` },
        { say: `The fraction becomes ${a} · [sin(u)/u].` },
        { say: `So the value is ${a}.` },
      ],
      substitution: `u = ${a}(x − ${c}), so as x → ${c}, u → 0`,
    };
  }
  if (which === 3) {
    return {
      level: 4, kind: 'exp-u', approach: c, f: (x) => (Math.exp(a * x - a * c) - 1) / (x - c),
      tex: `\\lim_{x \\to ${c}} \\frac{e^{${inner}} - 1}{x - ${c}}`,
      answer: num(a),
      hints: [HINT_ZERO(`${inner}`), `Notice ${inner} = ${a}(x − ${c}). Then use (e^u − 1)/u.`],
      steps: [
        { say: `The exponent factors: ${inner} = ${a}(x − ${c}).` },
        { say: `Let u = ${a}(x − ${c}); as x → ${c}, u → 0.` },
        { say: `The fraction is ${a} · [(e^u − 1)/u] → ${a}.` },
      ],
      substitution: `u = ${a}(x − ${c}), so as x → ${c}, u → 0`,
    };
  }
  if (which === 4) {
    return {
      level: 4, kind: 'log-u', approach: c, f: (x) => Math.log(1 + a * (x - c)) / (x - c),
      tex: `\\lim_{x \\to ${c}} \\frac{\\ln\\left(1 + ${a}(x - ${c})\\right)}{x - ${c}}`,
      answer: num(a),
      hints: [HINT_ZERO(`${a}(x − ${c})`), `Let u = ${a}(x − ${c}) and use ln(1+u)/u.`],
      steps: [
        { say: `Let u = ${a}(x − ${c}). As x → ${c}, u → 0.` },
        { say: `Then x − ${c} = u/${a}, so the fraction is ${a} · [ln(1+u)/u].` },
        { say: `That gives ${a}.` },
      ],
      substitution: `u = ${a}(x − ${c}), so as x → ${c}, u → 0`,
    };
  }
  // ⭐ 经典:ln x / (x − 1),因为 ln x = ln(1 + (x − 1))
  return {
    level: 4, kind: 'log-u', approach: 1, f: (x) => Math.log(x) / (x - 1),
    tex: '\\lim_{x \\to 1} \\frac{\\ln x}{x - 1}',
    answer: num(1),
    hints: [
      HINT_ZERO('x − 1'),
      'Rewrite ln x as ln(1 + (x − 1)) — now it is ln(1+u)/u.',
    ],
    steps: [
      { say: 'Substituting gives 0/0.' },
      { say: 'Let u = x − 1. As x → 1, u → 0, and x = 1 + u.' },
      { say: 'So ln x = ln(1 + u), and the fraction is ln(1+u)/u.' },
      { say: 'That special limit is 1.' },
    ],
    substitution: 'u = x − 1, so as x → 1, u → 0 and ln x = ln(1 + u)',
  };
}

/**
 * 等级 5:混合与陷阱。
 * ⚠️ 这一级**必须**包含"直接代入就行"和"根本不需要特殊极限"的题 ——
 *   否则学生学到的是"见 0/0 就套公式",那比不会做更糟。
 */
function level5(rng: () => number): Problem {
  const a = pick(rng, COEF);
  const b = pick(rng, [3, 5, 7] as const);
  const which = Math.floor(rng() * 8);

  if (which === 0) {
    return {
      level: 5, kind: 'sin-u', approach: 0, f: (x) => Math.sin(a * x) / Math.sin(b * x),
      tex: `\\lim_{x \\to 0} \\frac{\\sin(${a}x)}{\\sin(${b}x)}`,
      answer: num(a / b),
      hints: [HINT_ZERO(`both ${a}x and ${b}x`), 'Use sin u / u twice — once on top, once on the bottom.'],
      steps: [
        { say: `Split into [sin(${a}x)/(${a}x)] · [(${b}x)/sin(${b}x)] · (${a}x)/(${b}x).` },
        { say: 'The first two factors each → 1.' },
        { say: `What is left is ${a}/${b} = ${answerText(num(a / b))}.` },
      ],
      substitution: null,
    };
  }
  if (which === 1) {
    // ⚠️ 陷阱:分母是 x 的一次方,不是平方 —— 答案是 0,不是 1/2
    return {
      level: 5, kind: 'cos-u2', approach: 0, f: (x) => (1 - Math.cos(x)) / x,
      tex: '\\lim_{x \\to 0} \\frac{1 - \\cos x}{x}',
      answer: num(0),
      hints: [
        HINT_ZERO('x'),
        'Careful: the special limit has x² underneath, not x. Write this as [(1 − cos x)/x²] · x.',
      ],
      steps: [
        { say: 'This looks like the (1 − cos u)/u² limit, but the denominator is x, not x².' },
        { say: 'Rewrite: (1 − cos x)/x = [(1 − cos x)/x²] · x.' },
        { say: 'The bracket → 1/2, and the extra factor x → 0.' },
        { say: 'So the answer is (1/2)·0 = 0 — not 1/2.' },
      ],
      substitution: null,
    };
  }
  if (which === 2) {
    return {
      level: 5, kind: 'sin-u', approach: 0, f: (x) => Math.tan(x) / x,
      tex: '\\lim_{x \\to 0} \\frac{\\tan x}{x}',
      answer: num(1),
      hints: [HINT_ZERO('x'), 'Write tan x as sin x / cos x, then peel off sin x / x.'],
      steps: [
        { say: 'tan x / x = (sin x / x) · (1 / cos x).' },
        { say: 'The first factor → 1 and cos x → 1.' },
        { say: 'So the limit is 1.' },
      ],
      substitution: null,
    };
  }
  if (which === 3) {
    return {
      level: 5, kind: 'exp-u', approach: 0,
      f: (x) => (Math.exp(a * x) - 1) / (Math.exp(b * x) - 1),
      tex: `\\lim_{x \\to 0} \\frac{e^{${a}x} - 1}{e^{${b}x} - 1}`,
      answer: num(a / b),
      hints: [HINT_ZERO(`both ${a}x and ${b}x`), 'Use (e^u − 1)/u on the top and its reciprocal on the bottom.'],
      steps: [
        { say: `Write it as [(e^{${a}x} − 1)/(${a}x)] · [(${b}x)/(e^{${b}x} − 1)] · (${a}x)/(${b}x).` },
        { say: 'The first two brackets → 1.' },
        { say: `Left with ${answerText(num(a / b))}.` },
      ],
      substitution: null,
    };
  }
  if (which === 4) {
    return {
      level: 5, kind: 'cos-u2', approach: 0,
      f: (x) => (1 - Math.cos(x)) / (x * Math.sin(x)),
      tex: '\\lim_{x \\to 0} \\frac{1 - \\cos x}{x \\sin x}',
      answer: num(0.5),
      hints: [HINT_ZERO('x'), 'Split off (1 − cos x)/x² and x/sin x.'],
      steps: [
        { say: 'Rewrite as [(1 − cos x)/x²] · [x/sin x].' },
        { say: 'The first → 1/2, the second → 1.' },
        { say: 'So the limit is 1/2.' },
      ],
      substitution: null,
    };
  }
  if (which === 5) {
    // ⚠️ 直接代入就行 —— 长得像特殊极限,其实不是
    return {
      level: 5, kind: 'none', approach: Math.PI, f: (x) => Math.sin(x) / x,
      tex: '\\lim_{x \\to \\pi} \\frac{\\sin x}{x}',
      answer: num(0),
      hints: [
        'Before reaching for any special limit, try substituting. Does it actually give 0/0?',
        'It does not. sin π = 0 and π ≠ 0, so this is 0 divided by something nonzero.',
      ],
      steps: [
        { say: 'Substitute first: sin(π) = 0 and the denominator is π, which is not 0.' },
        { say: 'So the expression is 0/π — there is no indeterminate form and nothing to fix.' },
        { say: 'The limit is 0. The sin x / x pattern is a red herring here; it only applies as x → 0.' },
      ],
      substitution: null,
    };
  }
  if (which === 6) {
    // ⚠️ 纯代数约分,不碰特殊极限
    const c = pick(rng, [2, 3, 4] as const);
    return {
      level: 5, kind: 'none', approach: c, f: (x) => (x * x - c * c) / (x - c),
      tex: `\\lim_{x \\to ${c}} \\frac{x^2 - ${c * c}}{x - ${c}}`,
      answer: num(2 * c),
      hints: [
        HINT_ZERO(`x − ${c}`),
        'This one is pure algebra — factor the top. No special limit is needed.',
      ],
      steps: [
        { say: 'Substituting gives 0/0, so something can be cancelled.' },
        { say: `Factor: x² − ${c * c} = (x − ${c})(x + ${c}).` },
        { say: `Cancel (x − ${c}) to get x + ${c}, then substitute: ${2 * c}.` },
        { say: 'No special limit was involved. Not every 0/0 needs one.' },
      ],
      substitution: null,
    };
  }
  // ⚠️ 极限不存在 —— 两侧跑向相反的无穷
  return {
    level: 5, kind: 'none', approach: 0, f: (x) => Math.sin(x) / (x * x),
    tex: '\\lim_{x \\to 0} \\frac{\\sin x}{x^2}',
    answer: DNE,
    hints: [
      HINT_ZERO('x'),
      'Peel off sin x / x and see what is left over.',
    ],
    steps: [
      { say: 'Write it as [sin x / x] · (1/x).' },
      { say: 'The bracket → 1, but 1/x blows up.' },
      { say: 'From the right 1/x → +∞; from the left → −∞. The two sides disagree.' },
      { say: 'So the limit does not exist.' },
    ],
    substitution: null,
  };
}

const BUILDERS: Record<Level, (rng: () => number) => Problem> = {
  1: level1, 2: level2, 3: level3, 4: level4, 5: level5,
};

export function makeProblem(level: Level, rng: () => number): Problem {
  return BUILDERS[level](rng);
}

/* ══ 概念题 ═══════════════════════════════════════════════════════ */

export interface ConceptQuestion {
  readonly prompt: string;
  readonly choices: readonly string[];
  readonly correct: number;
  readonly why: string;
}

export const CONCEPTS: readonly ConceptQuestion[] = [
  {
    prompt: 'If lim f(x)/g(x) = 4, what is lim g(x)/f(x)?',
    choices: ['4', '1/4', '−4', 'Not enough information'],
    correct: 1,
    why: 'Flipping the fraction flips the value, as long as the limit is a finite nonzero number and the reciprocal is defined near the point. Here 1/4.',
  },
  {
    prompt: 'A special limit is written upside down — denominator over numerator. What happens to its value?',
    choices: ['Unchanged', 'It becomes the reciprocal', 'It becomes negative', 'It stops existing'],
    correct: 1,
    why: 'That is exactly why the eight limits come in pairs: sin u / u → 1 and u / sin u → 1, while (1 − cos u)/u² → 1/2 and its reciprocal → 2.',
  },
  {
    prompt: 'Does x itself have to approach 0 to use a special limit?',
    choices: [
      'Yes, always',
      'No — the inner expression has to approach 0',
      'Only for the trig ones',
      'Only when there are coefficients',
    ],
    correct: 1,
    why: 'x → 3 is fine as long as the thing inside — say x − 3 — approaches 0. The special limits are statements about u, not about x.',
  },
  {
    prompt: 'If x → 7, which expression naturally approaches 0?',
    choices: ['x', 'x + 7', 'x − 7', '7/x'],
    correct: 2,
    why: 'x − 7 → 0. That is the u to build a substitution around.',
  },
  {
    prompt: 'Why can lim(x→3) sin(x−3)/(x−3) use the sin u / u limit?',
    choices: [
      'Because sin is continuous',
      'Because x − 3 → 0, and top and bottom hold the same expression',
      'Because 3 is a small number',
      'It cannot — x must approach 0',
    ],
    correct: 1,
    why: 'Two conditions: the inner expression goes to 0, and the same expression appears in the numerator and the denominator.',
  },
  {
    prompt: 'You substitute and get 5/0 with a nonzero top. What should you do?',
    choices: [
      'Use a special limit',
      'Cancel a common factor',
      'Neither — it is not 0/0, so look at the sign behaviour instead',
      'The answer is always 0',
    ],
    correct: 2,
    why: 'Special limits and cancellation are tools for 0/0. A nonzero over zero is a different situation entirely — it blows up, and you check each side separately.',
  },
  {
    prompt: 'lim(x→0) (1 − cos x)/x is which value?',
    choices: ['1/2', '0', '2', 'Does not exist'],
    correct: 1,
    why: 'The special limit needs x² underneath. With only x, write it as [(1 − cos x)/x²]·x → (1/2)·0 = 0.',
  },
] as const;

export function makeConcept(rng: () => number): ConceptQuestion {
  return pick(rng, CONCEPTS);
}

/* ══ 计分 ═════════════════════════════════════════════════════════ */

export interface Attempt {
  readonly kind: Kind | 'concept';
  readonly level: Level | null;
  readonly right: boolean;
}

export interface Report {
  readonly score: number;
  readonly outOf: number;
  /** 错得最多的那几条特殊极限 */
  readonly weakest: readonly Kind[];
  readonly advice: string;
}

/**
 * ⭐ 十题一总结。
 * ⚠️ 只报**真的错过**的类型 —— 没错过就直说没错过,不要为了凑话找茬。
 */
export function buildReport(attempts: readonly Attempt[]): Report {
  const missed = new Map<Kind, number>();
  for (const a of attempts) {
    if (a.right || a.kind === 'concept') continue;
    missed.set(a.kind, (missed.get(a.kind) ?? 0) + 1);
  }
  const weakest = [...missed.entries()]
    .sort((p, q) => q[1] - p[1])
    .slice(0, 3)
    .map(([k]) => k);
  const score = attempts.filter((a) => a.right).length;
  const levels = attempts.filter((a) => a.level !== null).map((a) => a.level as Level);
  const hardest = levels.length ? Math.max(...levels) : 1;

  let advice: string;
  if (weakest.length === 0) {
    advice = score === attempts.length
      ? `Clean sweep. Move up to level ${Math.min(hardest + 1, 5)} and let the substitutions get uglier.`
      : 'The misses were on the conceptual questions rather than a particular special limit — reread how reversing a fraction reverses its value.';
  } else if (weakest.includes('cos-u2') || weakest.includes('u2-cos')) {
    advice = 'The cosine limit is the one to drill. Remember it needs u² underneath, and that it is 1/2 rather than 1 — most of its mistakes come from assuming every special limit equals 1.';
  } else if (weakest.includes('none')) {
    advice = 'Several misses came on problems that never needed a special limit. Substitute first every single time; only reach for a special limit once you actually see 0/0.';
  } else {
    advice = `Drill ${weakest.map((k) => specialOf(k)?.label ?? k).join(' and ')} until the shape is automatic, then come back to level ${hardest}.`;
  }
  return { score, outOf: attempts.length, weakest, advice };
}

/* ══ 显示 ═════════════════════════════════════════════════════════ */

export const HEADLINE = 'Substitute First';
/**
 * ⚠️ 这句话**不要**复述下面那条规则。
 *   第一版写成了规则的同义句,于是标题下一段和琥珀色那一框讲的是同一件事,
 *   读者连着看到两遍几乎一样的话 —— 那是白占地方。
 *   标题这里说**练的是什么本事**,规则框说**怎么做**。
 */
export const MAIN_IDEA =
  'Eight limits, and the entire skill is spotting which one is hiding in front of you — usually behind a coefficient, a shifted approach value, or a substitution you have to notice yourself.';

export const RULE =
  'Substitute first. If you get 0/0, identify what expression approaches 0 and see whether you can transform the problem into a known special limit.';

export const NO_LHOPITAL =
  'Every problem here is solvable with substitution, algebra, and the eight special limits. No L’Hôpital.';
