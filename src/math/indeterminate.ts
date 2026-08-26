/**
 * MATH — 不定式 `0/0`:代入之后**什么都还没知道**。
 *
 * ⚠️⚠️ 这一节要打掉的错误是 `0/0 = 1` 和 `0/0 = 0`。两个都不对,
 * 但**纠正的方式不是给一个正确答案** —— 正确的说法是:
 * 「`0/0` 这个式子本身没有定义;而当极限的直接代入给出这个**形状**时,
 *   它是一条警告:分子分母各自怎么趋近于 0,还没被问出来。」
 *
 * ⭐⭐ 这个模块的结构本身就是那个论证:
 *   · `substitutionForm(id)` 对**四个例子返回完全同一个字符串**;
 *   · `answerOf(id)` 对四个例子给出**四个互不相同的结局**。
 * 于是「同一个输入 → 四种输出」不是一句话,是一个可以被测试钉死的事实:
 * 代入这个函数**丢掉了**区分它们所需要的信息。
 *
 * ⚠️ 两条独立路径都不许偷看对方:
 *   路径 A `verdictByRates` —— 只看分子分母的**幂次**与符号,纯算术,不取样;
 *   路径 B `verdictBySampling` —— 只调 `quotient`(老老实实做除法),不看幂次表。
 *
 * ⚠️ `quotient(id, 0)` 返回 `null`,不返回 NaN。JS 里 `0/0` 就是 NaN 且**不报错** ——
 * 让它流到屏幕上,这一节就会在讲「0/0 没有定义」的同一页上写出一个 NaN。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import { showNumber, showScientific } from './format';

export const A = 0;

/** 四个例子。名字说的是**分子分母谁缩得快**,不是答案。 */
export type CaseId = 'same' | 'faster-top' | 'faster-bottom' | 'sign-jump';

/** 结局只有三种:收到一个数、无界、两侧不一致。 */
export type Verdict = 'value' | 'unbounded' | 'jump';

export type Side = 'left' | 'right';

export const CASES: readonly CaseId[] = ['same', 'faster-top', 'faster-bottom', 'sign-jump'];

/* ══ 分子与分母:各自是什么 ════════════════════════════════════════ */

interface Parts {
  readonly numerator: (x: number) => number;
  readonly denominator: (x: number) => number;
  readonly numeratorTex: string;
  readonly denominatorTex: string;
  readonly ratioTex: string;
  /** 化简之后的形状(x ≠ 0 时才成立 —— 界面上必须写出这个前提) */
  readonly simplifiedTex: string;
  readonly simplified: (x: number) => number;
}

const PARTS: Readonly<Record<CaseId, Parts>> = {
  same: {
    numerator: (x) => x,
    denominator: (x) => x,
    numeratorTex: 'x',
    denominatorTex: 'x',
    ratioTex: '\\frac{x}{x}',
    simplifiedTex: '1',
    simplified: () => 1,
  },
  'faster-top': {
    numerator: (x) => x * x,
    denominator: (x) => x,
    numeratorTex: 'x^2',
    denominatorTex: 'x',
    ratioTex: '\\frac{x^2}{x}',
    simplifiedTex: 'x',
    simplified: (x) => x,
  },
  'faster-bottom': {
    numerator: (x) => x,
    denominator: (x) => x * x,
    numeratorTex: 'x',
    denominatorTex: 'x^2',
    ratioTex: '\\frac{x}{x^2}',
    simplifiedTex: '\\frac{1}{x}',
    simplified: (x) => 1 / x,
  },
  'sign-jump': {
    numerator: (x) => Math.abs(x),
    denominator: (x) => x,
    numeratorTex: '\\lvert x \\rvert',
    denominatorTex: 'x',
    ratioTex: '\\frac{\\lvert x \\rvert}{x}',
    simplifiedTex: '\\operatorname{sign}(x)',
    simplified: (x) => Math.sign(x),
  },
};

export function numerator(id: CaseId, x: number): number {
  return PARTS[id].numerator(x);
}

export function denominator(id: CaseId, x: number): number {
  return PARTS[id].denominator(x);
}

export function partsOf(id: CaseId): Parts {
  return PARTS[id];
}

/**
 * 老老实实做除法。⚠️ `x = 0` 时四个例子**全都**是 `0/0` = NaN(JS 不报错),
 * 下面这一行把它挡成 `null`。
 *
 * ⚠️ 判据是**有限性**,不是 `x === 0`。`faster-bottom` 在 x = 1e-200 附近
 * 会溢出成 Infinity —— 那同样是一个不能上屏的假值。
 */
export function quotient(id: CaseId, x: number): number | null {
  if (!Number.isFinite(x)) return null;
  const y = PARTS[id].numerator(x) / PARTS[id].denominator(x);
  return Number.isFinite(y) ? y : null;
}

/* ══ 直接代入:⭐ 四个例子给出同一个字符串 ═══════════════════════════ */

/**
 * ⭐⭐ 这一节的**支点**。
 *
 * 它真的去算 `分子(0)` 和 `分母(0)` —— 那正是「直接代入」的定义 ——
 * 然后把两个结果拼成一个形状。四个例子的两个结果都精确地是 0,
 * 所以四个字符串**完全一样**。
 *
 * ⚠️ 不许把这个字符串写死成常量 `'0/0'`。
 * 但**光靠这四个例子测不出来** —— 它们的代入结果本来就都是 `0/0`,
 * 写死和算出来在这份数据上完全等价(变异测试确认过:写死之后全绿)。
 * 所以把拼字符串那一步抽成 `substitutionFormOf(top, bottom)`,
 * 用一对**非零**的输入去钉它。这和 ε–δ、夹逼那两节用可注入函数的做法是同一招:
 * 当「整段成立」在现有数据上退化成「端点成立」时,得造一个数据把契约钉住。
 */
export function substitutionFormOf(top: number, bottom: number): string {
  return `${showNumber(top, 0)}/${showNumber(bottom, 0)}`;
}

export function substitutionForm(id: CaseId): string {
  return substitutionFormOf(PARTS[id].numerator(A), PARTS[id].denominator(A));
}

/** 代入之后是不是落进了不定式。 */
export function isIndeterminate(id: CaseId): boolean {
  return PARTS[id].numerator(A) === 0 && PARTS[id].denominator(A) === 0;
}

/* ══ 路径 A —— 幂次算术(「谁缩得快」) ═══════════════════════════════ */

/**
 * ⚠️ 这张表描述的是**形状**,不是答案:每一项写成 `系数 · |x|^幂次 · (符号)`。
 * 结论由下面的 `verdictByRates` **算**出来,表里没有任何一处写着 1、0 或 DNE。
 */
interface Rates {
  readonly topPower: number;
  readonly bottomPower: number;
  /** 商在 x 变号时是否跟着变号(|x|/x 是唯一会的) */
  readonly signFlips: boolean;
  readonly coefficient: number;
}

const RATES: Readonly<Record<CaseId, Rates>> = {
  same: { topPower: 1, bottomPower: 1, signFlips: false, coefficient: 1 },
  'faster-top': { topPower: 2, bottomPower: 1, signFlips: false, coefficient: 1 },
  'faster-bottom': { topPower: 1, bottomPower: 2, signFlips: false, coefficient: 1 },
  // |x| 不变号、x 变号 ⇒ 商变号。
  'sign-jump': { topPower: 1, bottomPower: 1, signFlips: true, coefficient: 1 },
};

export function ratesOf(id: CaseId): Rates {
  return RATES[id];
}

/** 「谁缩得快」—— 竞速那一节的心智模型,直接从幂次读出来。 */
export type Race = 'top-faster' | 'bottom-faster' | 'same-rate';

export function raceOf(id: CaseId): Race {
  const r = RATES[id];
  if (r.topPower > r.bottomPower) return 'top-faster';
  if (r.topPower < r.bottomPower) return 'bottom-faster';
  return 'same-rate';
}

export function verdictByRates(id: CaseId): Verdict {
  const race = raceOf(id);
  if (race === 'top-faster') return 'value'; // 分子先归零 ⇒ 商 → 0
  if (race === 'bottom-faster') return 'unbounded'; // 分母先归零 ⇒ 商炸开
  return RATES[id].signFlips ? 'jump' : 'value';
}

/** 路径 A 给出的那个数(不存在时 null)。 */
export function limitByRates(id: CaseId): number | null {
  const verdict = verdictByRates(id);
  if (verdict !== 'value') return null;
  return raceOf(id) === 'top-faster' ? 0 : RATES[id].coefficient;
}

/* ══ 路径 B —— 取样(只调 quotient,不看幂次表) ════════════════════ */

/** 十进位阶梯上的取样点。⚠️ 用字符串构造,`10 ** -k` 不是精确的十进位。 */
export function ladder(side: Side, depth = 8): readonly number[] {
  return Array.from({ length: depth }, (_, i) => {
    const magnitude = Number(`1e-${i + 1}`);
    return side === 'left' ? -magnitude : magnitude;
  });
}

/** 某一侧的取样值。`null` 会被过滤掉 —— 但 x 本身从不为 0,所以不该有。 */
export function probe(id: CaseId, side: Side, depth = 8): readonly number[] {
  return ladder(side, depth)
    .map((x) => quotient(id, x))
    .filter((v): v is number => v !== null);
}

/** 无界的判据:样本的绝对值一路变大,而且最后一个已经很大。 */
function runsAway(values: readonly number[]): boolean {
  if (values.length < 3) return false;
  for (let i = 1; i < values.length; i += 1) {
    if (Math.abs(values[i]!) <= Math.abs(values[i - 1]!)) return false;
  }
  return Math.abs(values[values.length - 1]!) > 1e6;
}

/** 收敛到哪儿:尾部若已稳定,给出那个值;否则 null。 */
export function approachedFrom(id: CaseId, side: Side, depth = 8): number | null {
  const values = probe(id, side, depth);
  if (values.length < 3) return null;
  if (runsAway(values)) return null;
  const last = values[values.length - 1]!;
  const previous = values[values.length - 2]!;
  return Math.abs(last - previous) < 1e-6 ? last : null;
}

/**
 * ⚠️ 判「两侧是否同一个去向」的容差。
 *
 * **不能取得比取样阶梯本身还紧。** `x²/x` 在 10⁻⁸ 处两侧读到 ±10⁻⁸,
 * 差 2×10⁻⁸ —— 用 1e-9 的容差会把这个明明收敛到 0 的例子判成「两侧不一致」,
 * 而那正是这一节要区分开的另一种结局。取样的深度决定了能主张的精度,不是反过来。
 */
export const SETTLE = 1e-6;

export function verdictBySampling(id: CaseId, depth = 8): Verdict {
  const left = probe(id, 'left', depth);
  const right = probe(id, 'right', depth);
  if (runsAway(left) || runsAway(right)) return 'unbounded';
  const l = approachedFrom(id, 'left', depth);
  const r = approachedFrom(id, 'right', depth);
  if (l === null || r === null) return 'unbounded';
  return Math.abs(l - r) < SETTLE ? 'value' : 'jump';
}

/* ══ 结局 ══════════════════════════════════════════════════════════ */

export interface Answer {
  readonly verdict: Verdict;
  /** 只有 verdict === 'value' 时才有数 */
  readonly value: number | null;
  /** 屏幕上写的那句话 */
  readonly headline: string;
  /** 数学式子 */
  readonly tex: string;
}

/**
 * ⚠️ 文案从 `verdict` **推**出来,不是四份手写的字符串 ——
 * 否则「四个结局互不相同」这条断言就只是在比较四段复制来的文字。
 */
export function answerOf(id: CaseId): Answer {
  const verdict = verdictByRates(id);
  const value = limitByRates(id);
  if (verdict === 'value') {
    return {
      verdict,
      value,
      headline: `the limit is ${value}`,
      tex: `\\boxed{${value}}`,
    };
  }
  if (verdict === 'unbounded') {
    return {
      verdict,
      value: null,
      // ⚠️ 不写 "= ∞"。上一节立的规矩:∞ 不是一个数。
      headline: 'the two sides run off without bound',
      tex: '\\text{no two-sided limit}',
    };
  }
  return {
    verdict,
    value: null,
    headline: 'the two sides settle on different numbers',
    tex: '\\text{DNE}',
  };
}

/**
 * 两侧各自的去向。无界时是 null —— 界面上写「without bound」而不是一个数。
 *
 * ⚠️ 收敛的情形用 `limitByRates`(推理),**不用**取样值。
 * `x²/x` 在 10⁻⁸ 处的取样是 ∓10⁻⁸,照着显示会写出 `−0.0000` ——
 * 一个带负号的零,在一节讲「极限是 0」的课上是刺眼的错。
 */
export function sideValue(id: CaseId, side: Side): number | null {
  const verdict = verdictByRates(id);
  if (verdict === 'unbounded') return null;
  if (verdict === 'value') return limitByRates(id);
  return approachedFrom(id, side);
}

/** 无界时往哪个方向跑。 */
export function sideDirection(id: CaseId, side: Side): 'up' | 'down' | null {
  if (verdictByRates(id) !== 'unbounded') return null;
  const values = probe(id, side);
  const last = values[values.length - 1];
  if (last === undefined) return null;
  return last > 0 ? 'up' : 'down';
}

/* ══ 竞速:两根缩短的条 ════════════════════════════════════════════ */

export interface RaceBars {
  readonly x: number;
  readonly top: number;
  readonly bottom: number;
  /** 条长归一化到 [0, 1],按**起点**的长度 */
  readonly topFraction: number;
  readonly bottomFraction: number;
  readonly ratio: number | null;
}

export const RACE_START = 1;

/**
 * 竞速面板的读数。⚠️ 两根条按**同一个起点**归一化,
 * 否则「谁缩得快」在画面上就没有可比性 —— 那正是要看的东西。
 */
export function raceBars(id: CaseId, x: number): RaceBars {
  const top = Math.abs(PARTS[id].numerator(x));
  const bottom = Math.abs(PARTS[id].denominator(x));
  const topStart = Math.abs(PARTS[id].numerator(RACE_START));
  const bottomStart = Math.abs(PARTS[id].denominator(RACE_START));
  return {
    x,
    top,
    bottom,
    topFraction: topStart === 0 ? 0 : top / topStart,
    bottomFraction: bottomStart === 0 ? 0 : bottom / bottomStart,
    ratio: quotient(id, x),
  };
}

/**
 * 竞速条在屏幕上的**显示**长度。⚠️ 不是 `fraction` 本身。
 *
 * 直接按比例画的话,x = 0.01 时 x² 那根条只剩万分之一 —— 两根条在屏幕上
 * **都是零**,「谁缩得快」这件唯一要看的事反而消失了。
 * 开三次方把差距压回可视范围,而且**保序**:f₁ < f₂ ⟹ 显示长度也更短。
 *
 * ⚠️ 压缩过就要说出来(和无穷极限那一节的「放大了就写在角上」同一条规矩):
 * 界面上必须同时给出**真实数字**,并写明长度是压缩过的。
 */
export function barLength(fraction: number): number {
  if (!Number.isFinite(fraction) || fraction <= 0) return 0;
  return Math.min(1, fraction) ** (1 / 3);
}

export const BAR_SCALE_NOTE =
  'Bar lengths are cube-rooted so both stay visible at small x. The numbers beside them are exact.';

/** 竞速的**取样**判定 —— 与 `raceOf`(幂次)互为独立路径。 */
export function raceBySampling(id: CaseId, depth = 8): Race {
  const near = raceBars(id, Number(`1e-${depth}`));
  // 谁的剩余比例更小,谁就缩得更快。
  if (near.topFraction < near.bottomFraction * 0.5) return 'top-faster';
  if (near.bottomFraction < near.topFraction * 0.5) return 'bottom-faster';
  return 'same-rate';
}

export const RACE_COPY: Readonly<Record<Race, { readonly words: string; readonly then: string }>> = {
  'top-faster': {
    words: 'the numerator shrinks faster',
    then: 'so the quotient is squeezed toward 0',
  },
  'bottom-faster': {
    words: 'the denominator shrinks faster',
    then: 'so the quotient grows without bound',
  },
  'same-rate': {
    words: 'both shrink at the same rate',
    then: 'so the quotient holds steady',
  },
};

/* ══ 画曲线 ════════════════════════════════════════════════════════ */

export const VIEW = { from: -2.2, to: 2.2 } as const;

/** 曲线在原点两侧各自停在离 0 多远的地方。断开的那道缝就是洞。 */
export const HOLE_GAP = 0.004;

/**
 * 取样。⚠️ **左右两半分开取样**,中间留一道缝 —— 那里没有值,
 * 连过去就把洞抹平了,而这四张图的洞正是要看的东西。
 *
 * ⚠️ 第一版是「整段等距取样,靠半格偏移躲开 0」。
 * 它在 `count = 400` 时**正好踩中** 0(区间对称、点数为奇数,中点就落在原点),
 * 于是 `Math.abs(0)/0` = NaN 一路传到 `Math.round`,D 那张图多出一个 y = 0 的点。
 * 「躲开一个特定的点」不该交给取样算术去碰运气 —— 分段是结构性的。
 */
export function sampleQuotient(
  id: CaseId,
  from: number = VIEW.from,
  to: number = VIEW.to,
  count = 400,
): readonly { x: number; y: number | null }[] {
  const half = Math.max(2, Math.floor(count / 2));
  const arm = (start: number, end: number) =>
    Array.from({ length: half + 1 }, (_, i) => {
      const x = start + ((end - start) * i) / half;
      return { x, y: quotient(id, x) };
    });
  return [...arm(from, -HOLE_GAP), ...arm(HOLE_GAP, to)];
}

/** 图上要标的洞(有值可标时才标)。 */
export function holeAt(id: CaseId, side: Side): { x: number; y: number } | null {
  const v = sideValue(id, side);
  return v === null ? null : { x: A, y: v };
}

/* ══ 别的不定式 ════════════════════════════════════════════════════ */

/**
 * ⚠️ 这一节**不教**它们。列出来只为说一句话:
 * 这些形状同样不由自身决定答案。所以这张表里**没有 answer 字段** ——
 * 结构上就写不出「∞/∞ = 1」这种东西。
 */
export const OTHER_FORMS: readonly { readonly tex: string; readonly name: string }[] = [
  { tex: '\\frac{0}{0}', name: 'zero over zero' },
  { tex: '\\frac{\\infty}{\\infty}', name: 'infinity over infinity' },
  { tex: '0 \\cdot \\infty', name: 'zero times infinity' },
  { tex: '\\infty - \\infty', name: 'infinity minus infinity' },
  { tex: '1^{\\infty}', name: 'one to the infinity' },
  { tex: '0^{0}', name: 'zero to the zero' },
  { tex: '\\infty^{0}', name: 'infinity to the zero' },
];

export const OTHER_FORMS_NOTE =
  'None of these forms determines an answer by itself. Each one is a signal to look closer.';

/* ══ 文案与显示 ════════════════════════════════════════════════════ */

export const CASE_LABEL: Readonly<Record<CaseId, string>> = {
  same: 'A',
  'faster-top': 'B',
  'faster-bottom': 'C',
  'sign-jump': 'D',
};

export function limitTex(id: CaseId): string {
  return `\\lim_{x \\to ${A}} ${PARTS[id].ratioTex}`;
}

export function showValue(value: number | null, places = 4): string {
  return value === null ? 'undefined' : showNumber(value, places);
}

export function showX(x: number): string {
  const abs = Math.abs(x);
  if (abs >= 0.001 || abs === 0) return showNumber(x, 4);
  return showScientific(x, 0);
}

/** 两句必须同时在场的话。第二句才是这一节的结论。 */
export const NOT_ENOUGH = 'WE NEED MORE INFORMATION';
export const WARNING_WORDS =
  'Substitution gave a shape, not an answer. Ask how the numerator and denominator each approach zero.';
export const UNDEFINED_WORDS =
  'As plain arithmetic, 0 divided by 0 is undefined — it is not 1 and it is not 0.';
