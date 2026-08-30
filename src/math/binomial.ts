/**
 * MATH — 二项式定理 `(a+b)ⁿ = Σ C(n,k) a^(n−k) b^k`。
 *
 * ⭐⭐ 这一课不教「查帕斯卡三角」,教**系数是从哪来的**:
 *   `(a+b)⁴` 就是四个括号相乘。要凑出 `a²b²`,得从**恰好两个**括号里取 b。
 *   取法有几种?`C(4,2) = 6` 种。所以系数是 6。
 *   系数**就是**「b 从哪几个括号来」的方案数 —— 不是一张要背的表。
 *
 * ⭐ 三条互不相干的路径算同一个系数:
 *   ① `byPascal`   —— 递推 `C(n,k) = C(n−1,k−1) + C(n−1,k)`,只用加法;
 *   ② `byFactorial`—— `n! / (k!(n−k)!)`,只用乘除;
 *   ③ `byCounting` —— **真的把所有子集列出来数一遍**,只用枚举。
 * 三条必须给出同一个整数。第三条同时是界面上那张「选哪几个括号」的图的数据源,
 * 于是图上画的和公式算的是**同一件事**,不是两件恰好一致的事。
 *
 * ⚠️ 系数必须是**精确整数**。`n!` 在 n = 21 之后超出 double 的安全整数范围,
 * 而阶乘写法会先算出 n! 再除 —— 早在 n = 21 就开始给出错的整数。
 * 递推只做加法,到很大的 n 都还精确。所以**对外的 `choose` 走递推**,
 * 阶乘那条只当第二条验证路径(并在测试里钉住它什么时候开始不可信)。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */

/** 界面上滑块能到的最大 n。 */
export const MAX_N = 6;
/** 帕斯卡三角要摆出来的行数 */
export const PASCAL_ROWS = MAX_N + 1;

/* ══ 系数:三条独立路径 ════════════════════════════════════════════ */

/**
 * 路径 ① —— 递推。只做加法,所以到很大的 n 都还是精确整数。
 * ⚠️ 对外的 `choose` 就是它,理由见文件开头。
 */
export function byPascal(n: number, k: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0) return 0;
  if (k < 0 || k > n) return 0;
  let row: number[] = [1];
  for (let r = 1; r <= n; r += 1) {
    const next: number[] = [1];
    for (let i = 1; i < r; i += 1) next.push(row[i - 1]! + row[i]!);
    next.push(1);
    row = next;
  }
  return row[k]!;
}

/** 路径 ② —— 阶乘写法。⚠️ 只作为第二条验证路径,不对外当主路径。 */
export function byFactorial(n: number, k: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0 || k < 0 || k > n) return 0;
  const factorial = (m: number): number => {
    let out = 1;
    for (let i = 2; i <= m; i += 1) out *= i;
    return out;
  };
  return factorial(n) / (factorial(k) * factorial(n - k));
}

/**
 * 路径 ③ —— **枚举**。列出「从 n 个括号里挑 k 个出 b」的所有方案,数一数。
 * 返回的是方案本身(每个方案是一串下标),不是一个数 ——
 * 界面上那张图就画这些方案,于是**图和公式说的是同一件事**。
 *
 * ⚠️ n 只到 MAX_N,2^n ≤ 64,枚举完全够用。
 */
export function selections(n: number, k: number): readonly (readonly number[])[] {
  if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0 || k < 0 || k > n) return [];
  const out: number[][] = [];
  const walk = (start: number, picked: number[]) => {
    if (picked.length === k) { out.push([...picked]); return; }
    for (let i = start; i < n; i += 1) {
      picked.push(i);
      walk(i + 1, picked);
      picked.pop();
    }
  };
  walk(0, []);
  return out;
}

export function byCounting(n: number, k: number): number {
  return selections(n, k).length;
}

/** 对外的系数。走递推。 */
export function choose(n: number, k: number): number {
  return byPascal(n, k);
}

/* ══ 帕斯卡三角 ════════════════════════════════════════════════════ */

export function pascalRow(n: number): readonly number[] {
  return Array.from({ length: n + 1 }, (_, k) => choose(n, k));
}

export function pascalTriangle(rows = PASCAL_ROWS): readonly (readonly number[])[] {
  return Array.from({ length: rows }, (_, n) => pascalRow(n));
}

/**
 * ⭐ 每个数都是它上面两个数之和 —— 三角形之所以能那样"长"出来的理由。
 * 这条在界面上是可以指着看的,所以也值得钉住。
 */
export function grewFromAbove(rows = PASCAL_ROWS): boolean {
  const triangle = pascalTriangle(rows);
  for (let n = 1; n < triangle.length; n += 1) {
    const row = triangle[n]!;
    const above = triangle[n - 1]!;
    for (let k = 0; k <= n; k += 1) {
      const left = k > 0 ? above[k - 1]! : 0;
      const right = k < n ? above[k]! : 0;
      if (row[k] !== left + right) return false;
    }
  }
  return true;
}

/* ══ 展开式 ════════════════════════════════════════════════════════ */

export interface BinomialTerm {
  readonly k: number;
  readonly coefficient: number;
  /** a 的次数 */
  readonly aPower: number;
  /** b 的次数 */
  readonly bPower: number;
  readonly tex: string;
  /** 代入具体的 a、b 求值 */
  readonly at: (a: number, b: number) => number;
}

function powerTex(symbol: string, power: number): string {
  if (power === 0) return '';
  if (power === 1) return symbol;
  return `${symbol}^{${power}}`;
}

export function termOf(n: number, k: number): BinomialTerm {
  const coefficient = choose(n, k);
  const aPower = n - k;
  const bPower = k;
  const body = `${powerTex('a', aPower)}${powerTex('b', bPower)}`;
  const head = coefficient === 1 ? '' : String(coefficient);
  return {
    k,
    coefficient,
    aPower,
    bPower,
    tex: body === '' ? String(coefficient) : `${head}${body}`,
    at: (a, b) => coefficient * a ** aPower * b ** bPower,
  };
}

export function termsOf(n: number): readonly BinomialTerm[] {
  return Array.from({ length: n + 1 }, (_, k) => termOf(n, k));
}

export function expansionTex(n: number): string {
  return termsOf(n).map((term) => term.tex).join(' + ');
}

/** 路径 A —— 逐项求和。 */
export function valueByTerms(n: number, a: number, b: number): number {
  return termsOf(n).reduce((sum, term) => sum + term.at(a, b), 0);
}

/** 路径 B —— 直接乘方。⚠️ 与逐项求和必须一致,这是整条定理的检验。 */
export function valueByPower(n: number, a: number, b: number): number {
  return (a + b) ** n;
}

/* ══ 指数机 ════════════════════════════════════════════════════════ */

/** ⭐ 两个指数**永远加到 n**。界面上那条横带就是画它。 */
export function exponentsAddUp(n: number): boolean {
  return termsOf(n).every((term) => term.aPower + term.bPower === n);
}

export const EXPONENT_WORDS = 'The exponents always add to n.';

/* ══ 通项 ══════════════════════════════════════════════════════════ */

export interface GeneralTerm {
  readonly n: number;
  readonly k: number;
  readonly coefficient: number;
  readonly aPower: number;
  readonly bPower: number;
  readonly tex: string;
}

export function generalTerm(n: number, k: number): GeneralTerm {
  const clampedN = Math.max(0, Math.round(Number.isFinite(n) ? n : 0));
  const clampedK = Math.min(Math.max(0, Math.round(Number.isFinite(k) ? k : 0)), clampedN);
  const term = termOf(clampedN, clampedK);
  return {
    n: clampedN,
    k: clampedK,
    coefficient: term.coefficient,
    aPower: term.aPower,
    bPower: term.bPower,
    tex: term.tex,
  };
}

/** 通项的 TeX 骨架。⚠️ 这里**不代数字**,那是给学生看结构用的。 */
export const GENERAL_TEX = '\\binom{n}{k}\\,a^{n-k}b^{k}';
export const THEOREM_TEX = '(a+b)^n = \\sum_{k=0}^{n} \\binom{n}{k}\\,a^{n-k}b^{k}';
export const SIGMA_WORDS = 'Generate one term for every k from 0 to n. That is all the sigma says.';

/* ══ 「怎么凑出这一项」 ════════════════════════════════════════════ */

export interface Question {
  readonly n: number;
  readonly k: number;
  readonly targetTex: string;
  readonly ask: string;
  readonly answer: number;
}

/** 提示词点名的那两问,外加通用构造。 */
export function questionFor(n: number, k: number): Question {
  const term = termOf(n, k);
  const target = `${powerTex('a', term.aPower)}${powerTex('b', term.bPower)}` || '1';
  return {
    n,
    k,
    targetTex: target,
    ask: `Pick b from exactly ${k} of the ${n} factors. How many ways?`,
    answer: choose(n, k),
  };
}

/** 一个方案在界面上长什么样:n 个格子,选中的那几个出 b。 */
export function slotsOf(n: number, picked: readonly number[]): readonly ('a' | 'b')[] {
  const set = new Set(picked);
  return Array.from({ length: n }, (_, i) => (set.has(i) ? 'b' : 'a'));
}

/**
 * ⭐ 每个方案的 a 个数与 b 个数都对得上那一项的次数。
 * 这条把「图上画的」和「公式里写的」绑死。
 */
export function selectionsMatchTerm(n: number, k: number): boolean {
  const term = termOf(n, k);
  const all = selections(n, k);
  if (all.length !== term.coefficient) return false;
  return all.every((picked) => {
    const slots = slotsOf(n, picked);
    return (
      slots.filter((s) => s === 'b').length === term.bPower &&
      slots.filter((s) => s === 'a').length === term.aPower
    );
  });
}

/* ══ 取值 ══════════════════════════════════════════════════════════ */

export function clampN(n: number): number {
  if (!Number.isFinite(n)) return 2;
  return Math.min(Math.max(Math.round(n), 0), MAX_N);
}

export function clampK(n: number, k: number): number {
  if (!Number.isFinite(k)) return 0;
  return Math.min(Math.max(Math.round(k), 0), clampN(n));
}

/* ══ 显示 ══════════════════════════════════════════════════════════ */

export const HEADLINE = 'Watch the Pattern Grow';
export const MAIN_IDEA =
  'A coefficient is the number of ways to choose which factors hand over a b.';

export function chooseTex(n: number, k: number): string {
  return `\\binom{${n}}{${k}}`;
}

export function powerTitleTex(n: number): string {
  return `(a+b)^{${n}}`;
}

/** `(a+b)(a+b)(a+b)…` —— n 个括号摆出来。 */
export function factorsTex(n: number): string {
  return n === 0 ? '1' : Array.from({ length: n }, () => '(a+b)').join('');
}
