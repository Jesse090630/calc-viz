/**
 * MATH — 加权学期成绩:倒着解出期末要考多少。
 *
 * ⭐⭐⭐ 整个模型只有一条式子:
 *   成绩 = w_assign · 平时分 + w_assess · 测验均分 + w_final · 期末
 *   把它对期末反解,就得到"要拿到目标分,期末至少要多少"。
 *   页面上所有的数都从这一条来,没有第二套算法。
 *
 * ⭐⭐ 三条互不相干的验证路径(项目规矩),而且第二条就是最朴素的验算:
 *   ① `finalNeeded` —— 闭式反解。
 *   ② `gradeWith(…, finalNeeded(…))` 必须**正好落在目标上**。正向代回去。
 *   ③ `finalNeededByBisection` —— 对正向函数做二分,完全不碰那条反解公式。
 *   三条都给同一个数才算对。
 *
 * ⚠️⚠️ **这里修掉了原稿的一处真算错。**
 *   原稿在"目标够不到"的时候写:
 *       "a perfect final still lands (need − 100) points short"
 *   可 `need` 是**期末卷面**的分,而"差多少"问的是**学期总评**的分。
 *   两者差一个期末权重:总评差 = w_final × (need − 100)。
 *   期末占 25% 时,原稿把差距**夸大了整整四倍** ——
 *   一个其实只差 9 分的人,会被告知差了 36 分。
 *   这不是小数点问题:它会让人直接放弃。见 `missBy`。
 *
 * ⚠️ 分数一律夹在 0..100;权重用百分数存(和输入框一致),算的时候才除以 100。
 */

/**
 * 可以瞄的目标。
 * ⭐ 用一个数组 + `typeof GOALS[number]` 推类型,而不是手写联合:
 *   页面上的按钮直接遍历它,以后再加一档(D 之类)只改这一行,
 *   `targetOf` 的 switch 会**编译不过**,逼着你把该改的地方都改掉。
 */
export const GOALS = ['A', 'B', 'C'] as const;
export type Goal = (typeof GOALS)[number];

/** 一条测验通道。`muted` = 这场可能不考,先不算进去。 */
export interface Item {
  readonly name: string;
  readonly score: number;
  readonly muted: boolean;
}

/** 一门课的规则。权重是百分数(10 表示 10%),不是小数。 */
export interface Setup {
  readonly wAssign: number;
  readonly wAssess: number;
  readonly wFinal: number;
  /** 平时分already拿到的分数 —— 通常是满分。 */
  readonly assignScore: number;
  readonly targetA: number;
  readonly targetB: number;
  readonly targetC: number;
  readonly dropLowest: boolean;
  readonly goal: Goal;
}

export const SEED_SETUP: Setup = {
  wAssign: 10,
  wAssess: 65,
  wFinal: 25,
  assignScore: 100,
  targetA: 89.5,
  targetB: 79.5,
  targetC: 69.5,
  dropLowest: true,
  goal: 'A',
};

export const SEED_ITEMS: readonly Item[] = [
  { name: 'Assess 1', score: 83, muted: false },
  { name: 'Assess 2', score: 91, muted: false },
  { name: 'Assess 3', score: 85, muted: false },
  { name: 'Assess 4', score: 88, muted: false },
  { name: 'Project', score: 92, muted: false },
  { name: 'Assess 5', score: 88, muted: false },
  { name: 'Assess 6', score: 88, muted: false },
  { name: 'Assess 7', score: 88, muted: true },
];

export function clampScore(x: number): number {
  return Math.max(0, Math.min(100, x));
}

/** 某一档的分数线。 */
export function cutoffOf(s: Setup, goal: Goal): number {
  // ⚠️ 故意不写 `default` —— 没有 default 的 switch 在 strict 下会做穷尽性检查,
  //   以后 `GOALS` 里多一档而这里漏了,就是一个编译错误,而不是一个悄悄返回
  //   undefined 的运行时 bug。
  switch (goal) {
    case 'A':
      return s.targetA;
    case 'B':
      return s.targetB;
    case 'C':
      return s.targetC;
  }
}

/** 当前瞄的那一档的分数线。 */
export function targetOf(s: Setup): number {
  return cutoffOf(s, s.goal);
}

export function weightsOf(s: Setup): {
  readonly assign: number;
  readonly assess: number;
  readonly final: number;
} {
  return { assign: s.wAssign / 100, assess: s.wAssess / 100, final: s.wFinal / 100 };
}

export function weightSum(s: Setup): number {
  return s.wAssign + s.wAssess + s.wFinal;
}

/** 权重加起来不是 100 的时候要提醒。⚠️ 浮点,不能用 `=== 100`。 */
export const WEIGHT_SLOP = 0.01;

export function weightsBalanced(s: Setup): boolean {
  return Math.abs(weightSum(s) - 100) <= WEIGHT_SLOP;
}

/* ── 均分与丢最低 ──────────────────────────────────────────── */

export interface Counted {
  /** 没有任何一条计入时是 `null` —— 不是 0,也不是 NaN。 */
  readonly mean: number | null;
  /** 被丢掉那条的下标;没丢就是 −1。 */
  readonly droppedIndex: number;
  readonly counted: number;
  readonly live: number;
}

/**
 * ⚠️ 只丢**一条**,而且只在还剩别的条的时候丢:
 *   就剩一条还丢掉,均分就没了,页面会从"算得出"变成"算不出" ——
 *   那不是老师的规则,是实现的副作用。
 * ⚠️ 并列最低时取**最靠前**的那条。规则本身无所谓取哪条(分数一样),
 *   但必须**定死**,否则同样的输入会显示不同的"Dropped"标记。
 */
export function countedMean(items: readonly Item[], dropLowest: boolean): Counted {
  const live: number[] = [];
  items.forEach((it, i) => {
    if (!it.muted) live.push(i);
  });

  let droppedIndex = -1;
  if (dropLowest && live.length > 1) {
    let lowest = Infinity;
    for (const i of live) {
      if (items[i]!.score < lowest) lowest = items[i]!.score;
    }
    for (const i of live) {
      if (items[i]!.score === lowest) {
        droppedIndex = i;
        break;
      }
    }
  }

  let sum = 0;
  let counted = 0;
  for (const i of live) {
    if (i !== droppedIndex) {
      sum += items[i]!.score;
      counted += 1;
    }
  }
  return {
    mean: counted > 0 ? sum / counted : null,
    droppedIndex,
    counted,
    live: live.length,
  };
}

/* ── 正向与反解 ────────────────────────────────────────────── */

/** 正向:给定测验均分和期末分,学期总评是多少。 */
export function gradeWith(s: Setup, mean: number, final: number): number {
  const w = weightsOf(s);
  return w.assign * s.assignScore + w.assess * mean + w.final * final;
}

/**
 * 反解:要落在目标上,期末得考多少。
 * ⚠️ 期末权重为 0 时**解不出来** —— 期末考多少都不改变总评。
 *   返回 `null`,由调用方去说那句话,而不是在这里返回一个假的数。
 */
export function finalNeeded(s: Setup, mean: number | null): number | null {
  const w = weightsOf(s);
  if (mean === null || w.final <= 0) return null;
  return (targetOf(s) - w.assign * s.assignScore - w.assess * mean) / w.final;
}

/**
 * 第三条路径:对**正向**函数二分,根本不碰上面那条反解公式。
 *
 * ⭐ 它存在的唯一理由是验证,不是效率。正向成绩关于期末分是严格单调递增的
 *   (斜率就是 w_final > 0),所以二分一定收敛到同一个根。
 * ⚠️ 搜索区间要**超出** 0..100:够不到的目标对应的根就在 100 以上,
 *   夹在 0..100 里会得到一个错的"根",而且错得看不出来。
 */
export function finalNeededByBisection(s: Setup, mean: number | null): number | null {
  const w = weightsOf(s);
  if (mean === null || w.final <= 0) return null;
  const goal = targetOf(s);
  let lo = -1000;
  let hi = 1000;
  for (let i = 0; i < 200; i += 1) {
    const mid = (lo + hi) / 2;
    if (gradeWith(s, mean, mid) < goal) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/* ── 结论 ──────────────────────────────────────────────────── */

export type Verdict =
  | 'no-data'
  | 'final-does-not-count'
  | 'locked'
  | 'comfortable'
  | 'doable'
  | 'tight'
  | 'unreachable';

/**
 * 分档的两个界。
 * ⚠️ 这两个数没有数学上的来历,它们是**措辞**的界,不是计算的界 ——
 *   所以它们只影响那个词和颜色,一个数字都不影响。
 *   92 以上叫"紧",是因为那已经高过大多数人的平时水平;
 *   75 以下叫"宽松",是因为那低于及格线一大截。
 */
export const TIGHT_ABOVE = 92;
export const COMFORTABLE_BELOW = 75;

export function verdictOf(s: Setup, mean: number | null): Verdict {
  if (mean === null) return 'no-data';
  if (weightsOf(s).final <= 0) return 'final-does-not-count';
  const need = finalNeeded(s, mean);
  if (need === null) return 'no-data';
  if (need <= 0) return 'locked';
  if (need > 100) return 'unreachable';
  if (need > TIGHT_ABOVE) return 'tight';
  if (need < COMFORTABLE_BELOW) return 'comfortable';
  return 'doable';
}

/**
 * ⭐⭐⭐ 够不到的时候,**学期总评**还差多少分。
 *
 * ⚠️ 这就是原稿算错的那个数。原稿印的是 `need − 100`,那是**期末卷面**的差距;
 *   要的是总评的差距,两者差一个 w_final。期末占 25% 时差四倍。
 *   定义上它就是:目标 − (期末考满分时的总评)。这么写就不可能再错。
 *
 * 够得到时返回 `null` —— 没有"差多少"这回事。
 */
export function missBy(s: Setup, mean: number | null): number | null {
  if (mean === null || weightsOf(s).final <= 0) return null;
  const best = gradeWith(s, mean, 100);
  const gap = targetOf(s) - best;
  return gap > 0 ? gap : null;
}

/**
 * 已经稳了的时候,**学期总评**还富余多少分(期末交白卷也够)。
 * 对称地,这也是按定义写的:期末 0 分时的总评 − 目标。
 */
export function spareBy(s: Setup, mean: number | null): number | null {
  if (mean === null || weightsOf(s).final <= 0) return null;
  const worst = gradeWith(s, mean, 0);
  const spare = worst - targetOf(s);
  return spare > 0 ? spare : null;
}

/** 期末不计分时,成绩已经定死了是多少。 */
export function lockedGrade(s: Setup, mean: number | null): number | null {
  if (mean === null || weightsOf(s).final > 0) return null;
  return gradeWith(s, mean, 0);
}

/* ── 页面上的字 ────────────────────────────────────────────── */

export const HEADLINE = 'Solve the weighted average backwards for the score you still need';

export const MAIN_IDEA =
  'Your term grade is a weighted average, and the final is the one term still unknown. Set the whole thing equal to the grade you want and solve for that term. Everything on this page is that one equation, read in the other direction.';

export const EQUATION_TEX =
  'w_{\\text{assign}}\\cdot A+w_{\\text{assess}}\\cdot \\bar{x}+w_{\\text{final}}\\cdot F=G';

export const SOLVED_TEX =
  'F=\\frac{G-w_{\\text{assign}}\\cdot A-w_{\\text{assess}}\\cdot \\bar{x}}{w_{\\text{final}}}';

export const VERDICT_WORD: Readonly<Record<Verdict, string>> = {
  'no-data': 'Nothing counted',
  'final-does-not-count': 'Final does not count',
  locked: 'Locked in',
  comfortable: 'Comfortable',
  doable: 'Doable',
  tight: 'Tight',
  unreachable: 'Out of reach',
};
