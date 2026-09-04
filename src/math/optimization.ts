/**
 * MATH — 最优化:把"最大/最小"变成一张**有限的候选名单**。
 *
 * ⭐⭐ 这一课要拆掉学生最深的一个坏习惯:**"求导等于零"不是答案,是筛选。**
 *
 *   课本流程被记成了一句口诀:列式子 → 求导 → 令导数为零 → 解出来 → 交卷。
 *   这套口诀在两种情况下会**安静地给出错误答案**:
 *
 *   ① 导数为零的点**根本不在定义域里**(甚至一个都没有)。
 *      同一个面积函数,栅栏够长时最优在 x = 25;
 *      地块只有 15 尺深时,25 够不着 —— 导数在整个定义域上**从不为零**,
 *      而最大值确确实实存在,它在**端点**上。
 *      ⭐ 这两个情景用的是**同一个函数**,只是定义域不同,答案就不同。
 *      **定义域是题目的一部分,不是背景板。**
 *
 *   ② 导数为零的点是**最小**,不是最大(或者两者都不是)。
 *
 *   所以正确的说法是:**极值只可能出现在两种地方 —— 导数为零处,或者区间端点。**
 *   把这些点凑成一张有限的名单,逐个代进原函数比大小。
 *   求导的作用是**把无限个候选缩成有限个**,不是直接吐出答案。
 *
 * ⭐ 两条互不相干的路径算同一个最优值:
 *   ① `optimumByDerivative` —— 只看那张候选名单(导数零点 + 端点),逐个代入比大小;
 *   ② `optimumByScan`       —— 在定义域上密集取样直接找最大/最小,**完全不碰导数**。
 *   两者必须一致。② 不知道导数是什么,所以它的一致是一次真检验:
 *   如果候选名单漏了谁(比如忘了端点),② 会当场抓住。
 *
 * ⚠️ 定义域外的导数零点必须被**丢掉**,不能算进名单 ——
 *   窄地块那一情景全靠这一条,否则会给出 x = 25 这个**造不出来的答案**。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import { showNumber } from './format';

/* ══ 情景 ══════════════════════════════════════════════════════════ */

export type Goal = 'max' | 'min';

export interface Scenario {
  readonly id: string;
  readonly label: string;
  /** 一句话题面 */
  readonly question: string;
  readonly goal: Goal;
  /** 目标函数 */
  readonly f: (x: number) => number;
  /** 解析导数 */
  readonly fPrime: (x: number) => number;
  /** 解析二阶导 —— 用来判定零点是峰还是谷 */
  readonly fDouble: (x: number) => number;
  /** 定义域(闭区间)。⚠️ 它由题目里的实物限制决定,不是随手划的画图范围。 */
  readonly domain: readonly [number, number];
  /** 定义域**为什么**是这个 —— 界面上要说出来 */
  readonly domainWhy: string;
  /**
   * `f'` 的**全部**解析零点,含落在定义域外的。
   * ⚠️ 故意把界外的也列出来:窄地块那一课的全部意义就是
   *    "这个零点存在,但它在界外" —— 藏起来就没得讲了。
   */
  readonly criticalRoots: readonly number[];
  readonly xLabel: string;
  readonly yLabel: string;
  readonly objectiveTex: string;
  readonly derivativeTex: string;
  readonly startX: number;
}

const BOX_SHEET = 20;
const CAN_VOLUME = 1000;

export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'fence',
    label: 'Fence three sides of a river plot',
    question:
      'You have 100 ft of fence and a straight river. Fence three sides of a rectangle — the river is the fourth. How deep should it be?',
    goal: 'max',
    f: (x) => x * (100 - 2 * x),
    fPrime: (x) => 100 - 4 * x,
    fDouble: () => -4,
    domain: [0, 50],
    domainWhy: 'Depth cannot be negative, and two depths alone already use all 100 ft at x = 50.',
    criticalRoots: [25],
    xLabel: 'x (depth, ft)',
    yLabel: 'area (sq ft)',
    objectiveTex: 'A(x) = x(100 - 2x)',
    derivativeTex: "A'(x) = 100 - 4x",
    startX: 12,
  },
  {
    /**
     * ⭐⭐ 和上面**同一个函数**,只换定义域。
     * 导数零点 25 落在界外,于是 `A'` 在整个定义域上**从不为零**,
     * 而最大面积照样存在 —— 在右端点。
     * "令导数为零"这一步在这里给出的是**空集**。
     */
    id: 'narrow',
    label: 'The same fence on a narrow lot',
    question:
      'Same 100 ft of fence, same river — but the lot is only 15 ft deep. Now how deep should it be?',
    goal: 'max',
    f: (x) => x * (100 - 2 * x),
    fPrime: (x) => 100 - 4 * x,
    fDouble: () => -4,
    domain: [0, 15],
    domainWhy: 'The lot itself is 15 ft deep. You cannot fence past the property line.',
    criticalRoots: [25],
    xLabel: 'x (depth, ft)',
    yLabel: 'area (sq ft)',
    objectiveTex: 'A(x) = x(100 - 2x)',
    derivativeTex: "A'(x) = 100 - 4x",
    startX: 6,
  },
  {
    id: 'box',
    label: 'Cut corners, fold a box',
    question:
      'Cut a square of side x from each corner of a 20 in by 20 in sheet and fold up the sides. Which cut gives the biggest volume?',
    goal: 'max',
    f: (x) => x * (BOX_SHEET - 2 * x) ** 2,
    // V' = (20 − 2x)² + x·2(20 − 2x)(−2) = (20 − 2x)(20 − 6x)
    fPrime: (x) => (BOX_SHEET - 2 * x) * (BOX_SHEET - 6 * x),
    fDouble: (x) => 24 * x - 8 * BOX_SHEET,
    domain: [0, BOX_SHEET / 2],
    domainWhy: 'Two cuts of size x come out of a 20 in side, so x cannot pass 10 — at 10 nothing is left.',
    criticalRoots: [BOX_SHEET / 6, BOX_SHEET / 2],
    xLabel: 'x (corner cut, in)',
    yLabel: 'volume (cu in)',
    objectiveTex: 'V(x) = x(20 - 2x)^2',
    derivativeTex: "V'(x) = (20 - 2x)(20 - 6x)",
    startX: 1.5,
  },
  {
    /** 求**最小**的一个 —— 免得学生以为最优化就是求最大。 */
    id: 'can',
    label: 'The cheapest can',
    question:
      'A cylindrical can must hold 1000 cubic cm. Which radius uses the least metal?',
    goal: 'min',
    f: (r) => 2 * Math.PI * r * r + (2 * CAN_VOLUME) / r,
    fPrime: (r) => 4 * Math.PI * r - (2 * CAN_VOLUME) / (r * r),
    fDouble: (r) => 4 * Math.PI + (4 * CAN_VOLUME) / (r * r * r),
    domain: [1, 20],
    domainWhy: 'A can thinner than 1 cm or wider than 20 cm is not a can anyone would make.',
    criticalRoots: [Math.cbrt(CAN_VOLUME / (2 * Math.PI))],
    xLabel: 'r (radius, cm)',
    yLabel: 'surface (sq cm)',
    objectiveTex: 'S(r) = 2\\pi r^2 + \\frac{2000}{r}',
    derivativeTex: "S'(r) = 4\\pi r - \\frac{2000}{r^2}",
    startX: 2,
  },
  {
    /**
     * ⭐⭐ 口诀更**危险**的一种失败:它给出了答案,而答案是错的。
     *
     *   窄地块那题里口诀给不出东西,人还会警觉。
     *   这里 `f'` 在区间内有两个零点,口诀照常走完全套,
     *   自信地交出 x = 1 —— 那确实是个**局部**峰(二阶导为负),
     *   可右端点比它高一倍还多。**局部最大不是最大。**
     *
     *   候选名单法不会上当:端点本来就在名单里,一比大小就露馅。
     */
    id: 'localpeak',
    label: 'A local peak that loses to the edge',
    question:
      'This curve has a genuine peak at x = 1 — the derivative is zero there and it is a maximum. Is it the answer?',
    goal: 'max',
    f: (x) => x * (x - 3) ** 2,
    // f = x³ − 6x² + 9x,f' = 3x² − 12x + 9 = 3(x−1)(x−3)
    fPrime: (x) => 3 * (x - 1) * (x - 3),
    fDouble: (x) => 6 * x - 12,
    domain: [0, 4.5],
    domainWhy: 'The run is capped at 4.5 by the machine, not by the shape of the curve.',
    criticalRoots: [1, 3],
    xLabel: 'x',
    yLabel: 'output',
    objectiveTex: 'f(x) = x(x - 3)^2',
    derivativeTex: "f'(x) = 3(x - 1)(x - 3)",
    startX: 1,
  },
  {
    /**
     * ⭐⭐ 二阶导检验**答不上来**的那一类点。
     *
     *   `C'(4) = 0` 且 `C''(4) = 0` —— 二阶导检验在这里保持沉默,
     *   既不说峰也不说谷。很多学生到这一步就卡死了,
     *   因为他们以为二阶导是**唯一**的判定手段。
     *
     *   ⭐ 而候选名单法根本不需要它:把候选代进原函数比大小就完了。
     *     判定凹凸是**方便**,不是**必需**。
     */
    id: 'flatbottom',
    label: 'Where the second derivative says nothing',
    question:
      'Being off target by any amount costs you, and the penalty is extremely flat near the target. Where is the cheapest point?',
    goal: 'min',
    f: (x) => (x - 4) ** 4 + 5,
    fPrime: (x) => 4 * (x - 4) ** 3,
    fDouble: (x) => 12 * (x - 4) ** 2,
    domain: [0, 10],
    domainWhy: 'The dial only turns from 0 to 10.',
    criticalRoots: [4],
    xLabel: 'x (dial setting)',
    yLabel: 'cost',
    objectiveTex: 'C(x) = (x - 4)^4 + 5',
    derivativeTex: "C'(x) = 4(x - 4)^3",
    startX: 1.5,
  },
] as const;

export function scenarioOf(id: string): Scenario {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0]!;
}

/* ══ 候选名单 ══════════════════════════════════════════════════════ */

export type Origin = 'critical' | 'endpoint';

export interface Candidate {
  readonly x: number;
  readonly value: number;
  readonly origin: Origin;
  /** 二阶导给出的判定 —— 端点不适用,记 null */
  readonly shape: 'peak' | 'valley' | 'flat' | null;
}

/** ⚠️ 落在定义域**里面**的导数零点。界外的一律不算候选。 */
export function criticalInside(s: Scenario): readonly number[] {
  const [a, b] = s.domain;
  return s.criticalRoots.filter((r) => r >= a && r <= b).slice().sort((p, q) => p - q);
}

/** ⭐ 被定义域挡在外面的那些零点 —— 窄地块那一课要指着它们讲。 */
export function criticalOutside(s: Scenario): readonly number[] {
  const [a, b] = s.domain;
  return s.criticalRoots.filter((r) => r < a || r > b);
}

function shapeAt(s: Scenario, x: number): 'peak' | 'valley' | 'flat' {
  const second = s.fDouble(x);
  if (second === 0) return 'flat';
  return second < 0 ? 'peak' : 'valley';
}

/**
 * ⭐⭐ 完整的候选名单:**导数零点 ∪ 区间端点**。
 * 极值只可能在这些地方 —— 这就是把无限缩成有限的那一步。
 * ⚠️ 端点一个都不能漏。漏掉端点正是"窄地块"那一题会做错的原因。
 */
export function candidates(s: Scenario): readonly Candidate[] {
  const [a, b] = s.domain;
  const inside = criticalInside(s);
  const xs: { x: number; origin: Origin }[] = [
    { x: a, origin: 'endpoint' },
    ...inside.map((x) => ({ x, origin: 'critical' as Origin })),
    { x: b, origin: 'endpoint' },
  ];
  // 零点正好落在端点上时(比如切角那题的 x = 10),只留一个,标成端点
  const seen = new Set<number>();
  const out: Candidate[] = [];
  for (const { x, origin } of xs) {
    if (seen.has(x)) continue;
    seen.add(x);
    out.push({
      x,
      value: s.f(x),
      origin: x === a || x === b ? 'endpoint' : origin,
      shape: x === a || x === b ? null : shapeAt(s, x),
    });
  }
  return out.sort((p, q) => p.x - q.x);
}

/* ══ 两条独立路径 ══════════════════════════════════════════════════ */

/**
 * ⚠️ 严格不等号,不是 `>=`。并列时**先来的留下** ——
 *   也就是 x 最小的那个。对称的题目会真的并列(比如同一条曲线上两个一样高的峰),
 *   那时报哪一个都对,但页面必须每次报同一个,不能看循环顺序的脸色。
 */
function better(goal: Goal, a: number, b: number): boolean {
  return goal === 'max' ? a > b : a < b;
}

/** 路径 ① —— 只用候选名单。求导在这里的职责就是**生成名单**。 */
export function optimumByDerivative(s: Scenario): Candidate {
  const list = candidates(s);
  let best = list[0]!;
  for (const c of list) if (better(s.goal, c.value, best.value)) best = c;
  return best;
}

/**
 * 路径 ② —— 在定义域上密集取样,**完全不碰导数**。
 * 它不知道 `fPrime` 存在,所以它和 ① 的一致是一次真检验:
 * 名单里漏了谁,这里会当场抓住。
 */
export function optimumByScan(s: Scenario, n = 200_000): { x: number; value: number } {
  const [a, b] = s.domain;
  let bestX = a;
  let bestV = s.f(a);
  let visited = 0;
  for (let i = 0; i <= n; i += 1) {
    const x = a + ((b - a) * i) / n;
    const v = s.f(x);
    visited += 1;
    if (Number.isFinite(v) && better(s.goal, v, bestV)) {
      bestV = v;
      bestX = x;
    }
  }
  // ⚠️ 空转保护:循环真的跑过
  if (visited < 2) throw new Error('scan never ran');
  return { x: bestX, value: bestV };
}

/** ⭐ 两条路径给出的**最优值**必须一致。 */
export function pathsAgree(s: Scenario, tol = 1e-4): boolean {
  const byList = optimumByDerivative(s).value;
  const byScan = optimumByScan(s).value;
  const scale = Math.max(1, Math.abs(byList));
  return Math.abs(byList - byScan) <= tol * scale;
}

/* ══ 这一课的两个陷阱 ══════════════════════════════════════════════ */

/**
 * ⭐⭐ 答案落在端点上吗?
 * 落在端点上,就意味着"令导数为零"这一步**给不出答案** —— 这一课的重点。
 */
export function answerIsAtEndpoint(s: Scenario): boolean {
  return optimumByDerivative(s).origin === 'endpoint';
}

/** ⭐ 定义域里一个导数零点都没有 —— 口诀在这里彻底失效。 */
export function noCriticalPointAtAll(s: Scenario): boolean {
  return criticalInside(s).length === 0;
}

/**
 * ⭐ 光"求导等于零"能得到正确答案吗?
 * ⚠️ 这个函数存在的意义是让页面**能诚实地说"不能"**。
 *   两种失败:定义域里没有零点;或者有零点但它不是最优的那个。
 */
export function recipeWouldSucceed(s: Scenario): boolean {
  const inside = criticalInside(s);
  if (inside.length === 0) return false;
  const best = optimumByDerivative(s);
  return best.origin === 'critical';
}

/**
 * 只按口诀做会得到什么答案 —— 用来和真答案并排放。
 * ⚠️ 定义域里没有零点时返回 `null`,不是随便挑一个。
 *   有多个零点时口诀本身没说选哪个,这里取最优的那个 ——
 *   **已经替口诀多做了一步**,即便如此它还是可能错。
 */
export function recipeAnswer(s: Scenario): number | null {
  const inside = criticalInside(s);
  if (inside.length === 0) return null;
  let best = inside[0]!;
  for (const x of inside) if (better(s.goal, s.f(x), s.f(best))) best = x;
  return best;
}

/** 口诀的答案比真答案差多少(以目标函数的值计)。没有口诀答案时为 null。 */
export function recipeShortfall(s: Scenario): number | null {
  const guess = recipeAnswer(s);
  if (guess === null) return null;
  return Math.abs(optimumByDerivative(s).value - s.f(guess));
}

/* ══ 画图 ══════════════════════════════════════════════════════════ */

export function sampleF(s: Scenario, n = 240): readonly { x: number; y: number }[] {
  const [a, b] = s.domain;
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i <= n; i += 1) {
    const x = a + ((b - a) * i) / n;
    const y = s.f(x);
    if (Number.isFinite(y)) out.push({ x, y });
  }
  return out;
}

/**
 * 纵轴范围。⚠️ 从样本求,不写死 —— 换个情景数量级差很远。
 *
 * ⚠️⚠️ **界外那一段也要算进来。**
 *   第一版只统计定义域内的样本,于是窄地块的纵轴顶到 1050,
 *   而界外那个够不着的峰在 1250 —— **它被画到画框外面去了**。
 *   `[data-unreachable]` 那个圆点在 DOM 里好端端地存在,断言全绿,
 *   可屏幕上根本看不见它:这一课的主视觉就这么没了。
 *   DOM 里有,和画得出来,是两件事。
 */
export function yRange(s: Scenario): readonly [number, number] {
  const ys = [...sampleF(s), ...sampleBeyond(s)].map((p) => p.y);
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  const pad = (hi - lo) * 0.08 || 1;
  return [lo - pad, hi + pad];
}

/**
 * ⭐⭐ 画到定义域**外面**去的那一段。
 *
 * ⚠️ 这不是装饰,它是"窄地块"那一课的**主视觉**:
 *   学生要亲眼看见那个峰确实存在、确实是导数为零的地方,
 *   **只是它落在地块外面**。只画定义域内的一段,这句话就没处安放了。
 *
 * 返回 null 表示没有界外零点,不必画。
 */
export function outsideSpan(s: Scenario): readonly [number, number] | null {
  const out = criticalOutside(s);
  if (out.length === 0) return null;
  const [a, b] = s.domain;
  const lo = Math.min(a, ...out);
  const hi = Math.max(b, ...out);
  /**
   * ⚠️ 只在**确实被推出去的那一侧**留边。
   * 第一版两侧一起留,把窄地块的左端从 0 推到 −3 ——
   * 深度为负的栅栏是没有意义的,而它还会把纵轴范围往下拽 300 多。
   */
  const pad = (hi - lo) * 0.12;
  return [lo < a ? lo - pad : lo, hi > b ? hi + pad : hi];
}

/** 界外那一段的取样(含界内,方便一笔画完)。 */
export function sampleBeyond(s: Scenario, n = 240): readonly { x: number; y: number }[] {
  const span = outsideSpan(s);
  if (span === null) return [];
  const [lo, hi] = span;
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i <= n; i += 1) {
    const x = lo + ((hi - lo) * i) / n;
    const y = s.f(x);
    if (Number.isFinite(y)) out.push({ x, y });
  }
  return out;
}

export function clampX(s: Scenario, x: number): number {
  if (!Number.isFinite(x)) return s.startX;
  return Math.min(Math.max(x, s.domain[0]), s.domain[1]);
}

/* ══ 显示 ══════════════════════════════════════════════════════════ */

export const HEADLINE = 'Setting the Derivative to Zero Is a Filter, Not an Answer';
export const MAIN_IDEA =
  'An extreme value can only sit where the derivative is zero or at an end of the interval. The derivative narrows infinitely many candidates down to a handful; you still have to check them.';

export const ENDPOINT_NOTE =
  'The derivative is never zero anywhere in this interval, yet the largest value plainly exists. It sits at the end. The recipe returns nothing here, so following it would leave you with no answer at all — or with a number the problem cannot build.';

export const SAME_FUNCTION_NOTE =
  'This is the same function as the previous scenario. Only the interval changed, and the answer changed with it. The interval is part of the problem, not the frame around it.';

export function show(value: number | null, places = 4): string {
  return value === null || !Number.isFinite(value) ? 'undefined' : showNumber(value, places);
}
