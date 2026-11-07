/**
 * MATH — AP Calculus BC 的学期成绩:倒着解出期末要考多少。
 *
 * ⭐⭐⭐ 整个模型就是教学大纲上那一条式子(原文照抄):
 *     overall = 0.10 × (mean of grades in assignments)
 *             + 0.65 × (mean of grades in assessments)
 *             + 0.25 × (final exam grade)
 *   页面上每个数都从这一条来,没有第二套算法。
 *
 * ⭐⭐ 三条互不相干的验证路径(项目规矩):
 *   ① `finalNeeded` —— 闭式反解。
 *   ② `gradeWith(…, finalNeeded(…))` 必须**正好落在目标上**。正向代回去。
 *   ③ `finalNeededByBisection` —— 对正向函数二分,完全不碰那条反解公式。
 *
 * ⭐ 丢最低**已确认**:学期末丢掉最低的那一场测验。开关留着是为了做对比,
 *   不再标成"未确认"。
 *
 * ⚠️ 还没确认的只剩一件:类目平均用 mean-of-grades 还是 total-points。
 *   大纲原文写的是 "mean of grades",所以默认它;但目前每场测验都是 100 分制,
 *   两种算法给出的数**完全一样**,所以现有成绩分不出来 —— 开关留着。
 */

/* ── 目标档位 ──────────────────────────────────────────────── */

/**
 * ⭐ 用数组 + `typeof GOALS[number]` 推类型,而不是手写联合:
 *   页面上的按钮直接遍历它,以后加一档只改这一行,
 *   `cutoffOf` 的 switch 会**编译不过**,逼着你把该改的地方都改掉。
 */
export const GOALS = ['A', 'B', 'C'] as const;
export type Goal = (typeof GOALS)[number];

/* ── 类目平均算法 ──────────────────────────────────────────── */

/**
 * · `mean-of-grades` —— 先把每一项换成百分比,再把百分比平均。
 *   **每一项权重相等**,和它值多少分无关。大纲原文就是这个,所以是默认。
 * · `total-points` —— Σ得分 / Σ满分,按分值加权。
 *
 * ⚠️ 每一项满分都一样的时候,两者**完全等价**(分母相同 ⇒ 比值的平均 = 和的比值)。
 *   目前所有测验都是 100 分制,所以这个开关现在**不影响任何数字** ——
 *   它要等到出现一个不是 100 分的项目时才有意义。
 */
export const METHODS = ['mean-of-grades', 'total-points'] as const;
export type Method = (typeof METHODS)[number];

export const METHOD_NAME: Readonly<Record<Method, string>> = {
  'mean-of-grades': 'Mean of grades',
  'total-points': 'Total points',
};

/* ── 一条测验 ──────────────────────────────────────────────── */

/**
 * ⚠️ 分数存成**得分 / 满分**两个数,而不是一个百分数。
 *   目前每场都是 100 分制,但只要出现一个 46/50 这样的,
 *   "百分比"和"卷面分"就会分道扬镳,而上面那个开关也才开始有意义。
 * ⚠️ `possible` 恒 ≥ 1(输入时夹住),所以 `percentOf` 不存在除以 0。
 */
export interface Item {
  readonly name: string;
  readonly earned: number;
  readonly possible: number;
  /** 这场可能不考(比如还没发生的测验),先不算进去。 */
  readonly muted: boolean;
}

export function percentOf(it: Item): number {
  return (it.earned / it.possible) * 100;
}

/** 满分:至少 1 分。夹在这里,`percentOf` 就不可能除以 0。 */
export function clampPossible(x: number): number {
  return Number.isFinite(x) ? Math.max(1, x) : 1;
}

/**
 * 得分:夹在 0..满分 之间。
 * ⚠️ 这等于不支持超过满分的加分卷(52/50)。有意的取舍:
 *   它让百分比恒在 0..100,推子的行程也就有确切含义。真要记,把满分调高。
 */
export function clampEarned(x: number, possible: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(clampPossible(possible), x));
}

/* ── 项目 ──────────────────────────────────────────────────── */

export type GuidelineKey = 'ownWork' | 'noWords' | 'beautiful' | 'paper' | 'safe';

/**
 * "The Art of Calculus (Without Words)" —— 自愿项目。
 *
 * ⭐⭐⭐ 计分方式很特别,值得把式子抄在这里:
 *     points = 5 × (五条准则的**乘积**) × SCORE − 50
 *   五条准则每条 0 或 1,所以**任何一条没做到,整个乘积就是 0,项目直接 −50**。
 *   SCORE = Mathematics(0/4/8/12) + Artistic(0/2/4/6) + Explanation(0/2),满分 20。
 *
 * ⚠️ 老师会给部分分,所以 SCORE 是**连续的**,不是只能取偶数 ——
 *   points = 5·S − 50 在 −50..+50 之间连续取值。
 *
 * ⚠️ 这些点数是加到**某一场测验的百分比**上的(自己选哪一场,12/04 前定),
 *   **上限 100%**,可以是负的。加完之后再重新算丢哪一场。
 */
export const GUIDELINES: readonly { readonly key: GuidelineKey; readonly text: string }[] = [
  { key: 'ownWork', text: 'Made and performed entirely by the group, with no technology of any kind' },
  { key: 'noWords', text: 'No words written or spoken, no math symbols, no graphs' },
  { key: 'beautiful', text: 'Beautiful and visibly effortful' },
  { key: 'paper', text: 'Comes with a hand-written paper explaining the math' },
  { key: 'safe', text: 'No money spent, nothing dangerous, nothing against school policy' },
];

/**
 * 三个分项的满分。
 * ⚠️ 老师**会给部分分**,所以这三项不是只能取 0/4/8/12 这种离散值 ——
 *   小数也可以,SCORE 因此可以是 15 这样的奇数。
 *   (早先按"全是偶数 ⇒ points 恒为 10 的倍数"写过,那是错的,已经改掉。)
 */
export const COMPONENTS = [
  { key: 'math', name: 'Mathematics', max: 12 },
  { key: 'artistic', name: 'Artistic', max: 6 },
  { key: 'explanation', name: 'Explanation', max: 2 },
] as const;

export type ComponentKey = (typeof COMPONENTS)[number]['key'];

/** 分项得分夹在 0..满分。 */
export function clampComponent(x: number, max: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(max, x));
}

export interface Project {
  /** 做不做。不做的时候,下面的字段一概不影响任何结果。 */
  readonly doing: boolean;
  readonly math: number;
  readonly artistic: number;
  readonly explanation: number;
  /**
   * 点数加到哪一场测验上。
   * `'auto'` = 让工具挑最划算的那一场 —— 最优解同时取决于项目点数和
   * 那场还没考的测验分数,手推容易推错,交给代码。
   */
  readonly target: 'auto' | number;
}

export function projectScore(p: Project): number {
  return p.math + p.artistic + p.explanation;
}

/**
 * 项目最终折算成多少个百分点。
 *
 * ⚠️⚠️ 式子里那个"五条准则的乘积"在这里**固定为 1** —— Jesse 明确说过
 *   违规拿 −50 对他来说不会发生,所以不按那种情形做规划。
 *   五条准则仍然列在页面上当**清单**,但不再是可以拨动的开关:
 *   留一个界面上点不到的分支,就是这个项目一直在清的死代码。
 *   ⚠️ 这是一个**被写出来的假设**,不是一个被忽略的风险 ——
 *     真要出现违规,这个模型会高估成绩,页面上也明说了这一点。
 *
 * ⚠️ 不做项目时是 0(而不是 −50)—— "没交"和"交了但违规"是两回事。
 */
export function projectPoints(p: Project): number {
  if (!p.doing) return 0;
  return 5 * projectScore(p) - 50;
}

/**
 * ⭐⭐⭐ 项目做到多少分就**不再有用**了。
 *
 * ⚠️ 这个数**算出来,不写死**。凭直觉会说"最低的是 83,差 17 分,
 *   所以 SCORE = (17+50)/5 = 13.4" —— 但实测是 **13**:
 *   +15 刚好把 **85** 顶到 100,而 83 反正要被丢掉,
 *   所以真正要封顶的是 85 不是 83。只有让代码搜一遍才看得出来。
 *
 * 做法:二分找出"结果开始和满分项目一样"的那个 SCORE。
 * 返回 `null` 表示没在做项目 / 算不出来。
 */
export function saturatingScore(
  items: readonly Item[],
  project: Project,
  setup: Setup,
): number | null {
  const at = (score: number): number | null => {
    const p: Project = { ...project, doing: true, math: score, artistic: 0, explanation: 0 };
    const applied = applyProject(items, p, setup.dropLowest, setup.method);
    return finalNeeded(setup, meanOf(items, applied.percents, setup.dropLowest, setup.method).mean);
  };
  const top = at(20);
  if (top === null) return null;
  // ⚠️ 已经到顶了(比如所有分数都已经是 100),再找就没意义
  if (at(0) !== null && Math.abs(at(0)! - top) < 1e-12) return 0;
  let lo = 0;
  let hi = 20;
  for (let i = 0; i < 80; i += 1) {
    const mid = (lo + hi) / 2;
    const v = at(mid);
    if (v === null) return null;
    if (v > top + 1e-12) lo = mid;
    else hi = mid;
  }
  return hi;
}

/** 达到某个点数所需的最低 SCORE。⭐ +20 对应 SCORE 14,这是实际要瞄的线。 */
export function scoreNeededFor(points: number): number {
  return (points + 50) / 5;
}

/* ── 类目均分与丢最低 ──────────────────────────────────────── */

export interface Counted {
  /** 类目平均(百分比)。一条都没计入时是 `null` —— 不是 0,也不是 NaN。 */
  readonly mean: number | null;
  /** 被丢掉那一场的下标;没丢就是 −1。 */
  readonly droppedIndex: number;
  readonly counted: number;
  readonly live: number;
}

/**
 * ⭐⭐⭐ 丢最低按**百分比**挑,不是按卷面原始分。
 *   按原始分挑的话,46/50 的项目(92%)会显得比 83/100 的测验**更低**而被丢掉 ——
 *   学生看到的是"系统帮我丢了考得最好的那场"。这是正确性问题,不是细节。
 * ⚠️ 丢的判断用的是**加完项目之后**的百分比 —— 这正是加分会把丢弃对象推到
 *   另一场上的原因,而那件事会改变最终答案。
 *
 * ⚠️ 只丢**一条**,而且只在还剩别的条时才丢:就剩一条还丢,均分就没了,
 *   页面会从"算得出"变成"算不出" —— 那不是老师的规则,是实现的副作用。
 * ⚠️ 并列最低时取**最靠前**的那条,必须定死,否则同样的输入会显示不同的标记。
 */
export function meanOf(
  items: readonly Item[],
  percents: readonly number[],
  dropLowest: boolean,
  method: Method,
): Counted {
  const live: number[] = [];
  items.forEach((it, i) => {
    if (!it.muted) live.push(i);
  });

  let droppedIndex = -1;
  if (dropLowest && live.length > 1) {
    let lowest = Infinity;
    for (const i of live) {
      if (percents[i]! < lowest) lowest = percents[i]!;
    }
    for (const i of live) {
      if (percents[i] === lowest) {
        droppedIndex = i;
        break;
      }
    }
  }

  let pctSum = 0;
  let weighted = 0;
  let possible = 0;
  let counted = 0;
  for (const i of live) {
    if (i !== droppedIndex) {
      pctSum += percents[i]!;
      weighted += percents[i]! * items[i]!.possible;
      possible += items[i]!.possible;
      counted += 1;
    }
  }

  let mean: number | null = null;
  if (counted > 0) {
    // ⚠️ 没有 default 分支 —— 以后多一种算法而这里漏了就编译不过。
    switch (method) {
      case 'mean-of-grades':
        mean = pctSum / counted;
        break;
      case 'total-points':
        mean = weighted / possible;
        break;
    }
  }
  return { mean, droppedIndex, counted, live: live.length };
}

/* ── 把项目点数贴到某一场上 ─────────────────────────────────── */

export interface Applied {
  /** 每一场**加完项目之后**的百分比,和 `items` 一一对应。 */
  readonly percents: readonly number[];
  /** 点数实际加在了哪一场上;没有加则为 −1。 */
  readonly targetIndex: number;
  readonly points: number;
  /**
   * 和 `targetIndex` 结果**完全相同**的其他选择。
   * ⭐ 这个字段存在是因为它回答了一个真问题:"加在 83 还是 85 上?"
   *   点数够大(封顶)时两者一模一样,点数小的时候不是。
   */
  readonly ties: readonly number[];
}

/** 把 `points` 个百分点加到第 `i` 场上,夹在 0..100。 */
function boosted(items: readonly Item[], i: number, points: number): number[] {
  return items.map((it, k) =>
    (k === i ? Math.max(0, Math.min(100, percentOf(it) + points)) : percentOf(it)));
}

export function applyProject(
  items: readonly Item[],
  project: Project,
  dropLowest: boolean,
  method: Method,
): Applied {
  const points = projectPoints(project);
  const plain = items.map(percentOf);
  if (points === 0) return { percents: plain, targetIndex: -1, points: 0, ties: [] };

  const live: number[] = [];
  items.forEach((it, i) => {
    if (!it.muted) live.push(i);
  });
  if (live.length === 0) return { percents: plain, targetIndex: -1, points, ties: [] };

  if (project.target !== 'auto' && live.includes(project.target)) {
    const i = project.target;
    return { percents: boosted(items, i, points), targetIndex: i, points, ties: [] };
  }

  /**
   * ⭐⭐⭐ 自动挑:把每一场都试一遍,取**类目均分最高**的那个。
   *   为什么不能手推:加在最低的那场上会把"被丢掉的"换成另一场,
   *   而封顶又会吃掉一部分点数 —— 最优解同时取决于点数大小和每场的分数。
   *   (实测:+20 时加在 83 或 85 上完全一样,+10 时加在 85 上更好,
   *    而当还没考的那场低于 85、自己成为被丢的那条时,又变成加在 83 上更好。)
   *   试一遍只有几条,代码试比人推可靠。
   */
  let bestIndex = live[0]!;
  let bestMean = -Infinity;
  for (const i of live) {
    const m = meanOf(items, boosted(items, i, points), dropLowest, method).mean;
    if (m !== null && m > bestMean) {
      bestMean = m;
      bestIndex = i;
    }
  }
  const ties = live.filter((i) => {
    if (i === bestIndex) return false;
    const m = meanOf(items, boosted(items, i, points), dropLowest, method).mean;
    return m !== null && Math.abs(m - bestMean) < 1e-9;
  });
  return { percents: boosted(items, bestIndex, points), targetIndex: bestIndex, points, ties };
}

/* ── 课程设置 ──────────────────────────────────────────────── */

export interface Setup {
  readonly wAssign: number;
  readonly wAssess: number;
  readonly wFinal: number;
  /** 作业类目的平均分。⚠️ 目前每一项都是 100/100,所以这里是 100。 */
  readonly assignScore: number;
  readonly targetA: number;
  readonly targetB: number;
  readonly targetC: number;
  /** ⭐ 已和老师确认:学期末丢掉最低的那一场测验。 */
  readonly dropLowest: boolean;
  readonly goal: Goal;
  /** ⚠️ 大纲原文是 "mean of grades";还没向老师确认 gradebook 是不是真这么算。 */
  readonly method: Method;
  /** 对**还没考的**测验的预估分数(百分比)。 */
  readonly projected: number;
}

export const SEED_SETUP: Setup = {
  wAssign: 10,
  wAssess: 65,
  wFinal: 25,
  assignScore: 100,
  // ⚠️ 89.5 才是真正的目标:成绩四舍五入到整数,89.5 进位成 A。
  targetA: 89.5,
  targetB: 79.5,
  targetC: 69.5,
  dropLowest: true,
  goal: 'A',
  method: 'mean-of-grades',
  // 最近一次是 90,四次的走势也在往上 —— 作为预估的起点
  projected: 90,
};

/**
 * 2026–27 S1 **已经进成绩册**的四场测验(和 PowerSchool 截图逐条核对过)。
 *
 * ⚠️ 这里**只放已经有分数的**。还没考的测验交给下面的 `scenarioWith` ——
 *   把"已发生"和"还没发生"混在同一排推子里,很容易把一个假设当成事实。
 */
export const SEED_ITEMS: readonly Item[] = [
  { name: 'Precalc', earned: 83, possible: 100, muted: false },
  { name: 'Limits', earned: 91, possible: 100, muted: false },
  { name: 'Deriv apps', earned: 85, possible: 100, muted: false },
  { name: 'Related rates', earned: 90, possible: 100, muted: false },
];

export const SEED_PROJECT: Project = {
  // ⚠️ 默认不做:页面一打开显示的应该是**当前真实处境**,而不是一个计划。
  doing: false,
  // Jesse 说至少能拿 15 分(部分分是允许的),8 + 5 + 2 = 15 → +25
  math: 8,
  artistic: 5,
  explanation: 2,
  target: 'auto',
};

export function cutoffOf(s: Setup, goal: Goal): number {
  // ⚠️ 故意不写 default —— 没有 default 的 switch 在 strict 下会做穷尽性检查。
  switch (goal) {
    case 'A':
      return s.targetA;
    case 'B':
      return s.targetB;
    case 'C':
      return s.targetC;
  }
}

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

/* ── 正向与反解 ────────────────────────────────────────────── */

/** 正向:给定测验均分和期末分,学期总评是多少。 */
export function gradeWith(s: Setup, assessMean: number, final: number): number {
  const w = weightsOf(s);
  return w.assign * s.assignScore + w.assess * assessMean + w.final * final;
}

/**
 * ⭐⭐ PowerSchool 在**期末还不存在**的时候显示的那个数。
 *   它会把现有的类目重新归一化:
 *       shown = (w_assign × 作业 + w_assess × 测验) / (w_assign + w_assess)
 *   ⚠️ 不要写死 0.75 —— 用权重算出来,改权重时才不会悄悄错。
 *   (这个公式已经和真实的 PowerSchool 显示对照过三次。)
 */
export function inProgressDisplay(s: Setup, assessMean: number | null): number | null {
  if (assessMean === null) return null;
  const denom = s.wAssign + s.wAssess;
  if (denom <= 0) return null;
  return (s.wAssign * s.assignScore + s.wAssess * assessMean) / denom;
}

/** 成绩按四舍五入到整数来判档,所以 89.5 就是 A。 */
export function roundedPercent(x: number): number {
  return Math.round(x);
}

export function letterFor(overall: number): string {
  const r = roundedPercent(overall);
  if (r >= 90) return 'A';
  if (r >= 80) return 'B';
  if (r >= 70) return 'C';
  if (r >= 60) return 'D';
  return 'F';
}

/**
 * 反解:要落在目标上,期末得考多少。
 * ⚠️ 期末权重为 0 时解不出来 —— 返回 `null`,由调用方去说那句话。
 */
export function finalNeeded(s: Setup, assessMean: number | null): number | null {
  const w = weightsOf(s);
  if (assessMean === null || w.final <= 0) return null;
  return (targetOf(s) - w.assign * s.assignScore - w.assess * assessMean) / w.final;
}

/**
 * 第三条路径:对**正向**函数二分,根本不碰上面那条反解公式。
 * ⚠️ 搜索区间要**超出** 0..100:够不到的目标对应的根就在 100 以上。
 */
export function finalNeededByBisection(s: Setup, assessMean: number | null): number | null {
  const w = weightsOf(s);
  if (assessMean === null || w.final <= 0) return null;
  const goal = targetOf(s);
  let lo = -1000;
  let hi = 1000;
  for (let i = 0; i < 200; i += 1) {
    const mid = (lo + hi) / 2;
    if (gradeWith(s, assessMean, mid) < goal) lo = mid;
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
 *   只影响那个词和颜色,一个数字都不影响。
 */
export const TIGHT_ABOVE = 92;
export const COMFORTABLE_BELOW = 75;

export function verdictOf(s: Setup, assessMean: number | null): Verdict {
  if (assessMean === null) return 'no-data';
  if (weightsOf(s).final <= 0) return 'final-does-not-count';
  const need = finalNeeded(s, assessMean);
  if (need === null) return 'no-data';
  if (need <= 0) return 'locked';
  if (need > 100) return 'unreachable';
  if (need > TIGHT_ABOVE) return 'tight';
  if (need < COMFORTABLE_BELOW) return 'comfortable';
  return 'doable';
}

export const VERDICT_WORD: Readonly<Record<Verdict, string>> = {
  'no-data': 'Nothing counted',
  'final-does-not-count': 'Final does not count',
  locked: 'Locked in',
  comfortable: 'Comfortable',
  doable: 'Doable',
  tight: 'Tight',
  unreachable: 'Out of reach',
};

/**
 * ⭐⭐⭐ 够不到的时候,**学期总评**还差多少分。
 * ⚠️ 按定义写:目标 − (期末考满分时的总评)。
 *   曾经这里印的是 `need − 100`,那是**期末卷面**的差距,被当成了总评的差距,
 *   期末占 25% 时夸大四倍 —— 只差 9 分的人会被告知差 36 分。
 */
export function missBy(s: Setup, assessMean: number | null): number | null {
  if (assessMean === null || weightsOf(s).final <= 0) return null;
  const gap = targetOf(s) - gradeWith(s, assessMean, 100);
  return gap > 0 ? gap : null;
}

/** 已经稳了的时候,总评还富余多少分(期末交白卷也够)。 */
export function spareBy(s: Setup, assessMean: number | null): number | null {
  if (assessMean === null || weightsOf(s).final <= 0) return null;
  const spare = gradeWith(s, assessMean, 0) - targetOf(s);
  return spare > 0 ? spare : null;
}

/** 期末不计分时,成绩已经定死了是多少。 */
export function lockedGrade(s: Setup, assessMean: number | null): number | null {
  if (assessMean === null || weightsOf(s).final > 0) return null;
  return gradeWith(s, assessMean, 0);
}

/* ── 还没考的测验 ──────────────────────────────────────────── */

/** 要算几种"还剩几场"的情形。⭐ 两种:只剩反导数那场,或者再多一场。 */
export const SCENARIOS = [1, 2] as const;

export interface Scenario {
  /** 还剩几场没考。 */
  readonly extra: number;
  readonly mean: number | null;
  readonly need: number | null;
  /** 这种情形下被丢掉的那个百分比;没丢则为 null。 */
  readonly droppedPercent: number | null;
}

/**
 * ⭐⭐⭐ 假设后面还有 `extra` 场测验、每场都考 `projected` 分,算期末要多少。
 *
 * ⚠️ 这不是锦上添花,它会**改变结论**:丢最低只能保一场。
 *   只剩一场时,那一场考多差都会被丢掉,期末需求有个地板;
 *   一旦变成两场,地板就没了 —— 两场都考 70 的话期末要 91.3,
 *   而同样考 70 但只有一场时只要 80.1。
 */
export function scenarioWith(
  items: readonly Item[],
  project: Project,
  setup: Setup,
  projected: number,
  extra: number,
): Scenario {
  const pct = Math.max(0, Math.min(100, projected));
  const upcoming: Item[] = Array.from({ length: Math.max(0, extra) }, (_, k) => ({
    name: `Upcoming ${k + 1}`,
    earned: pct,
    possible: 100,
    muted: false,
  }));
  const all = [...items, ...upcoming];
  const applied = applyProject(all, project, setup.dropLowest, setup.method);
  const counted = meanOf(all, applied.percents, setup.dropLowest, setup.method);
  return {
    extra,
    mean: counted.mean,
    need: finalNeeded(setup, counted.mean),
    droppedPercent: counted.droppedIndex >= 0 ? applied.percents[counted.droppedIndex]! : null,
  };
}

/* ── 旧存档迁移 ────────────────────────────────────────────── */

/**
 * 把一条来历不明的存档记录变成一条合法的 `Item`。
 * ⚠️ 改模型会**悄悄弄坏已经存下来的数据**:更早的版本存的是
 *   `{ name, score, muted }`(百分制),`earned` 读出来会是 undefined → NaN
 *   → 整列空白,而且不报任何错。这正是最难发现的那一类故障。
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
  const score = Number(o['score']);
  const pct = Number.isFinite(score) ? score : 0;
  return { name, possible: 100, earned: clampEarned(pct, 100), muted };
}

/* ── 页面上的字 ────────────────────────────────────────────── */

export const HEADLINE = 'Solve the weighted average backwards for the score you still need';

export const EQUATION_TEX = '0.10\\,A+0.65\\,\\bar{x}+0.25\\,F=G';

export const SOLVED_TEX = 'F=\\dfrac{G-0.10\\,A-0.65\\,\\bar{x}}{0.25}';

/** PowerSchool 在期末之前显示的那个数。 */
export const IN_PROGRESS_TEX = '\\text{shown}=\\dfrac{0.10\\,A+0.65\\,\\bar{x}}{0.75}';

/** 项目的计分式。⭐ 那个乘积是整条式子的要害。 */
export const PROJECT_TEX = '5\\left(\\prod_{i=1}^{5}g_i\\right)\\cdot S-50';
