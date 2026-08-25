/**
 * MATH — 左极限与右极限:`lim_{x→a⁻} f(x)` 与 `lim_{x→a⁺} f(x)`
 *
 * 这一节要建立的直觉:**从左边走过去和从右边走过去,可能到不了同一个地方。**
 * 两边一致时双侧极限才存在;不一致时它**不存在**(DNE),
 * 而不是"等于某个折中值"。
 *
 * ⚠️⚠️ 三条硬约束,都不是风格问题:
 *
 * ① **极限与 f(a) 无关。** 这个模块里,单侧极限**永远不调用 `valueAt(a)`** ——
 *    一次都不。写出来的代码如果在某条路径上用了端点的函数值,
 *    下一节课(「点决定不了极限」)就没法教了,因为界面已经暗示了它有关。
 *
 * ② **不存在时返回 `null`,不返回数字。** 左 2、右 5 的时候,
 *    "极限是 3.5"或"极限是 2"都是**看得见的假话**。null 逼着调用方分支处理。
 *
 * ③ **有限次取样不能证明极限存在。** 数值那条路径叫 `approachedValue`,
 *    它回答的是"这串取样落在哪儿",不叫 `limitOf`。真正的值由**分段的闭形式**给出,
 *    那一条才是精确的。两者必须一致,但它们的地位不同。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import { showNumber } from './format';

export const EPS = 1e-9;

/** 拖动与滑块的步长。钉住的那几个值(1.9、1.99、2.01…)都必须踩得到。 */
export const STEP = 0.001;

/** 两个点离目标线最近能到多近 —— 到不了 a 本身,那正是"趋近"的意思。 */
export const MIN_GAP = 0.001;

export type Side = 'left' | 'right';
export type FunctionId = 'square' | 'jump';

export interface Branch {
  /** 这一支的闭形式。**只在这一侧有效**,但作为多项式它在 a 处也有定义 —— 那就是单侧极限。 */
  readonly at: (x: number) => number;
  readonly tex: string;
}

export interface LimitFunction {
  readonly id: FunctionId;
  readonly label: string;
  readonly blurb: string;
  /** 目标点 */
  readonly a: number;
  readonly left: Branch;
  readonly right: Branch;
  /**
   * f(a) 本身。
   * ⚠️ 只用来**画那个点**,判定极限时一次都不会读它 —— 见文件头 ①。
   */
  readonly valueAtA: number | null;
  /** 画面范围(x) */
  readonly view: { readonly from: number; readonly to: number };
  /**
   * 画面范围(y)。**每条函数各定各的** —— x² 在 x = 3 处已经到 9,
   * 而分段那条最高才 6.4;共用一个纵向取景会让其中一条挤成一条线。
   */
  readonly yView: { readonly from: number; readonly to: number };
}

export const FUNCTIONS: Readonly<Record<FunctionId, LimitFunction>> = {
  square: {
    id: 'square',
    label: 'Both sides agree',
    blurb: 'One smooth curve. Walk in from either side and you arrive at the same height.',
    a: 2,
    left: { at: (x) => x * x, tex: 'x^2' },
    right: { at: (x) => x * x, tex: 'x^2' },
    valueAtA: 4,
    view: { from: 0.4, to: 3.2 },
    yView: { from: -0.8, to: 10.8 },
  },
  jump: {
    id: 'jump',
    label: 'The sides disagree',
    blurb: 'Two straight pieces that do not meet. The walk in from the left ends somewhere else.',
    a: 2,
    left: { at: (x) => x, tex: 'x' },
    right: { at: (x) => x + 3, tex: 'x + 3' },
    // 左支闭合:图上 (2, 2) 是实心点,(2, 5) 是空心点。
    valueAtA: 2,
    view: { from: 0.4, to: 3.2 },
    yView: { from: -0.8, to: 7.2 },
  },
};

export const FUNCTION_ORDER: readonly FunctionId[] = ['square', 'jump'];

/** 某个 x 属于哪一支。`a` 本身不属于任何一支 —— 那是这一节的核心。 */
export function branchAt(fn: LimitFunction, x: number): Branch | null {
  if (x < fn.a - EPS) return fn.left;
  if (x > fn.a + EPS) return fn.right;
  return null;
}

/**
 * f(x)。**在 a 处返回声明的函数值**(可能是 null),其余按所在分支算。
 * ⚠️ 判定极限的两条路径都不会调用它在 x = a 处的结果。
 */
export function valueAt(fn: LimitFunction, x: number): number | null {
  if (!Number.isFinite(x)) return null;
  const branch = branchAt(fn, x);
  if (branch === null) return fn.valueAtA;
  return branch.at(x);
}

/* ══ 单侧极限:两条独立路径 ════════════════════════════════════════ */

/**
 * 路径 A —— **那一支的闭形式在 a 处的值**。
 * 每支都是多项式,处处连续,所以这个值**就是**该侧的极限。精确,不是近似。
 * 全程不取样。
 */
export function oneSidedLimit(fn: LimitFunction, side: Side): number {
  return (side === 'left' ? fn.left : fn.right).at(fn.a);
}

/**
 * 提示词点名的那串靠近值。左:1, 1.5, 1.9, 1.99, 1.999;右:3, 2.5, 2.1, 2.01, 2.001。
 * 写成"离 a 的距离",于是 a 换个值这串也跟着对。
 */
const GAPS: readonly number[] = [1, 0.5, 0.1, 0.01, 0.001];

export function approachSequence(fn: LimitFunction, side: Side): readonly number[] {
  const sign = side === 'left' ? -1 : 1;
  return GAPS.map((gap) => fn.a + sign * gap);
}

/**
 * 路径 B —— **沿着一串越来越近的输入走过去,看落在哪儿**。
 * 纯数值,不碰任何一支的闭形式在 a 处的取值。
 *
 * ⚠️ 名字叫 `approachedValue` 而不是 `limitOf`:有限次取样**说明不了**极限存在,
 * 它只报告"这串取样停在哪儿"。精确的那个值来自路径 A。
 * 措辞上先说错,界面上一定跟着说错(第三节立的规矩)。
 */
export function approachedValue(fn: LimitFunction, side: Side, terms = 12): number {
  const sign = side === 'left' ? -1 : 1;
  const branch = side === 'left' ? fn.left : fn.right;
  let last = Number.NaN;
  for (let k = 1; k <= terms; k += 1) {
    last = branch.at(fn.a + sign * 10 ** -k);
  }
  return last;
}

/** 这串取样确实在**收拢**吗 —— 相邻两项的差必须一路变小。 */
export function isSettling(fn: LimitFunction, side: Side, terms = 10): boolean {
  const sign = side === 'left' ? -1 : 1;
  const branch = side === 'left' ? fn.left : fn.right;
  let previousGap = Number.POSITIVE_INFINITY;
  for (let k = 1; k <= terms; k += 1) {
    const gap = Math.abs(branch.at(fn.a + sign * 10 ** -k) - oneSidedLimit(fn, side));
    if (gap > previousGap + EPS) return false;
    previousGap = gap;
  }
  return previousGap <= 1e-6;
}

/* ══ 双侧极限 ══════════════════════════════════════════════════════ */

export function sidesAgree(fn: LimitFunction): boolean {
  return Math.abs(oneSidedLimit(fn, 'left') - oneSidedLimit(fn, 'right')) <= EPS;
}

/**
 * 双侧极限。
 * ⚠️ **不存在时返回 null,绝不返回数字。** 左 2 右 5 的时候给出任何一个数
 * 都是屏幕上看得见的假话。
 */
export function twoSidedLimit(fn: LimitFunction): number | null {
  return sidesAgree(fn) ? oneSidedLimit(fn, 'left') : null;
}

/** 两侧差多少 —— DNE 那一屏要把这个差摆出来。 */
export function sideGap(fn: LimitFunction): number {
  return Math.abs(oneSidedLimit(fn, 'right') - oneSidedLimit(fn, 'left'));
}

/* ══ 两个可拖动的点 ════════════════════════════════════════════════ */

export interface Approach {
  readonly x: number;
  readonly y: number;
  /** 离目标还有多远 */
  readonly gap: number;
}

export function snapX(value: number): number {
  return Math.round(value / STEP) * STEP;
}

/**
 * 把一个输入夹到**它自己那一侧**。
 *
 * ⚠️ 左边那个点**永远到不了也越不过 a**。允许它越过去,这一节就散了 ——
 * "从左边趋近"必须在交互上是不可违反的,而不是一句提示。
 */
export function clampToSide(fn: LimitFunction, side: Side, x: number): number {
  const snapped = snapX(Number.isFinite(x) ? x : fn.a);
  if (side === 'left') {
    return Math.min(Math.max(snapped, fn.view.from), snapX(fn.a - MIN_GAP));
  }
  return Math.max(Math.min(snapped, fn.view.to), snapX(fn.a + MIN_GAP));
}

export function readApproach(fn: LimitFunction, side: Side, x: number): Approach {
  const clamped = clampToSide(fn, side, x);
  const branch = side === 'left' ? fn.left : fn.right;
  return { x: clamped, y: branch.at(clamped), gap: Math.abs(clamped - fn.a) };
}

/**
 * 「再近一点」:跳到序列里比当前更近的下一个值;已经最近了就**原地不动**。
 *
 * ⚠️ 原来这里写的是"找不到就退回最后一档",而最后一档正好就是当前位置 ——
 * 换句话说那个 fallback 永远和"原地不动"同结果,是一段测不出来的死分支。
 * (变异测试把它换成 `?? 0` 也全绿:0 会让 x 落在 a 上,但 `clampToSide`
 *  又把它推了回来 —— 保证其实来自 clamp,不是来自这里。)
 * 写成显式的"停住",意图和保证就都在明处了。
 */
export function stepCloser(fn: LimitFunction, side: Side, x: number): number {
  const here = clampToSide(fn, side, x);
  const current = Math.abs(here - fn.a);
  const next = GAPS.find((gap) => gap < current - EPS);
  if (next === undefined) return here;
  return clampToSide(fn, side, fn.a + (side === 'left' ? -next : next));
}

/** 回到最远那一档,重新走一趟。 */
export function resetApproach(fn: LimitFunction, side: Side): number {
  return clampToSide(fn, side, approachSequence(fn, side)[0]!);
}

/** 画线用的取样。⚠️ 断点处必须**断开**,不能连成一条穿过去的假线。 */
export function sampleBranch(
  fn: LimitFunction,
  side: Side,
  count = 160,
): readonly { x: number; y: number }[] {
  const from = side === 'left' ? fn.view.from : fn.a;
  const to = side === 'left' ? fn.a : fn.view.to;
  const branch = side === 'left' ? fn.left : fn.right;
  return Array.from({ length: count + 1 }, (_, i) => {
    const x = from + ((to - from) * i) / count;
    return { x, y: branch.at(x) };
  });
}

/**
 * 这一侧在 x = a 处是**闭**的吗(实心点)?
 * ⚠️ 由 `valueAtA` 与该侧极限是否相等**算出来**,不写死。
 * 写死的话换一条函数就会画错 —— 而空心/实心正是"极限与函数值无关"的视觉入口。
 */
export function closedAt(fn: LimitFunction, side: Side): boolean {
  return fn.valueAtA !== null && Math.abs(fn.valueAtA - oneSidedLimit(fn, side)) <= EPS;
}

/* ══ 显示 ══════════════════════════════════════════════════════════ */

export const SIDE_COPY: Readonly<
  Record<Side, { readonly sign: string; readonly word: string; readonly arrow: string; readonly move: string }>
> = {
  left: { sign: '−', word: 'left', arrow: '→', move: 'Come from the left.' },
  right: { sign: '+', word: 'right', arrow: '←', move: 'Come from the right.' },
};

export function showX(x: number): string {
  // 靠得很近时要看得出还在动:1.999 与 1.9999 不能都显示成 2.00
  const places = Math.abs(x) < 100 ? 3 : 2;
  return showNumber(x, places);
}

export function showY(y: number | null): string {
  return y === null ? 'undefined' : showNumber(y, 3);
}

/**
 * 极限值这种**钉住的整数**用短写法:`2` 而不是 `2.000`。
 * 提示词写的就是 `2 ≠ 5`;而且短标签在图上不容易顶出取景框。
 */
export function showLimit(y: number | null): string {
  if (y === null) return 'DNE';
  return Number.isInteger(y) ? String(y) : showNumber(y, 3);
}

/** `x \to 2^{-}` */
export function approachTex(fn: LimitFunction, side: Side): string {
  return `x \\to ${showNumber(fn.a, 0)}^{${side === 'left' ? '-' : '+'}}`;
}

/** `\lim_{x \to 2^{-}} x^2 = 4` */
export function oneSidedTex(fn: LimitFunction, side: Side): string {
  const branch = side === 'left' ? fn.left : fn.right;
  const value = oneSidedLimit(fn, side);
  return `\\lim_{${approachTex(fn, side)}} ${branch.tex} = ${showNumber(value, 0)}`;
}

/** 双侧:存在就给等式,不存在就给 DNE。 */
export function twoSidedTex(fn: LimitFunction): string {
  const limit = twoSidedLimit(fn);
  const head = `\\lim_{x \\to ${showNumber(fn.a, 0)}} f(x)`;
  return limit === null ? `${head} \\;\\text{does not exist}` : `${head} = ${showNumber(limit, 0)}`;
}
