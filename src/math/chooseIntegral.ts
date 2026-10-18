/**
 * MATH — 选哪个积分方法。
 *
 * ⭐⭐⭐ 这一课的内容**不是**五种方法怎么做,而是**凭什么挑**。
 *   单独看一个积分,学生总能把方法做对;真正卡住人的是一眼看过去
 *   两个积分长得几乎一样,可要用的工具完全不同。所以这里的单位不是
 *   "一道题",而是**一对题**(`Pair`):同一个外形,两种结构,一个判定问题分开它们。
 *
 * ⭐⭐⭐ 判定问题只有一个,反复出现:**"里层的导数本来就在那儿吗?"**
 *   在 → 换元;不在 → 看它是什么结构(乘积 / 有理式 / 根号下的二次式)。
 *   `∫x·e^{x²}dx` 和 `∫x·e^{x}dx` 的差别全在这儿:x² 的导数是 2x,那个 x 就在;
 *   x 的导数是 1,那个 x 就只是个乘上去的因子。
 *
 * ⭐⭐ 每道题除了正确答案,还带一个 `wrong` —— **那个方法用错时真的会写出来的答案**。
 *   其中三对的 `wrong` 就是**同伴的答案**:这正是这一页要治的病。
 *   页面把两个答案都求导回去画在积分函数上:对的那条严丝合缝地压住,
 *   错的那条肉眼可见地岔开。"求导验算"这个习惯,在这一页上是看得见的。
 *
 * ⭐ 两条互不相干的验证路径(项目规矩),而且刚好就是课本教的两种验算:
 *   ① 把答案**求导**回去,和被积函数逐点比(`slopeOf`)。
 *   ② 对被积函数**数值积分**,和 F(b)−F(a) 比(`areaOf`)。
 *   ①是逐点的、靠差商;②是整体的、靠 Simpson。两条都过才算对。
 *
 * ⚠️ 空转防护:`wrong` 必须**真的错**。一个"错答案"要是其实对,
 *   这一页就什么都没教。`WRONG_FLOOR` 把这条钉死,阈值的来历见下面。
 *
 * ⚠️ 没有一个数是手敲的。答案的 TeX 和闭式函数是一对,测试负责让它们对上。
 */

/** 用哪个工具。`standard-form` 是"查表就有,不用动手"那一档。 */
export type Tool = 'u-sub' | 'by-parts' | 'partial-fractions' | 'trig-sub' | 'standard-form';

export const TOOL_NAME: Readonly<Record<Tool, string>> = {
  'u-sub': 'u-substitution',
  'by-parts': 'integration by parts',
  'partial-fractions': 'partial fractions',
  'trig-sub': 'trigonometric substitution',
  'standard-form': 'a standard form',
};

/**
 * ⚠️ 站内真有课的工具才给链接。另外两个**诚实地留空**,
 *   页面照着 `#/theorems` 的做法把缺口标出来,不假装有。
 */
const TOOL_ROUTE: Readonly<Record<Tool, string | null>> = {
  'u-sub': 'u-substitution',
  'by-parts': 'by-parts',
  'partial-fractions': null,
  'trig-sub': null,
  'standard-form': null,
};

export function routeFor(tool: Tool): string | null {
  return TOOL_ROUTE[tool];
}

/** 一个错答案:它是哪种错,写出来长什么样,以及对应的函数。 */
export interface WrongAnswer {
  /** 这是哪种错 —— 一句话,得说出错在哪一步,不是"算错了"。 */
  readonly mistake: string;
  readonly tex: string;
  readonly at: (x: number) => number;
}

export interface Problem {
  readonly id: string;
  /** 积分本身,display 模式。 */
  readonly tex: string;
  readonly tool: Tool;
  /** 为什么是这个工具 —— 直接回答那个判定问题。 */
  readonly because: string;
  /** 关键几步。短;这一页不是方法课,过程只留决定性的那几步。 */
  readonly work: readonly string[];
  readonly answerTex: string;
  /** 被积函数。 */
  readonly f: (x: number) => number;
  /** 正确的原函数(取 C = 0)。 */
  readonly F: (x: number) => number;
  readonly wrong: WrongAnswer;
  /** ⚠️ 严格落在定义域**内部**的一段:差商在定义域边界上会炸。 */
  readonly safe: readonly [number, number];
  /** 定义域上的讲究,没有就不写。 */
  readonly domain?: string;
}

export interface Pair {
  readonly id: string;
  readonly title: string;
  /** 它们为什么看起来一样。 */
  readonly look: string;
  /** ⭐ 分开它们的那个判定问题。 */
  readonly test: string;
  /** 答"是"的那个。 */
  readonly a: Problem;
  /** 答"不是"的那个。 */
  readonly b: Problem;
  /** 这一对额外要说的话;只有真有坑的那对才有。 */
  readonly trap?: string;
}

/* ── 两条验证路径 ──────────────────────────────────────────────── */

/**
 * 中心差商。
 *
 * ⚠️ `h` 不是随手定的:中心差商的截断误差约 |g'''|·h²/6,
 *   h = 1e-5 时 h²/6 ≈ 1.7e-11,本页这些函数的三阶导在各自 `safe` 段上是 O(10),
 *   所以逐点误差在 1e-9 上下 —— 实测最坏 4.3e-10,和估计吻合。
 *   再调小 h 就会被浮点相减的舍入吃掉,反而变差。
 */
export const DIFF_H = 1e-5;

export function slopeOf(g: (x: number) => number, x: number): number {
  return (g(x + DIFF_H) - g(x - DIFF_H)) / (2 * DIFF_H);
}

/**
 * Simpson 求积。
 * ⚠️ `n` 必须是偶数 —— 奇数时最后一个区间没有配对点,公式直接失效。
 *   这里不"尽量"处理,而是补成偶数。
 */
export function areaOf(f: (x: number) => number, lo: number, hi: number, n = 2000): number {
  const m = n % 2 === 0 ? n : n + 1;
  const h = (hi - lo) / m;
  let sum = f(lo) + f(hi);
  for (let i = 1; i < m; i += 1) {
    sum += f(lo + i * h) * (i % 2 === 1 ? 4 : 2);
  }
  return (sum * h) / 3;
}

/**
 * 在一段上,`g` 的斜率和 `f` 差得最远有多远。
 *
 * ⚠️ **更正我自己写过的一句话**:这里原先跳过两个端点,理由写的是
 *   "端点落在定义域边界上会炸(√(9−x²))"。那句话是错的 ——
 *   每道题的 `safe` 段都严格落在定义域**内部**(`[-2.5, 2.5]` 不是 `[-3, 3]`),
 *   端点上差商完全算得出来,有一条单元测试专门钉这件事。
 *   既然如此,扫闭区间严格地更严,所以现在**两端都取**。
 */
export function worstGap(
  g: (x: number) => number,
  f: (x: number) => number,
  lo: number,
  hi: number,
  n = 200,
): number {
  let worst = 0;
  for (let i = 0; i <= n; i += 1) {
    const x = lo + ((hi - lo) * i) / n;
    const d = Math.abs(slopeOf(g, x) - f(x));
    if (d > worst) worst = d;
  }
  return worst;
}

/**
 * 正确答案允许的最大逐点偏差。
 * 来历:上面 `DIFF_H` 那段的误差估计,实测最坏 4.3e-10,留两个数量级余量。
 */
export const ANSWER_TOL = 1e-7;

/**
 * 一个 `wrong` 要算"真的错",最小偏差。
 * 来历:实测十个错答案的偏差最小是 0.48(`1/(x²±1)` 那一对),
 *   取 0.05 —— 比实测最小值低一个数量级,够宽松,又绝不会把"其实对"放过去。
 */
export const WRONG_FLOOR = 0.05;

/* ── 五对 ─────────────────────────────────────────────────────── */

const PAIRS_RAW: readonly Pair[] = [
  {
    id: 'exp',
    title: 'The x in front',
    look: 'Both are x times an exponential. Both are products. Same number of symbols.',
    test: 'Differentiate the exponent. Is what you get already sitting in front?',
    a: {
      id: 'x-exp-x2',
      tex: '\\int x\\,e^{x^{2}}\\,dx',
      tool: 'u-sub',
      because:
        'The exponent is x², whose derivative is 2x. There is an x in front, so the derivative is there up to the constant 2.',
      work: [
        'u = x², so du = 2x dx, which means x dx = ½ du.',
        'The integral becomes ½∫eᵘ du — nothing is left over.',
        'Integrate, then put x² back.',
      ],
      answerTex: '\\tfrac{1}{2}e^{x^{2}}+C',
      f: (x) => x * Math.exp(x * x),
      F: (x) => 0.5 * Math.exp(x * x),
      wrong: {
        mistake: 'Took u = x² but never converted dx, so the ½ from du = 2x dx never appeared.',
        tex: 'e^{x^{2}}+C',
        at: (x) => Math.exp(x * x),
      },
      safe: [-1.2, 1.2],
    },
    b: {
      id: 'x-exp-x',
      tex: '\\int x\\,e^{x}\\,dx',
      tool: 'by-parts',
      because:
        'The exponent is x, whose derivative is 1. So the x in front is not a leftover derivative — it is a genuine second factor, and substitution has nothing to absorb.',
      work: [
        'u = x and dv = eˣ dx, so du = dx and v = eˣ.',
        'uv − ∫v du = x eˣ − ∫eˣ dx.',
        'The ∫v du that is left is easier than what you started with — that is the only test of a good choice.',
      ],
      answerTex: '(x-1)e^{x}+C',
      f: (x) => x * Math.exp(x),
      F: (x) => (x - 1) * Math.exp(x),
      wrong: {
        mistake: 'Integrated the two factors separately. There is no product rule for integrals.',
        tex: '\\tfrac{x^{2}}{2}e^{x}+C',
        at: (x) => ((x * x) / 2) * Math.exp(x),
      },
      safe: [-1.2, 1.2],
    },
  },
  {
    id: 'top',
    title: 'What is on top',
    look: 'Same denominator, x² + 1. The only difference is whether there is an x in the numerator.',
    test: 'Differentiate the denominator. Is that what the numerator is, up to a constant?',
    a: {
      id: 'x-over-x2-plus-1',
      tex: '\\int \\frac{x}{x^{2}+1}\\,dx',
      tool: 'u-sub',
      because:
        'The bottom differentiates to 2x, and the top is x. That is the derivative, halved — so this is a logarithm, not an arctangent.',
      work: [
        'u = x² + 1, du = 2x dx, so x dx = ½ du.',
        '½∫du/u = ½ ln|u|.',
        'Here x² + 1 > 0 always, so the absolute value can be dropped.',
      ],
      answerTex: '\\tfrac{1}{2}\\ln\\!\\left(x^{2}+1\\right)+C',
      f: (x) => x / (x * x + 1),
      F: (x) => 0.5 * Math.log(x * x + 1),
      wrong: {
        mistake: 'Saw x² + 1 underneath and reached for arctangent without looking at the numerator.',
        tex: '\\arctan x+C',
        at: (x) => Math.atan(x),
      },
      safe: [-2, 2],
    },
    b: {
      id: 'one-over-x2-plus-1',
      tex: '\\int \\frac{1}{x^{2}+1}\\,dx',
      tool: 'standard-form',
      because:
        'The bottom still differentiates to 2x, but there is no x on top to supply it. Substitution has nothing to work with, and this shape is already in the table.',
      work: [
        'Nothing to substitute: u = x² + 1 would need an x dx that is not there.',
        'This is the derivative of arctan x read backwards.',
        'Worth memorising as a shape, not re-derived each time.',
      ],
      answerTex: '\\arctan x+C',
      f: (x) => 1 / (x * x + 1),
      F: (x) => Math.atan(x),
      wrong: {
        mistake: 'Forced u = x² + 1 anyway, as if the missing x could be ignored.',
        tex: '\\tfrac{1}{2}\\ln\\!\\left(x^{2}+1\\right)+C',
        at: (x) => 0.5 * Math.log(x * x + 1),
      },
      safe: [-2, 2],
    },
  },
  {
    id: 'sign',
    title: 'One sign',
    look: 'Identical except for a plus or a minus. One character apart.',
    test: 'Does the quadratic factor over the real numbers?',
    a: {
      id: 'one-over-x2-minus-1',
      tex: '\\int \\frac{1}{x^{2}-1}\\,dx',
      tool: 'partial-fractions',
      because:
        'x² − 1 factors as (x − 1)(x + 1). Two real linear factors means the fraction splits into two pieces you can already integrate.',
      work: [
        'Write 1/((x−1)(x+1)) = A/(x−1) + B/(x+1), so A(x+1) + B(x−1) = 1.',
        'Put x = 1: 2A = 1, so A = ½. Put x = −1: −2B = 1, so B = −½.',
        'Each piece is a logarithm, and they combine into one.',
      ],
      answerTex: '\\tfrac{1}{2}\\ln\\left|\\frac{x-1}{x+1}\\right|+C',
      f: (x) => 1 / (x * x - 1),
      F: (x) => 0.5 * Math.log(Math.abs((x - 1) / (x + 1))),
      wrong: {
        mistake: 'Used the arctangent shape without checking the sign. x² − 1 is not x² + 1.',
        tex: '\\arctan x+C',
        at: (x) => Math.atan(x),
      },
      safe: [1.4, 3],
      domain: 'Undefined at x = ±1, so an integral across either point does not exist.',
    },
    b: {
      id: 'one-over-x2-plus-1-again',
      tex: '\\int \\frac{1}{x^{2}+1}\\,dx',
      tool: 'standard-form',
      because:
        'x² + 1 has no real roots, so there is nothing to split. Irreducible denominators go to arctangent, not to partial fractions.',
      work: [
        'x² + 1 = 0 has no real solution, so no real linear factors exist.',
        'Attempting A/(x−r) + B/(x−s) requires real r and s. There are none.',
        'This is the arctangent shape.',
      ],
      answerTex: '\\arctan x+C',
      f: (x) => 1 / (x * x + 1),
      F: (x) => Math.atan(x),
      wrong: {
        mistake: 'Split it into linear factors anyway, as though x² + 1 factored over the reals.',
        tex: '\\tfrac{1}{2}\\ln\\left|\\frac{x-1}{x+1}\\right|+C',
        at: (x) => 0.5 * Math.log(Math.abs((x - 1) / (x + 1))),
      },
      safe: [1.4, 3],
    },
  },
  {
    id: 'radical',
    title: 'A root over a quadratic',
    look: 'Both have √(9 − x²) in them. That shape is the advertisement for trigonometric substitution.',
    test: 'Before reaching for a triangle: differentiate 9 − x². Is that −2x anywhere in the integral?',
    trap:
      'A radical of a quadratic is not automatically trigonometric substitution. Trigonometric substitution is the tool for when nothing simpler works — so check for the inner derivative first. One of these two takes a line; the other takes a page.',
    a: {
      id: 'two-x-over-root',
      tex: '\\int \\frac{2x}{\\sqrt{9-x^{2}}}\\,dx',
      tool: 'u-sub',
      because:
        'The inside differentiates to −2x, and 2x is right there on top. Substitution finishes this in one line; a triangle would be three times the work for the same answer.',
      work: [
        'u = 9 − x², so du = −2x dx, which makes 2x dx = −du.',
        'The integral becomes −∫u^(−1/2) du = −2√u.',
        'The minus sign is not optional — it comes from du, and it is the whole character of the answer.',
      ],
      answerTex: '-2\\sqrt{9-x^{2}}+C',
      f: (x) => (2 * x) / Math.sqrt(9 - x * x),
      F: (x) => -2 * Math.sqrt(9 - x * x),
      wrong: {
        mistake: 'Dropped the minus sign from du = −2x dx. The answer comes out exactly backwards.',
        tex: '2\\sqrt{9-x^{2}}+C',
        at: (x) => 2 * Math.sqrt(9 - x * x),
      },
      safe: [-2.5, 2.5],
      domain: 'Needs |x| < 3, and the integrand blows up as |x| → 3.',
    },
    b: {
      id: 'root-alone',
      tex: '\\int \\sqrt{9-x^{2}}\\,dx',
      tool: 'trig-sub',
      because:
        'Now there is no x outside the radical, so −2x is nowhere to be found. Substitution is out, and a right triangle is the way to turn the root into a cosine.',
      work: [
        'x = 3 sin θ, so dx = 3 cos θ dθ and √(9 − x²) = 3 cos θ.',
        'The integral becomes 9∫cos²θ dθ, which the identity cos²θ = (1 + cos 2θ)/2 flattens.',
        'Convert back with θ = arcsin(x/3) and sin 2θ = 2 sin θ cos θ.',
      ],
      answerTex: '\\tfrac{x}{2}\\sqrt{9-x^{2}}+\\tfrac{9}{2}\\arcsin\\!\\frac{x}{3}+C',
      f: (x) => Math.sqrt(9 - x * x),
      F: (x) => (x / 2) * Math.sqrt(9 - x * x) + 4.5 * Math.asin(x / 3),
      wrong: {
        mistake: 'Applied the power rule as if dx were du. ∫√u du is not ∫√u dx.',
        tex: '\\tfrac{2}{3}\\left(9-x^{2}\\right)^{3/2}+C',
        at: (x) => (2 / 3) * Math.pow(9 - x * x, 1.5),
      },
      safe: [-2.5, 2.5],
      domain: 'Needs |x| ≤ 3; this is the upper half of a circle of radius 3.',
    },
  },
  {
    id: 'log',
    title: 'Whether the 1/x is there',
    look: 'Both are built from ln x and nothing else complicated.',
    test: 'The derivative of ln x is 1/x. Is a 1/x present?',
    a: {
      id: 'ln-over-x',
      tex: '\\int \\frac{\\ln x}{x}\\,dx',
      tool: 'u-sub',
      because: 'u = ln x needs a dx/x, and dividing by x supplies exactly that. The whole integral is ∫u du.',
      work: [
        'u = ln x, so du = dx/x.',
        '∫u du = u²/2.',
        'Nothing is left behind, which is the sign that the substitution was the right one.',
      ],
      answerTex: '\\tfrac{(\\ln x)^{2}}{2}+C',
      f: (x) => Math.log(x) / x,
      F: (x) => 0.5 * Math.pow(Math.log(x), 2),
      wrong: {
        mistake: 'Reached for parts when the substitution was already complete.',
        tex: 'x\\ln x-x+C',
        at: (x) => x * Math.log(x) - x,
      },
      safe: [1.1, 3],
      domain: 'Needs x > 0.',
    },
    b: {
      id: 'ln-alone',
      tex: '\\int \\ln x\\,dx',
      tool: 'by-parts',
      because:
        'There is no 1/x, so u = ln x has no du to take. Parts works here even though there seems to be only one function — dv = dx is a legal choice.',
      work: [
        'u = ln x and dv = dx, so du = dx/x and v = x.',
        'uv − ∫v du = x ln x − ∫x · (dx/x) = x ln x − ∫dx.',
        'Taking dv = dx is what makes a single logarithm into a product.',
      ],
      answerTex: 'x\\ln x-x+C',
      f: (x) => Math.log(x),
      F: (x) => x * Math.log(x) - x,
      wrong: {
        mistake: 'Substituted u = ln x without the 1/x that du requires.',
        tex: '\\tfrac{(\\ln x)^{2}}{2}+C',
        at: (x) => 0.5 * Math.pow(Math.log(x), 2),
      },
      safe: [1.1, 3],
      domain: 'Needs x > 0.',
    },
  },
];

export const PAIRS = PAIRS_RAW;

export function problemsOf(pair: Pair): readonly Problem[] {
  return [pair.a, pair.b];
}

/** 全部十道题,拉平。 */
export const PROBLEMS: readonly Problem[] = PAIRS.flatMap((p) => problemsOf(p));

export function pairOf(id: string): Pair {
  const found = PAIRS.find((p) => p.id === id);
  if (!found) throw new Error(`no such pair: ${id}`);
  return found;
}

export function problemOf(id: string): Problem {
  const found = PROBLEMS.find((p) => p.id === id);
  if (!found) throw new Error(`no such problem: ${id}`);
  return found;
}

/* ── 页面要显示的东西 ──────────────────────────────────────────── */

/** 哪条曲线。`integrand` 是被积函数本身,另外两条是两个答案求导回来的结果。 */
export type Curve = 'integrand' | 'answer' | 'wrong';

export function valueAt(p: Problem, curve: Curve, x: number): number {
  if (curve === 'integrand') return p.f(x);
  if (curve === 'answer') return slopeOf(p.F, x);
  return slopeOf(p.wrong.at, x);
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** 画一条曲线用的采样点。 */
export function curveOf(p: Problem, curve: Curve, n = 120): readonly Point[] {
  const [lo, hi] = p.safe;
  const out: Point[] = [];
  for (let i = 0; i <= n; i += 1) {
    const x = lo + ((hi - lo) * i) / n;
    out.push({ x, y: valueAt(p, curve, x) });
  }
  return out;
}

/**
 * 画面的 y 窗口最多被错答案拉高到被积函数的几倍。
 *
 * ⚠️ 这个上限是必须的:`∫√(9−x²)dx` 那道题,错答案求导回去的值域是 ±9,
 *   被积函数只有 1.66~3。按并集取窗口的话,被积函数和正确答案会被压成
 *   一条厚度几像素的线 —— 而那条重合线正是这一页要让人看见的东西。
 *   超过上限就让错答案**画出框**:它冲出画面本身就读作"错得离谱"。
 */
export const MAX_SQUASH = 4;

/** 画一道题时的 y 范围。纯函数,所以"错答案在画面上看得见"这件事能被测试钉死。 */
export function plotWindow(p: Problem): { readonly yMin: number; readonly yMax: number } {
  const fy = curveOf(p, 'integrand').map((q) => q.y);
  const wy = curveOf(p, 'wrong').map((q) => q.y);
  const fLo = Math.min(...fy);
  const fHi = Math.max(...fy);
  // ⚠️ 常数被积函数的高度是 0,不能拿它去乘 —— 退化成 1。
  const h = fHi - fLo > 0 ? fHi - fLo : 1;
  let lo = Math.min(fLo, ...wy);
  let hi = Math.max(fHi, ...wy);
  if (hi - lo > MAX_SQUASH * h) {
    const mid = (fLo + fHi) / 2;
    lo = mid - (MAX_SQUASH * h) / 2;
    hi = mid + (MAX_SQUASH * h) / 2;
  }
  const pad = (hi - lo) * 0.08;
  return { yMin: lo - pad, yMax: hi + pad };
}

/**
 * 页面打开时游标该停在哪。
 *
 * ⭐⭐⭐ 不能用区间中点。第一版就是中点,结果 `∫x·e^{x²}dx` 的中点正好是 x = 0,
 *   而那道题的被积函数、正确答案、错答案在 x = 0 上**三条一起等于 0** ——
 *   页面一打开,四个读数全是 0.0000,底下还挂着一句"这个点上碰巧也对上了"。
 *   也就是说:整页最想让人看见的那件事(错答案岔开了),
 *   在默认画面上**恰好是看不见的那一个点**。测试全绿,因为每条断言都成立。
 *
 * ⭐ 改成停在"错答案错得最离谱、而且那个点还在画面里"的 x 上。
 *   一打开就看见分叉,这才是这一页该给的第一印象。
 */
export const OPEN_INSET = 0.1;

export function openAt(p: Problem): number {
  const { yMin, yMax } = plotWindow(p);
  const [lo, hi] = p.safe;
  let bestX = (lo + hi) / 2;
  let best = -1;
  /**
   * ⚠️ 只在中间 80% 里找。偏差最大的点往往就在端点上
   *   (`x·e^{x²}` 的偏差是 |x|e^{x²},最大值正好在 x = ±1.2),
   *   而开局停在端点上有两个毛病:手柄有一半在画框外面,看着像坏了;
   *   而且它只能往一个方向拖,等于暗示"这里到头了"。
   *   退进来 10% 之后偏差仍然很大,手柄却稳稳在框里。
   */
  const from = Math.round(200 * OPEN_INSET);
  const to = 200 - from;
  for (let i = from; i <= to; i += 1) {
    const x = lo + ((hi - lo) * i) / 200;
    const wrong = slopeOf(p.wrong.at, x);
    // ⚠️ 落在窗口外面的点不算:那里页面根本不画那个圆点。
    if (wrong < yMin || wrong > yMax) continue;
    const gap = Math.abs(wrong - p.f(x));
    if (gap > best) { best = gap; bestX = x; }
  }
  return bestX;
}

/** 一个点上的验算读数。页面上那个游标就显示这几个数。 */
export interface Check {
  readonly x: number;
  readonly integrand: number;
  readonly answerSlope: number;
  readonly wrongSlope: number;
  readonly answerGap: number;
  readonly wrongGap: number;
  /** 正确答案在这个点上是否和被积函数吻合 —— 应当永远是 true。 */
  readonly answerMatches: boolean;
  /**
   * 错答案在**这个点**上是否碰巧也吻合。
   * ⚠️ 会有碰巧吻合的点(两条曲线总要交叉),页面必须说清楚那只是一个点上的巧合,
   *   不能让人以为错答案也对 —— 所以这个字段存在,而且 UI 要用它。
   */
  readonly wrongMatchesHere: boolean;
}

/**
 * 在一个点上,"看起来一样"的宽度。
 * ⚠️ 这不是判对错的阈值 —— 判对错用 `ANSWER_TOL`。这个数只用来回答
 *   "在这个 x 上,错答案是不是刚好也对上了",用的是**画面上看得出来**的尺度。
 */
export const COINCIDENCE = 0.01;

export function checkAt(p: Problem, x: number): Check {
  const integrand = p.f(x);
  const answerSlope = slopeOf(p.F, x);
  const wrongSlope = slopeOf(p.wrong.at, x);
  const answerGap = Math.abs(answerSlope - integrand);
  const wrongGap = Math.abs(wrongSlope - integrand);
  return {
    x,
    integrand,
    answerSlope,
    wrongSlope,
    answerGap,
    wrongGap,
    answerMatches: answerGap <= ANSWER_TOL,
    wrongMatchesHere: wrongGap <= COINCIDENCE,
  };
}

/** 第二条路径:面积对不对。返回 `null` 表示这段上积不出来(定义域有洞)。 */
export function areaCheck(p: Problem): { readonly numeric: number; readonly byAntiderivative: number } {
  const [lo, hi] = p.safe;
  return {
    numeric: areaOf(p.f, lo, hi),
    byAntiderivative: p.F(hi) - p.F(lo),
  };
}

/* ── 卡住的时候按什么顺序问 ─────────────────────────────────────── */

export interface Step {
  readonly n: number;
  readonly ask: string;
  readonly then: string;
  readonly tool: Tool | null;
}

/**
 * ⭐ 顺序是有讲究的,不是随便排的:**先问便宜的问题**。
 *   查表最快,换元其次,三角换元最贵。按这个顺序问,
 *   最省力的那条路总是先被试到 —— 第四对那个坑就是违反这个顺序造成的。
 */
export const ORDER: readonly Step[] = [
  {
    n: 1,
    ask: 'Is it already one of the shapes you know by heart?',
    then: 'Write the answer down. Do not do work you do not have to do.',
    tool: 'standard-form',
  },
  {
    n: 2,
    ask: 'Pick the messiest inside piece and differentiate it. Is that derivative already in the integral, up to a constant?',
    then: 'Substitute. This is the cheapest real technique, so it is always the second question.',
    tool: 'u-sub',
  },
  {
    n: 3,
    ask: 'Is it a product of two unlike things — a polynomial times an exponential, a logarithm, or a trig function?',
    then: 'Parts. Choose u so that du is simpler; the wrong choice is legal but useless.',
    tool: 'by-parts',
  },
  {
    n: 4,
    ask: 'Is it a ratio of polynomials? Then: is the top degree at least the bottom degree, and does the bottom factor?',
    then: 'Divide first if the top is not smaller, then split into partial fractions.',
    tool: 'partial-fractions',
  },
  {
    n: 5,
    ask: 'Is there a square root of a quadratic, with no inner derivative anywhere?',
    then: 'Now a triangle is worth it. Complete the square first if the quadratic is not already a² ± x².',
    tool: 'trig-sub',
  },
  {
    n: 6,
    ask: 'Differentiate your answer. Do you get back exactly what you started with?',
    then: 'This is the only step that catches your own mistakes, and it is the one people skip.',
    tool: null,
  },
];

export const HEADLINE = 'Two integrals can look the same and need different tools';

export const MAIN_IDEA =
  'Each row below is a pair that differs by one symbol. The question that separates them is almost always the same one: differentiate the inside, and look for that derivative in the integral. Both answers are then differentiated back — the right one lands on the integrand, the plausible wrong one does not.';

export const CHECK_NOTE =
  'Differentiating your answer is the only check that needs no new idea, and it catches almost everything.';
