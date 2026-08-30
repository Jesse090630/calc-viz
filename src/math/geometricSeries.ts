/**
 * MATH — 等比级数:`Sₙ = a + ar + ar² + … + ar^(n−1)`。
 *
 * ⭐⭐ 有限的那个公式**不是被给出的,是被逼出来的**:
 *   把整条式子乘以 r,每一项就往右挪一格;两式相减,中间**全部成对抵消**,
 *   只剩头尾两块 `a − arⁿ`。于是 `Sₙ(1−r) = a(1−rⁿ)`。
 *   那串抵消是这一课的画面 —— 公式看起来是不得不如此,而不是背下来的。
 *
 * ⭐ 无穷的那个公式**不是另起炉灶**,是有限公式加一句 `rⁿ → 0`。
 *   所以 `|r| < 1` 不是一条武断的规矩,它**恰好**是让 `rⁿ → 0` 成立的条件。
 *
 * ⭐ 两条独立路径:
 *   ① `sumByAdding`  —— 一项一项加起来(定义);
 *   ② `sumByFormula` —— 闭形式。
 *   ⚠️ `r = 1` 时闭形式是 `0/0`,必须**单独**给出 `Sₙ = na` ——
 *   这正是公式里那句 "for r ≠ 1" 的全部意思,不能让它悄悄变成 NaN 上屏。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import { showNumber } from './format';

export const MAX_TERMS = 12;
/**
 * ⚠️ 上界必须**够得到 2**。
 * 提示词点名的那组例子是 a = 3、r = 2、n = 5 → 93,
 * 而第一版把上界定在 1.6 —— 滑块拖到头也只有 1.6,那组例子在页面上根本做不出来。
 * 「范围够用」不是凭手感定的,是被要讲的例子定的。
 */
export const R_RANGE = { min: -2.5, max: 2.5 } as const;

export type Behaviour = 'converges' | 'alternates' | 'constant' | 'grows' | 'oscillates';

/* ══ 取值 ══════════════════════════════════════════════════════════ */

export function clampR(r: number): number {
  if (!Number.isFinite(r)) return 0.5;
  return Math.min(Math.max(Math.round(r * 100) / 100, R_RANGE.min), R_RANGE.max);
}

export function clampN(n: number): number {
  if (!Number.isFinite(n)) return 5;
  return Math.min(Math.max(Math.round(n), 1), MAX_TERMS);
}

export function clampA(a: number): number {
  if (!Number.isFinite(a) || a === 0) return 1;
  return Math.round(a * 100) / 100;
}

/* ══ 项与和 ════════════════════════════════════════════════════════ */

/** 第 i 项(从 0 数起):`a·rⁱ`。 */
export function termAt(a: number, r: number, i: number): number {
  return a * r ** i;
}

export function terms(a: number, r: number, n: number): readonly number[] {
  return Array.from({ length: n }, (_, i) => termAt(a, r, i));
}

/** 路径 ① —— 一项一项加。 */
export function sumByAdding(a: number, r: number, n: number): number {
  return terms(a, r, n).reduce((sum, t) => sum + t, 0);
}

/**
 * 路径 ② —— 闭形式。
 * ⚠️ `r = 1` 要**单独**处理。`a(1−1ⁿ)/(1−1)` 是 `0/0` = NaN,
 * 而正确答案是 `na`。公式旁边那句 "for r ≠ 1" 说的就是这件事;
 * 让 NaN 溜上屏,等于在讲「有例外」的同一页上把例外显示成一个坏值。
 */
export function sumByFormula(a: number, r: number, n: number): number {
  if (r === 1) return n * a;
  return (a * (1 - r ** n)) / (1 - r);
}

/** 前 n 项的部分和序列。界面上那串 0.5、0.75、0.875… */
export function partialSums(a: number, r: number, n: number): readonly number[] {
  const out: number[] = [];
  let running = 0;
  for (let i = 0; i < n; i += 1) {
    running += termAt(a, r, i);
    out.push(running);
  }
  return out;
}

/* ══ 移位相减 ══════════════════════════════════════════════════════ */

export interface ShiftRow {
  /** 这一列上,上式与下式各是第几项(null 表示这一列空着) */
  readonly top: number | null;
  readonly bottom: number | null;
  /** 这一列会不会抵消 */
  readonly cancels: boolean;
}

/**
 * 把 `Sₙ` 与 `rSₙ` 按项对齐,给出每一列的状态。
 *
 * 上式:`a, ar, ar², …, ar^(n−1)`      —— 指数 0 … n−1
 * 下式:`   ar, ar², …, ar^(n−1), arⁿ` —— 指数 1 … n
 *
 * ⭐ 只有两列不成对:最左边的 `a` 和最右边的 `arⁿ`。
 * 中间每一列上下都有、而且**是同一项**,所以相减为零。
 */
export function shiftRows(n: number): readonly ShiftRow[] {
  return Array.from({ length: n + 1 }, (_, column) => {
    const top = column < n ? column : null;
    const bottom = column > 0 ? column : null;
    return { top, bottom, cancels: top !== null && bottom !== null };
  });
}

/** ⭐ 抵消之后剩下的:`a − arⁿ`。这个函数**只看列的结构**,不做数值相减。 */
export function survivors(n: number): readonly { readonly power: number; readonly sign: 1 | -1 }[] {
  return shiftRows(n)
    .filter((row) => !row.cancels)
    .map((row) => (row.top !== null
      ? { power: row.top, sign: 1 as const }
      : { power: row.bottom!, sign: -1 as const }));
}

/** 路径 ③ —— 从「剩下的两项」直接求和,再除以 (1 − r)。 */
export function sumBySurvivors(a: number, r: number, n: number): number {
  if (r === 1) return n * a;
  const numerator = survivors(n).reduce((sum, s) => sum + s.sign * termAt(a, r, s.power), 0);
  return numerator / (1 - r);
}

export const CANCEL_WORDS = 'Every middle term appears once on top and once underneath.';

/* ══ 无穷 ══════════════════════════════════════════════════════════ */

/** `|r| < 1` 时的和。⚠️ 别处返回 `null`,不返回 Infinity 或 NaN。 */
export function infiniteSum(a: number, r: number): number | null {
  if (!Number.isFinite(a) || !Number.isFinite(r)) return null;
  if (Math.abs(r) >= 1) return null;
  const value = a / (1 - r);
  return Number.isFinite(value) ? value : null;
}

export function converges(r: number): boolean {
  return Number.isFinite(r) && Math.abs(r) < 1;
}

/** `rⁿ` 走到第 n 项还剩多少 —— 「为什么要 |r| < 1」那一段的读数。 */
export function tailWeight(r: number, n: number): number {
  return Math.abs(r) ** n;
}

/**
 * ⭐ `|r| < 1` **恰好**是让 `rⁿ → 0` 的条件。
 * 给一个界,返回第一个让 `|rⁿ|` 落到界以下的 n;做不到就 null。
 * 这和无穷极限那一节的 `beats` 是同一种写法:**用构造证明**,不用取样堆砌。
 */
export function shrinksBelow(r: number, bound: number, maxN = 4000): number | null {
  if (!Number.isFinite(r) || bound <= 0) return null;
  for (let n = 1; n <= maxN; n += 1) {
    if (tailWeight(r, n) < bound) return n;
  }
  return null;
}

/* ══ 五种脾气 ══════════════════════════════════════════════════════ */

export interface Regime {
  readonly behaviour: Behaviour;
  readonly words: string;
  readonly converges: boolean;
}

/**
 * ⚠️ 分类**从 r 算出来**,不是一张查找表。
 * 查找表会让「r = 1 与 r = −1 都不收敛,但不是同一种不收敛」这件事变成两句手写文案。
 */
export function regimeOf(r: number): Regime {
  const magnitude = Math.abs(r);
  if (r === 1) {
    return { behaviour: 'constant', words: 'Every term is the same size. The sum climbs forever.', converges: false };
  }
  if (r === -1) {
    return { behaviour: 'oscillates', words: 'The partial sums flip between two values and never settle.', converges: false };
  }
  if (magnitude > 1) {
    return { behaviour: 'grows', words: 'Each term is bigger than the last. Nothing can settle.', converges: false };
  }
  if (r < 0) {
    return { behaviour: 'alternates', words: 'The terms flip sign while shrinking, so the sums close in from both sides.', converges: true };
  }
  return { behaviour: 'converges', words: 'Each term is a fraction of the one before, so the total stops growing.', converges: true };
}

/** 提示词点名的那五个 r。 */
export const SAMPLE_RATIOS: readonly number[] = [0.5, -0.5, 1, 1.2, -1];

/* ══ 画块 ══════════════════════════════════════════════════════════ */

export interface Block {
  readonly index: number;
  readonly value: number;
  /** 累计到这一项为止的部分和 */
  readonly running: number;
  /** 这一块相对第一块的长度比(取绝对值) */
  readonly fraction: number;
}

export function blocks(a: number, r: number, n: number): readonly Block[] {
  const first = Math.abs(a) || 1;
  const sums = partialSums(a, r, n);
  return terms(a, r, n).map((value, index) => ({
    index,
    value,
    running: sums[index]!,
    fraction: Math.abs(value) / first,
  }));
}

/* ══ 显示 ══════════════════════════════════════════════════════════ */

export const HEADLINE = 'Shift, Subtract, Collapse';
export const FINITE_TEX = 'S_n = \\frac{a\\,(1 - r^{n})}{1 - r}';
export const INFINITE_TEX = 'S_\\infty = \\frac{a}{1 - r}';
export const FINITE_CAVEAT = 'for r \\ne 1';
export const INFINITE_CAVEAT = 'for |r| < 1';

export function termTex(index: number): string {
  if (index === 0) return 'a';
  if (index === 1) return 'ar';
  return `ar^{${index}}`;
}

export function show(value: number, places = 4): string {
  return showNumber(value, places);
}

/** 一串项写成 `3 + 6 + 12 + 24 + 48`。 */
export function termsPlain(a: number, r: number, n: number, places = 0): string {
  return terms(a, r, n).map((t) => showNumber(t, places)).join(' + ');
}

export function finiteWorkedTex(a: number, r: number, n: number): string {
  if (r === 1) return `S_{${n}} = ${n} \\times ${a} = ${sumByFormula(a, r, n)}`;
  return `\\frac{${a}\\,(1 - ${r}^{${n}})}{1 - ${r}} = ${showNumber(sumByFormula(a, r, n), 4)}`;
}
