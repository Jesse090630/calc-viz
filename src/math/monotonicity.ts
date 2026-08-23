/**
 * MATH — 单调性的形式定义
 *
 * 这个模块回答一个问题:「对每一对 x₁ < x₂,输出的大小关系是否被保持?」
 *
 * ⚠️ 关于诚实性的一条硬约束,写在最前面:
 * **有限次抽样永远不能证明一个 ∀ 命题。**
 * 所以这里的判定函数一律叫 `...OnGrid`,返回的状态也叫 `holds-on-grid`,
 * 绝不叫 `proved` / `isIncreasing`。命名上就堵死"测了 500 对所以成立"这种话。
 * 反过来,**一个反例足以证否** —— 那个返回值才可以叫 `refuted`,因为它是真的证明。
 * 这不是措辞洁癖:整个交互要教的就是 ∀ 与 ∃ 的不对称,代码里先说错了,界面上一定跟着说错。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */

/** 闭区间 [a, b] */
export interface Interval {
  readonly a: number;
  readonly b: number;
}

/** 一对已排好序的输入,恒满足 x1 < x2 */
export interface Pair {
  readonly x1: number;
  readonly x2: number;
}

export interface EvaluatedPair extends Pair {
  readonly y1: number;
  readonly y2: number;
}

export type RelationId =
  | 'strictly-increasing'
  | 'strictly-decreasing'
  | 'constant'
  | 'nondecreasing'
  | 'nonincreasing';

export interface Relation {
  readonly id: RelationId;
  /** 英文名,界面直接用 */
  readonly label: string;
  /** 结论部分的 TeX(前件恒为 x₁ < x₂) */
  readonly consequentTex: string;
  /** 整条蕴含式的 TeX */
  readonly tex: string;
  /** 中缀符号,用来拼「0.64 < 4.41」这种代入式 */
  readonly symbol: string;
  /** 平坦段是否合法 —— 区分 < 与 ≤ 的关键 */
  readonly allowsFlat: boolean;
  /** 一句话说明 */
  readonly note: string;
  /** 判定:给定一对输出,结论是否成立 */
  readonly holds: (y1: number, y2: number) => boolean;
}

const IMPLIES = '\\;\\Longrightarrow\\;';
const ANTECEDENT = 'x_1 < x_2';

export const RELATIONS: Readonly<Record<RelationId, Relation>> = {
  'strictly-increasing': {
    id: 'strictly-increasing',
    label: 'Strictly increasing',
    consequentTex: 'f(x_1) < f(x_2)',
    tex: `${ANTECEDENT}${IMPLIES}f(x_1) < f(x_2)`,
    symbol: '<',
    allowsFlat: false,
    note: 'The later input must produce a strictly higher output. Flat sections are not allowed.',
    holds: (y1, y2) => y1 < y2,
  },
  'strictly-decreasing': {
    id: 'strictly-decreasing',
    label: 'Strictly decreasing',
    consequentTex: 'f(x_1) > f(x_2)',
    tex: `${ANTECEDENT}${IMPLIES}f(x_1) > f(x_2)`,
    symbol: '>',
    allowsFlat: false,
    note: 'The later input must produce a strictly lower output. Flat sections are not allowed.',
    holds: (y1, y2) => y1 > y2,
  },
  constant: {
    id: 'constant',
    label: 'Constant',
    consequentTex: 'f(x_1) = f(x_2)',
    tex: `${ANTECEDENT}${IMPLIES}f(x_1) = f(x_2)`,
    symbol: '=',
    allowsFlat: true,
    note: 'Every input produces the same output. The order of the inputs stops mattering.',
    holds: (y1, y2) => y1 === y2,
  },
  nondecreasing: {
    id: 'nondecreasing',
    label: 'Nondecreasing',
    consequentTex: 'f(x_1) \\le f(x_2)',
    tex: `${ANTECEDENT}${IMPLIES}f(x_1) \\le f(x_2)`,
    symbol: '≤',
    allowsFlat: true,
    note: 'The output may stay level. It just may never come back down.',
    holds: (y1, y2) => y1 <= y2,
  },
  nonincreasing: {
    id: 'nonincreasing',
    label: 'Nonincreasing',
    consequentTex: 'f(x_1) \\ge f(x_2)',
    tex: `${ANTECEDENT}${IMPLIES}f(x_1) \\ge f(x_2)`,
    symbol: '≥',
    allowsFlat: true,
    note: 'The output may stay level. It just may never go back up.',
    holds: (y1, y2) => y1 >= y2,
  },
};

export const RELATION_ORDER: readonly RelationId[] = [
  'strictly-increasing',
  'strictly-decreasing',
  'constant',
  'nondecreasing',
  'nonincreasing',
];

/* ────────────────────────────────────────────────────────────────────────── */

export interface FunctionSpec {
  readonly id: string;
  readonly tex: string;
  /** 纯函数。定义域外返回 null,**绝不返回 NaN** —— NaN 会变成屏幕上看不见的错。 */
  readonly at: (x: number) => number | null;
  /** 画图与取样的默认窗口 */
  readonly window: Interval;
}

/**
 * ⚠️ 平坦段必须**精确**相等,不能靠浮点巧合。
 * 所以分段函数在平坦区间上 `return` 字面常数,而不是算一个"应该等于"它的表达式。
 * 否则 `≤` 与 `<` 的区别会退化成 1e-16 级别的噪声,而那正是这一节要教的东西。
 */
export const FUNCTIONS: Readonly<Record<string, FunctionSpec>> = {
  square: {
    id: 'square',
    tex: 'f(x) = x^2',
    at: (x) => x * x,
    window: { a: -3, b: 3.4 },
  },
  identity: {
    id: 'identity',
    tex: 'f(x) = x',
    at: (x) => x,
    window: { a: -3, b: 3.4 },
  },
  negated: {
    id: 'negated',
    tex: 'f(x) = -x',
    at: (x) => -x,
    window: { a: -3, b: 3.4 },
  },
  level: {
    id: 'level',
    tex: 'f(x) = 2',
    at: () => 2,
    window: { a: -3, b: 3.4 },
  },
  /** 先平后升 —— 非递减成立,严格递增不成立 */
  flatThenUp: {
    id: 'flatThenUp',
    tex: 'f(x) = \\begin{cases} 1 & x \\le 1.5 \\\\ 1 + (x - 1.5) & x > 1.5 \\end{cases}',
    at: (x) => (x <= 1.5 ? 1 : 1 + (x - 1.5)),
    window: { a: -3, b: 3.4 },
  },
  /** 先降后平 —— 非递增成立,严格递减不成立 */
  downThenFlat: {
    id: 'downThenFlat',
    tex: 'f(x) = \\begin{cases} 3 - x & x \\le 1.5 \\\\ 1.5 & x > 1.5 \\end{cases}',
    at: (x) => (x <= 1.5 ? 3 - x : 1.5),
    window: { a: -3, b: 3.4 },
  },
};

/* ── 取值 ─────────────────────────────────────────────────────────────────── */

/** 把任意两个不同的数变成 x₁ < x₂。相等时返回 null:那不是合法的一对。 */
export function orderPair(u: number, v: number): Pair | null {
  if (!Number.isFinite(u) || !Number.isFinite(v) || u === v) return null;
  return u < v ? { x1: u, x2: v } : { x1: v, x2: u };
}

/** 求一对输入的输出。任一端无定义就返回 null。 */
export function evaluatePair(fn: FunctionSpec, pair: Pair): EvaluatedPair | null {
  const y1 = fn.at(pair.x1);
  const y2 = fn.at(pair.x2);
  if (y1 === null || y2 === null || !Number.isFinite(y1) || !Number.isFinite(y2)) return null;
  return { ...pair, y1, y2 };
}

/** 这一对是否满足给定关系的结论 */
export function pairSatisfies(relation: Relation, evaluated: EvaluatedPair): boolean {
  return relation.holds(evaluated.y1, evaluated.y2);
}

export function clampToInterval(x: number, interval: Interval): number {
  return Math.min(interval.b, Math.max(interval.a, x));
}

export function intervalContains(interval: Interval, x: number): boolean {
  return x >= interval.a && x <= interval.b;
}

/* ── 取样 ─────────────────────────────────────────────────────────────────── */

/** 曲线折线点。定义域外的点为 null,调用方据此断线而不是连过去。 */
export function samplePoints(
  fn: FunctionSpec,
  interval: Interval,
  count: number,
): readonly { x: number; y: number | null }[] {
  const n = Math.max(2, Math.floor(count));
  return Array.from({ length: n + 1 }, (_, i) => {
    const x = interval.a + ((interval.b - interval.a) * i) / n;
    const y = fn.at(x);
    return { x, y: y !== null && Number.isFinite(y) ? y : null };
  });
}

/**
 * Halton 低偏差序列。用它而不是 Math.random 有两个理由:
 * ① 测试要可复现;② 扫描时点要**铺得开**,随机数会结块、留下大片空白,
 *    那会让"扫过很多对"看起来像"扫得很稀",反而误导。
 */
function halton(index: number, base: number): number {
  let result = 0;
  let f = 1 / base;
  let i = index;
  while (i > 0) {
    result += f * (i % base);
    i = Math.floor(i / base);
    f /= base;
  }
  return result;
}

/**
 * 把第 k 个 Halton 点映射到「x₁ < x₂」那个**三角形**上。
 * 取 min / max 而不是直接用两个坐标 —— 后者有一半概率落在 x₁ > x₂ 那半边,
 * 得丢掉重抽,点就不均匀了。
 */
export function pairFromSequence(index: number, interval: Interval): Pair | null {
  const u = halton(index + 1, 2);
  const v = halton(index + 1, 3);
  const lo = Math.min(u, v);
  const hi = Math.max(u, v);
  const span = interval.b - interval.a;
  return orderPair(interval.a + span * lo, interval.a + span * hi);
}

/** 扫描动画用的一整串对 */
export function sweepSequence(interval: Interval, count: number): readonly Pair[] {
  const out: Pair[] = [];
  for (let i = 0; out.length < count && i < count * 4; i += 1) {
    const pair = pairFromSequence(i, interval);
    if (pair) out.push(pair);
  }
  return out;
}

/* ── 判定 ─────────────────────────────────────────────────────────────────── */

export type VerdictStatus = 'holds-on-grid' | 'refuted';

export interface Verdict {
  /**
   * `holds-on-grid` —— 在这张网格上没找到反例。**这不是证明。**
   * `refuted`      —— 找到了反例。**这是证明**,而且只需要这一个。
   */
  readonly status: VerdictStatus;
  readonly counterexample: EvaluatedPair | null;
  readonly pairsChecked: number;
  readonly gridPoints: number;
}

function gridOf(interval: Interval, gridPoints: number): number[] {
  const n = Math.max(2, Math.floor(gridPoints));
  return Array.from({ length: n }, (_, i) => interval.a + ((interval.b - interval.a) * i) / (n - 1));
}

/**
 * 路径 A —— 老老实实枚举**所有** C(n,2) 对。
 * 慢,但语义上就是定义本身,不依赖任何数学定理。
 */
export function verdictByAllPairs(
  fn: FunctionSpec,
  relation: Relation,
  interval: Interval,
  gridPoints = 60,
): Verdict {
  const xs = gridOf(interval, gridPoints);
  let checked = 0;
  for (let i = 0; i < xs.length; i += 1) {
    for (let j = i + 1; j < xs.length; j += 1) {
      const pair = orderPair(xs[i]!, xs[j]!);
      if (!pair) continue;
      const evaluated = evaluatePair(fn, pair);
      if (!evaluated) continue;
      checked += 1;
      if (!pairSatisfies(relation, evaluated)) {
        return { status: 'refuted', counterexample: evaluated, pairsChecked: checked, gridPoints: xs.length };
      }
    }
  }
  return { status: 'holds-on-grid', counterexample: null, pairsChecked: checked, gridPoints: xs.length };
}

/**
 * 路径 B —— 只比较**相邻**的一对,O(n)。
 *
 * 依据:这五个关系的结论都是**传递**的(<、>、=、≤、≥ 都是传递关系)。
 * 相邻全部成立 ⇒ 任意一对成立,链式推下去即可。
 * 这条路径与路径 A 的推理方式完全不同,所以适合互证。
 * 测试里断言两者在所有函数 × 所有关系 × 多个区间上给出同一个结论。
 */
export function verdictByAdjacent(
  fn: FunctionSpec,
  relation: Relation,
  interval: Interval,
  gridPoints = 60,
): Verdict {
  const xs = gridOf(interval, gridPoints);
  let checked = 0;
  for (let i = 0; i + 1 < xs.length; i += 1) {
    const pair = orderPair(xs[i]!, xs[i + 1]!);
    if (!pair) continue;
    const evaluated = evaluatePair(fn, pair);
    if (!evaluated) continue;
    checked += 1;
    if (!pairSatisfies(relation, evaluated)) {
      return { status: 'refuted', counterexample: evaluated, pairsChecked: checked, gridPoints: xs.length };
    }
  }
  return { status: 'holds-on-grid', counterexample: null, pairsChecked: checked, gridPoints: xs.length };
}

/**
 * 找一个**最容易看懂**的反例,而不是随便一个。
 *
 * 直接返回网格上第一个失败对,通常会得到 x₁=-2.000, x₂=-1.966 这种 ——
 * 数学上没错,但两点几乎重合,屏幕上根本看不出差别,教学价值为零。
 * 所以这里在所有失败对里挑「两个输出差得最远」的那个:
 * 对 x² 在 [-2,2] 上就是 (-2, 0) 附近,落差最大、一眼可见。
 */
export function findClearestCounterexample(
  fn: FunctionSpec,
  relation: Relation,
  interval: Interval,
  gridPoints = 40,
): EvaluatedPair | null {
  const xs = gridOf(interval, gridPoints);
  let best: EvaluatedPair | null = null;
  let bestGap = -Infinity;
  for (let i = 0; i < xs.length; i += 1) {
    for (let j = i + 1; j < xs.length; j += 1) {
      const pair = orderPair(xs[i]!, xs[j]!);
      if (!pair) continue;
      const evaluated = evaluatePair(fn, pair);
      if (!evaluated || pairSatisfies(relation, evaluated)) continue;
      const gap = Math.abs(evaluated.y1 - evaluated.y2);
      if (gap > bestGap) {
        bestGap = gap;
        best = evaluated;
      }
    }
  }
  return best;
}

/**
 * 给「Show me one」按钮用的反例 —— 挑的是**最好懂的**,不是落差最大的。
 *
 * ⚠️ 这个函数是浏览器实测逼出来的。原本直接用 `findClearestCounterexample`
 * (落差最大),它在 x² / [-2,2] 上给出的是 `(-2, -0.051)`,输出 `4` 与 `0.0026`:
 *   · 第二个点几乎正好压在**顶点**上 —— 而顶点恰恰是后面「分成两段」那一幕的主角,
 *     提前把它当反例用,会让学生以为顶点有什么特殊地位;
 *   · f(x₂) ≈ 0.00,那个点视觉上黏在 x 轴上,根本不像"曲线上的一点";
 *   · 两个读数一个是 4 一个是 0,像"有值 vs 没值",而不是"大 vs 小"。
 * 「落差最大」听起来最有说服力,实际上把两个点推向了最不该待的地方。
 *
 * 改成:先找出函数**掉头往下的那一段**,取它的**左端点与中点**。
 * 对 x² / [-2,2] 就是 `(-2, -1)` → `4` 与 `1`,两点都稳稳落在下降段里,
 * 高度分明、横向分得开、都不在顶点上。
 * 万一这个启发式挑不出真反例(换了别的函数形状),再退回穷举。
 */
export function suggestCounterexample(
  fn: FunctionSpec,
  relation: Relation,
  interval: Interval,
  gridPoints = 400,
): EvaluatedPair | null {
  const cuts = [interval.a, ...monotoneBreakpoints(fn, interval, gridPoints), interval.b];
  for (let i = 0; i + 1 < cuts.length; i += 1) {
    const lo = cuts[i]!;
    const hi = cuts[i + 1]!;
    const pair = orderPair(lo, (lo + hi) / 2);
    if (!pair) continue;
    const evaluated = evaluatePair(fn, pair);
    if (evaluated && !pairSatisfies(relation, evaluated)) {
      return roundedIfStillFails(fn, relation, interval, evaluated) ?? evaluated;
    }
  }
  return findClearestCounterexample(fn, relation, interval, 40);
}

/**
 * 把反例挪到整齐的数上 —— 但**只在挪完仍然是反例的前提下**。
 *
 * 分界点是在网格上估出来的,所以中点会落在 -0.9975 这种地方,
 * 屏幕上就显示成 `f(-0.99) = 0.99`。数学没错,可这一幕的全部作用是"一眼看懂",
 * 而 `f(-1) = 1` 比 `f(-0.99) = 0.99` 好读得多 —— 学生不用先判断 0.99 是不是 1。
 *
 * ⚠️ 顺序不能反:**先验证,再采用**。
 * 为了好看去动一个反例,结果动出个不是反例的对,那是把教学事故写进代码里。
 * 所以这里每一个候选都重新跑一遍 `pairSatisfies`,不通过就原样退回。
 */
function roundedIfStillFails(
  fn: FunctionSpec,
  relation: Relation,
  interval: Interval,
  found: EvaluatedPair,
): EvaluatedPair | null {
  const snap = (value: number, step: number) => Math.round(value / step) * step;
  for (const step of [1, 0.5, 0.25]) {
    const pair = orderPair(snap(found.x1, step), snap(found.x2, step));
    if (!pair) continue;
    if (!intervalContains(interval, pair.x1) || !intervalContains(interval, pair.x2)) continue;
    const evaluated = evaluatePair(fn, pair);
    if (evaluated && !pairSatisfies(relation, evaluated)) return evaluated;
  }
  return null;
}

/**
 * x² 这类函数的单调段分界点。用**取样比较**找,不解析求导 ——
 * 这样换成分段函数也照样能用,而且和界面上画的是同一批采样值。
 */
export function monotoneBreakpoints(
  fn: FunctionSpec,
  interval: Interval,
  gridPoints = 400,
): readonly number[] {
  const xs = gridOf(interval, gridPoints);
  const breaks: number[] = [];
  // ⚠️ 记的是**上一个非零**方向,不是上一步的方向。
  // 抛物线顶点几乎总是落在两个采样点中间,跨过顶点那一步左右等高、方向为 0;
  // 要是让 0 覆盖掉记忆,-1 → 0 → +1 就被拆成两次"和 0 比较",一个转折都认不出来。
  // (最早就是这么写的,这条测试把它抓了出来。)
  let lastDirection: 1 | -1 | null = null;
  for (let i = 0; i + 1 < xs.length; i += 1) {
    const y1 = fn.at(xs[i]!);
    const y2 = fn.at(xs[i + 1]!);
    if (y1 === null || y2 === null) continue;
    if (y1 === y2) continue; // 平坦段不改变趋势,也不算转折
    const direction: 1 | -1 = y2 > y1 ? 1 : -1;
    if (lastDirection !== null && direction !== lastDirection) {
      breaks.push((xs[i]! + xs[i + 1]!) / 2);
    }
    lastDirection = direction;
  }
  return breaks;
}

/** 显示用。屏幕上的每个数字都从这里出去,组件里不许自己 toFixed。 */
export function showNumber(value: number, places = 2): string {
  if (!Number.isFinite(value)) return '—';
  // 避免 -0.00
  const fixed = value.toFixed(places);
  return fixed === `-${(0).toFixed(places)}` ? (0).toFixed(places) : fixed;
}
