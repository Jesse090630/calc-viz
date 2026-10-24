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

/**
 * ⚠️ 这里曾经有两套平均算法(`mean-of-grades` / `total-points`)并排摆着,
 *   因为当时还不知道老师用哪一种。现在定了:**按总分**。
 *   另一套连同那块对比面板一起删掉了 —— 留着一个界面上走不到的分支,
 *   就是这个项目一直在清的那种"死代码"。
 *
 * ⭐ 而且加分只能长在这个模型上:"额外加 46 分"要加到**分子**上,
 *   这件事只有在"Σ得分 / Σ满分"里才说得通;
 *   按项平均的模型里没有一个"总得分"可以让它加进去。
 */

/**
 * 一条测验通道。
 *
 * ⚠️ 分数不再是"百分制的一个数",而是**得分 / 满分**两个数。
 *   起因是 project 在 PowerSchool 里是按 50 分计的(46/50),
 *   而原来的模型默认一切都是百分制 —— 46 会被当成 46%。
 *
 * ⚠️ `possible` 恒 ≥ 1(输入时夹住),所以 `percentOf` 不存在除以 0 的情况。
 *   与其留一个"满分为 0"的分支再去想页面上怎么显示,不如让它根本不可能出现。
 */
export interface Item {
  readonly name: string;
  readonly earned: number;
  readonly possible: number;
  readonly muted: boolean;
}

/** 一条通道的百分比。 */
export function percentOf(it: Item): number {
  return (it.earned / it.possible) * 100;
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
  /**
   * 加分拿到的分数。
   * ⚠️⚠️ 它**只加到分子上**,`ecPossible` 不进分母 —— 这正是"加分"的意思:
   *   它能把类目均分顶到 100% 以上。要是连分母一起加,那就只是一道普通的
   *   50 分测验,和原来的 Project 一模一样,这个字段也就没有存在的必要了。
   */
  readonly ecEarned: number;
  /** 加分满分。只用来限制输入上限和显示 "46 / 50",**不进分母**。 */
  readonly ecPossible: number;
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
  // ⚠️ 默认 0:页面一打开不替用户假设他拿了多少加分,让他自己填。
  ecEarned: 0,
  ecPossible: 50,
};

export const SEED_ITEMS: readonly Item[] = [
  { name: 'Assess 1', earned: 83, possible: 100, muted: false },
  { name: 'Assess 2', earned: 91, possible: 100, muted: false },
  { name: 'Assess 3', earned: 85, possible: 100, muted: false },
  { name: 'Assess 4', earned: 88, possible: 100, muted: false },
  { name: 'Assess 5', earned: 88, possible: 100, muted: false },
  { name: 'Assess 6', earned: 88, possible: 100, muted: false },
  { name: 'Assess 7', earned: 88, possible: 100, muted: true },
];

/** 满分:至少 1 分。夹在这里,`percentOf` 就不可能除以 0。 */
export function clampPossible(x: number): number {
  return Number.isFinite(x) ? Math.max(1, x) : 1;
}

/**
 * 得分:夹在 0..满分 之间。
 * ⚠️ 这等于不支持超过满分的加分卷(52/50)。这是个**有意的取舍**:
 *   它让百分比恒在 0..100,推子的行程也就有确切含义。
 *   真要记加分,把满分调高即可。
 */
export function clampEarned(x: number, possible: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(clampPossible(possible), x));
}

/** 加分:夹在 0..加分满分 之间。 */
export function clampBonus(x: number, ecPossible: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(clampPossible(ecPossible), x));
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
  /** 类目平均分(百分比)。没有任何一条计入时是 `null` —— 不是 0,也不是 NaN。 */
  readonly mean: number | null;
  /** 被丢掉那条的下标;没丢就是 −1。 */
  readonly droppedIndex: number;
  readonly counted: number;
  readonly live: number;
  /** 计入的那些条,得分合计与满分合计(**不含加分**)。 */
  readonly earned: number;
  readonly possible: number;
  /** 加进分子的加分。 */
  readonly bonus: number;
}

/**
 * ⭐⭐⭐ 丢最低按**百分比**挑,不是按卷面原始分。
 *
 * ⚠️ 这一条不是细节,是正确性问题:按原始分挑的话,46/50 的 project(92%)
 *   会显得比 83/100 的测验**更低**,于是被错误地丢掉 ——
 *   学生看到的是"系统帮我丢了考得最好的那一场"。
 * ⚠️ 两种平均算法都走这一条规则,不随算法改变。
 *
 * ⚠️ 顺带记一笔(**不是 bug,是老师的规则**):在 `total-points` 下,
 *   丢掉"百分比最低"的那条并不一定让类目均分最高 —— 丢一条分值大、
 *   百分比略高的,有时反而更划算。但该丢哪条由老师的系统决定,不由我们优化。
 *
 * ⚠️ 只丢**一条**,而且只在还剩别的条的时候丢:
 *   就剩一条还丢掉,均分就没了,页面会从"算得出"变成"算不出" ——
 *   那不是老师的规则,是实现的副作用。
 * ⚠️ 并列最低时取**最靠前**的那条。规则本身无所谓取哪条(百分比一样),
 *   但必须**定死**,否则同样的输入会显示不同的"Dropped"标记。
 */
export function countedMean(
  items: readonly Item[],
  dropLowest: boolean,
  bonus = 0,
): Counted {
  const live: number[] = [];
  items.forEach((it, i) => {
    if (!it.muted) live.push(i);
  });

  let droppedIndex = -1;
  if (dropLowest && live.length > 1) {
    let lowest = Infinity;
    for (const i of live) {
      const pct = percentOf(items[i]!);
      if (pct < lowest) lowest = pct;
    }
    for (const i of live) {
      if (percentOf(items[i]!) === lowest) {
        droppedIndex = i;
        break;
      }
    }
  }

  let earned = 0;
  let possible = 0;
  let counted = 0;
  for (const i of live) {
    if (i !== droppedIndex) {
      const it = items[i]!;
      earned += it.earned;
      possible += it.possible;
      counted += 1;
    }
  }

  // ⚠️ 加分只进分子。`possible` 一个点都不加 —— 见 `Setup.ecEarned` 的说明。
  const withBonus = earned + bonus;

  return {
    mean: possible > 0 ? (withBonus / possible) * 100 : null,
    droppedIndex,
    counted,
    live: live.length,
    earned,
    possible,
    bonus,
  };
}

/**
 * **另一条算法**:把每一项的百分比按满分加权平均,再把加分折成百分点加进去。
 *
 * ⭐ 存在的理由只有验证。代数上
 *     Σ(百分比ᵢ × 满分ᵢ) = Σ(得分ᵢ/满分ᵢ × 100 × 满分ᵢ) = 100 × Σ得分ᵢ
 *   所以这条和 `(Σ得分 + 加分)/Σ满分` 恒等 —— 但一条只碰百分比,
 *   一条只碰原始分,代码路径完全不同。两条给不出同一个数就是有一条写错了。
 */
export function totalPointsByWeightedMean(
  items: readonly Item[],
  dropLowest: boolean,
  bonus = 0,
): number | null {
  const c = countedMean(items, dropLowest, bonus);
  if (c.possible <= 0) return null;
  const live: number[] = [];
  items.forEach((it, i) => {
    if (!it.muted) live.push(i);
  });
  let num = 0;
  let den = 0;
  for (const i of live) {
    if (i !== c.droppedIndex) {
      const it = items[i]!;
      num += percentOf(it) * it.possible;
      den += it.possible;
    }
  }
  return (num + 100 * bonus) / den;
}

/* ── 旧存档迁移 ────────────────────────────────────────────── */

/**
 * 把一条来历不明的存档记录变成一条合法的 `Item`。
 *
 * ⚠️ 这个函数存在是因为**改模型会悄悄弄坏已经存下来的数据**。
 *   旧版本存的是 `{ name, score, muted }`,`score` 就是百分比;
 *   新版本是 `{ name, earned, possible, muted }`。什么都不做的话,
 *   `earned` 读出来是 `undefined` → `NaN` → 页面上整列变成空白,
 *   而且**不报任何错**。这正是最难发现的那一类故障。
 *
 * ⭐ 旧的 `score` 原本就是百分制,所以 `score → earned/100` 是**等价变换**:
 *   迁移前后百分比一模一样,用户看不出发生过迁移。
 *
 * ⚠️ 放在这里而不是组件里,是因为它必须能被单测钉死。
 */
export function migrateItem(raw: unknown): Item {
  const o = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const name = typeof o['name'] === 'string' && o['name'].length > 0 ? o['name'] : 'Item';
  const muted = Boolean(o['muted']);

  const possibleRaw = Number(o['possible']);
  const earnedRaw = Number(o['earned']);
  if (Number.isFinite(possibleRaw) && Number.isFinite(earnedRaw)) {
    const possible = clampPossible(possibleRaw);
    return { name, possible, earned: clampEarned(earnedRaw, possible), muted };
  }

  // 旧格式:只有一个百分制的 `score`
  const score = Number(o['score']);
  const pct = Number.isFinite(score) ? score : 0;
  return { name, possible: 100, earned: clampEarned(pct, 100), muted };
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

/** 类目均分那一项的展开式 —— 加分加在分子上,分母不动。 */
export const AVERAGE_TEX =
  '\\bar{x}=\\frac{\\sum \\text{earned}+\\text{EC}}{\\sum \\text{possible}}\\times 100';

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
