/**
 * MATH — 中值定理:**前提才是这一课的内容。**
 *
 * ⭐⭐ 和介值定理那一课(`#/bisect-line`)是同一个毛病:
 *   学生把结论背得滚瓜烂熟 ——「总存在一点 c,使 `f'(c)` 等于两端点连线的斜率」——
 *   却**从不检查前提**。而前提一旦不成立,结论说塌就塌。
 *
 *   中值定理要两样东西:
 *     ① `f` 在**闭区间** `[a, b]` 上连续;
 *     ② `f` 在**开区间** `(a, b)` 上可导。
 *
 * ⚠️⚠️ 学生几乎从不问的一个问题:**为什么一个闭一个开?**
 *   因为端点的**函数值**要用到(连线得有两个端点),所以那里必须连续;
 *   但端点的**导数**根本用不上 —— 结论里的 c 落在开区间内部。
 *   要求端点可导是多余的,而多余的前提会让定理白白失去一批适用的函数。
 *
 * ⭐⭐⭐ 三个反例,每个都精确地打掉一条前提:
 *   · `|x|` 在 `[−1, 1]`:连线斜率是 0,而 `f'` 只取 ±1,**永远不是 0**。
 *     毛病出在 `x = 0` 不可导 —— 就差那**一个点**,结论就没了。
 *   · `x^{2/3}` 在 `[−1, 1]`:同样的位置,更尖的尖点,`f'` 在那里冲向无穷。
 *   · 端点上跳一下:`f(x) = x` 而 `f(1) = 0`。连线斜率是 0,可 `f'` 恒等于 1。
 *     毛病出在**闭区间**那一头的连续性 —— 内部再光滑也救不回来。
 *
 * ⭐ Rolle 不是另一条定理,它就是"两端点一样高"的中值定理:
 *   那时连线水平,结论变成 `f'(c) = 0`。
 *
 * ⭐ 两条互不相干的路径找同一批 c:
 *   ① `findC`        —— 用解析导数解 `f'(x) = m`;
 *   ② `findCNumeric` —— 只用 `f` 的值做中心差商,**完全不碰解析导数**。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import { showNumber } from './format';

/* ══ 情形 ══════════════════════════════════════════════════════════ */

export interface Case {
  readonly id: string;
  readonly label: string;
  readonly f: (x: number) => number;
  /** 解析导数。不可导处返回 `null` —— 绝不返回 Infinity。 */
  readonly df: (x: number) => number | null;
  readonly a: number;
  readonly b: number;
  /** 闭区间上连续吗 */
  readonly continuous: boolean;
  /** 开区间上处处可导吗 */
  readonly differentiable: boolean;
  /** 前提在哪里破的(空表示没破) */
  readonly badPoints: readonly number[];
  readonly fTex: string;
  readonly note: string;
  /** `f` 图的纵轴范围 */
  readonly yView: readonly [number, number];
  /**
   * ⚠️ `f'` 图的纵轴范围**写死**,不由采样算。
   * 尖点那一课 `f'` 会冲向无穷,让数据决定范围等于让一个发散量定标尺 ——
   * 整条曲线会被压成一条贴着 0 的直线,而"它永远够不到连线斜率"这件事
   * 恰恰就看不见了。写死之后曲线跑出画框,那是**该看见的**。
   */
  readonly dfView: readonly [number, number];
}

export const CASES: readonly Case[] = [
  {
    /** 两条前提都成立,而且有**两个** c —— 定理说的是"至少一个"。 */
    id: 'cubic',
    label: 'x³ − 3x on [−2, 2] — both hypotheses hold',
    f: (x) => x * x * x - 3 * x,
    df: (x) => 3 * x * x - 3,
    a: -2, b: 2,
    continuous: true, differentiable: true,
    badPoints: [],
    fTex: 'f(x) = x^3 - 3x',
    note: 'Continuous everywhere, differentiable everywhere, so the theorem applies and delivers. Notice it delivers twice: the theorem promises at least one c, never exactly one.',
    yView: [-3.2, 3.2],
    dfView: [-4, 10],
  },
  {
    /** ⭐ Rolle:两端点等高,连线水平,结论变成 f'(c) = 0。 */
    id: 'rolle',
    label: 'x² − 1 on [−1, 1] — the endpoints match, so this is Rolle',
    f: (x) => x * x - 1,
    df: (x) => 2 * x,
    a: -1, b: 1,
    continuous: true, differentiable: true,
    badPoints: [],
    fTex: 'f(x) = x^2 - 1',
    note: 'The two endpoints sit at the same height, so the chord is horizontal and the conclusion reads f′(c) = 0. That is all Rolle is — the mean value theorem with a level chord. It is not a separate result to memorise.',
    yView: [-1.4, 0.4],
    dfView: [-2.6, 2.6],
  },
  {
    /**
     * ⭐⭐ 反例一:只有**一个点**不可导,结论就没了。
     * 连线斜率是 0,而 `f'` 只取 ±1。
     */
    id: 'abs',
    label: '|x| on [−1, 1] — one corner is enough to break it',
    f: (x) => Math.abs(x),
    df: (x) => (x === 0 ? null : Math.sign(x)),
    a: -1, b: 1,
    continuous: true, differentiable: false,
    badPoints: [0],
    fTex: 'f(x) = |x|',
    note: 'The chord is horizontal, so the theorem would need a point where the slope is zero. But the slope is −1 on the left and +1 on the right and never anything else. A single corner, at a single point, and the conclusion is gone — the function is otherwise as well behaved as it gets.',
    yView: [-0.25, 1.25],
    dfView: [-1.6, 1.6],
  },
  {
    /** ⭐ 反例二:同一个位置,更尖的尖点,导数在那里冲向无穷。 */
    id: 'cusp',
    label: 'x^(2/3) on [−1, 1] — a sharper cusp, same failure',
    f: (x) => Math.cbrt(x) ** 2,
    df: (x) => (x === 0 ? null : 2 / (3 * Math.cbrt(x))),
    a: -1, b: 1,
    continuous: true, differentiable: false,
    badPoints: [0],
    fTex: 'f(x) = x^{2/3}',
    note: 'Same chord, same missing point, but here the derivative does not merely jump — it runs off to infinity on both sides. The function is continuous at 0 and still not differentiable there, which is worth seeing: continuity is the weaker requirement.',
    yView: [-0.25, 1.25],
    dfView: [-3, 3],
  },
  {
    /**
     * ⭐⭐ 反例三:内部光滑得无可挑剔,**端点**上跳了一下。
     * 这一个专门解释"为什么闭区间那一头要连续"。
     */
    id: 'jump',
    label: 'x on [0,1), then f(1) = 0 — smooth inside, broken at the end',
    f: (x) => (x >= 1 ? 0 : x),
    df: (x) => (x >= 1 ? null : 1),
    a: 0, b: 1,
    continuous: false, differentiable: true,
    badPoints: [1],
    fTex: 'f(x) = x \\text{ on } [0,1),\\; f(1) = 0',
    note: 'Inside the interval this could not be smoother — the slope is 1 everywhere. But the value at the right endpoint has been moved, so the chord is horizontal while every slope is 1. Continuity was only needed at the two ends, and losing it at one end is enough.',
    yView: [-0.25, 1.25],
    dfView: [-0.6, 1.6],
  },
] as const;

export function caseOf(id: string): Case {
  return CASES.find((c) => c.id === id) ?? CASES[0]!;
}

/* ══ 连线 ══════════════════════════════════════════════════════════ */

/** 两端点连线的斜率 —— 结论要匹配的就是它。 */
export function chordSlope(c: Case): number {
  return (c.f(c.b) - c.f(c.a)) / (c.b - c.a);
}

/** ⭐ 两端点等高时,这就是 Rolle 的情形。 */
export function isRolle(c: Case, tol = 1e-12): boolean {
  return Math.abs(c.f(c.b) - c.f(c.a)) <= tol;
}

/* ══ 前提 ══════════════════════════════════════════════════════════ */

export type Verdict = 'applies' | 'no-continuity' | 'no-derivative';

/**
 * ⭐⭐ 定理用不用得上,以及**哪一条**前提破了。
 *
 * ⚠️ 连续性**先**判。连续是更弱的要求,不连续的地方根本谈不上可导,
 *   所以两条都破的时候,该报的是"不连续"这个根子上的毛病。
 *
 * ⚠️⚠️ 这个顺序**在现有五个情形上看不出来** —— 没有哪一个是两条同时破的,
 *   于是把两个 if 对调,五个情形的答案一个都不变(变异体活了下来)。
 *   所以把判断从 `Case` 里拆出来,直接按四种真值组合测,
 *   顺序才真的被钉住,而不是"碰巧现在没错"。
 */
export function verdictFrom(continuous: boolean, differentiable: boolean): Verdict {
  if (!continuous) return 'no-continuity';
  if (!differentiable) return 'no-derivative';
  return 'applies';
}

export function verdictOf(c: Case): Verdict {
  return verdictFrom(c.continuous, c.differentiable);
}

/* ══ 扫零点 —— 三条路径共用的那一段 ═══════════════════════════════ */

/**
 * ⭐ 在开区间 `(a, b)` 上找 `g` 的零点。
 *
 * 抽出来单独放,是因为下面三条路径只在**怎么算导数**这一点上不同,
 * 扫描本身一模一样 —— 让差别只剩下那一处,论点才干净。
 *
 * ⚠️ `g` 返回 `null` 表示那一点**没有定义**。跨过这样的点的区段整段作废:
 *   绝不能在两侧硬接一个"符号变了"的结论 —— 没有定义的地方谈不上变号,
 *   而这一课的三个反例恰好全都靠这一条成立。
 *
 * ⭐ 上面那条 `g0 * g1 > 0` 的 `>` 不能写成 `>=`:零点正好落在网格点上时,
 *   乘积**恰好是 0**,`>=` 会把它左右两段一起跳过,零点就丢了。
 *   `gridPoint` 保证网格真的能落在整数点上(`−1 + 2·2000/4000` 恰好是 0),
 *   这条守卫才测得到 —— 否则它是一段永远走不到的分支。
 */
/**
 * 第 `i` 个网格点。
 *
 * ⚠️ 写成 `a + (b − a)·i / n` 而不是先算好 `step` 再反复相加,是个偏好:
 *   前者只做一次除法,误差不随 `i` 累积。
 *   但**这不是一条正确性要求** —— 试过了,两种写法在这个模块用到的所有
 *   网格上结果一致(包括关键的 `gridPoint(−1, 1, 2000, 4000) === 0`),
 *   所以"改成 step 累加"是个**等价变异体**,杀不掉也不该硬凑测试去杀。
 *   真正要钉住的是下面那条断言:网格确实命中 0。
 */
export function gridPoint(a: number, b: number, i: number, n: number): number {
  return a + ((b - a) * i) / n;
}

export function scanRoots(
  g: (x: number) => number | null,
  a: number,
  b: number,
  n = 4000,
): readonly number[] {
  const at = (i: number): number => gridPoint(a, b, i, n);
  const out: number[] = [];
  // i 从 1 到 n−2:两个端点都不取,因为定理要的 c 在开区间内。
  for (let i = 1; i + 1 < n; i += 1) {
    const x0 = at(i);
    const x1 = at(i + 1);
    const g0 = g(x0);
    const g1 = g(x1);
    if (g0 === null || g1 === null) continue;
    if (g0 * g1 > 0) continue;
    let lo = x0;
    let hi = x1;
    let glo = g0;
    for (let k = 0; k < 60; k += 1) {
      const mid = (lo + hi) / 2;
      const gm = g(mid);
      if (gm === null) break;
      if (glo * gm <= 0) { hi = mid; } else { lo = mid; glo = gm; }
    }
    out.push((lo + hi) / 2);
  }
  return dedupe(out, (b - a) / n);
}

/**
 * 同一个零点会被相邻两段各找到一次(零点正好落在网格点上时必然发生)。
 * ⚠️ 合并半径**由网格步长决定**,不是拍脑袋的 1e-4:
 *   两个不同的零点至少隔着一格,所以半径取一格是安全的上界。
 */
function dedupe(xs: readonly number[], step: number): readonly number[] {
  const uniq: number[] = [];
  for (const x of xs) {
    if (!uniq.some((y) => Math.abs(y - x) < step)) uniq.push(x);
  }
  return uniq;
}

/* ══ 路径 ① —— 解析导数解 f'(x) = m ═══════════════════════════════ */

/**
 * 开区间里所有满足 `f'(x) = m` 的点。
 *
 * ⚠️ 不可导的点返回 `null` 而不是某个数:那里没有导数可谈,不能当候选。
 *   把它们算进去就等于假装前提成立,而前提不成立正是这一课要讲的事。
 */
export function findC(c: Case, n = 4000): readonly number[] {
  const m = chordSlope(c);
  return scanRoots((x) => {
    const d = c.df(x);
    return d === null ? null : d - m;
  }, c.a, c.b, n);
}

/* ══ 路径 ② —— 只用 f 的值 ═══════════════════════════════════════ */

/**
 * ⭐⭐ 同样找 `f'(x) = m`,但导数用**中心差商**现算,完全不碰 `df`。
 *
 * ⚠️ 在不可导的点附近中心差商会给出一个"平均"的假斜率
 *   (`|x|` 在 0 处算出来正好是 0!),所以这里**也要跳过**那些点的邻域,
 *   否则它会报出一个根本不存在的 c —— 那正是学生被骗的方式,
 *   下面的 `findCNaive` 专门演示这件事。
 */
export function findCNumeric(c: Case, h = 1e-6, n = 4000): readonly number[] {
  const m = chordSlope(c);
  return scanRoots((x) => {
    if (c.badPoints.some((p) => Math.abs(x - p) < 10 * h)) return null;
    const lo = c.f(x - h);
    const hi = c.f(x + h);
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
    return (hi - lo) / (2 * h) - m;
  }, c.a, c.b, n);
}

/**
 * ⚠️⚠️ 和 `findCNumeric` **只差跳过那一行** —— 专门用来展示差商是怎么骗人的。
 *
 * `|x|` 在 `x = 0` 处的中心差商是 `(h − h)/(2h) = 0`,正好等于连线斜率,
 * 于是这条路会**报出一个 c = 0**。可 `|x|` 在 0 处根本没有导数 ——
 * 这个"解"是差商自己编出来的。
 * ⭐ 数值方法在不可导的地方不会大声报错,它会递给你一个看起来很合理的答案。
 */
export function findCNaive(c: Case, h = 1e-6, n = 4000): readonly number[] {
  const m = chordSlope(c);
  return scanRoots((x) => {
    const lo = c.f(x - h);
    const hi = c.f(x + h);
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
    return (hi - lo) / (2 * h) - m;
  }, c.a, c.b, n);
}

/* ══ 画图 ═════════════════════════════════════════════════════════ */

/** 两端点连线在 `x` 处的高度。 */
export function chordAt(c: Case, x: number): number {
  return c.f(c.a) + chordSlope(c) * (x - c.a);
}

/**
 * 过 `at` 的切线在 `x` 处的高度;`at` 处不可导时返回 `null`。
 * ⭐ 当 `at` 是定理给的那个 c 时,这条切线和连线**平行** —— 那就是结论本身。
 */
export function tangentAt(c: Case, at: number, x: number): number | null {
  const d = c.df(at);
  if (d === null) return null;
  return c.f(at) + d * (x - at);
}

/**
 * 不连续点处画"空心圈"的高度 —— 也就是左极限。
 * ⚠️ 连续的情形返回 `null`:那里没有圈可画,不许凭空画一个。
 */
export function leftLimitAt(c: Case, p: number, h = 1e-9): number | null {
  if (c.continuous) return null;
  const v = c.f(p - h);
  return Number.isFinite(v) ? v : null;
}


/**
 * `f` 的取样。`null` 表示**抬笔**。
 *
 * ⚠️⚠️ 不连续的地方必须断开。把 `(1, 1⁻)` 和 `(1, 0)` 用一条线连起来,
 *   画面上就成了一个"陡降"——而陡降是有斜率的,学生会去那里找 c。
 *   真实情况是那里**什么都没有**:函数在那一点跳过去了。
 *   一条假的连线会把这一课的论点直接讲反。
 */
export function sampleF(c: Case, n = 600): readonly (readonly [number, number] | null)[] {
  const out: (readonly [number, number] | null)[] = [];
  const step = (c.b - c.a) / n;
  let prev: number | null = null;
  for (let i = 0; i <= n; i += 1) {
    const x = c.a + step * i;
    const y = c.f(x);
    // 上一格到这一格之间越过了一个不连续点 → 先抬笔
    if (!c.continuous && prev !== null
      && c.badPoints.some((p) => p > prev! - 1e-12 && p <= x + 1e-12)) {
      out.push(null);
    }
    prev = x;
    if (!Number.isFinite(y)) { out.push(null); continue; }
    out.push([x, y]);
  }
  return out;
}

/**
 * `f'` 在**开**区间上的取样;不可导处为 `null`。
 * ⚠️ `i` 从 1 到 `n−1`:端点不取,因为定理也不在端点上要导数。
 */
export function sampleDf(c: Case, n = 600): readonly (readonly [number, number] | null)[] {
  const out: (readonly [number, number] | null)[] = [];
  for (let i = 1; i < n; i += 1) {
    const x = c.a + ((c.b - c.a) * i) / n;
    const d = c.df(x);
    if (d === null || !Number.isFinite(d)) { out.push(null); continue; }
    out.push([x, d]);
  }
  return out;
}

/** `f'` 图的纵轴范围 —— 取自情形自己,不由数据定(理由见 `dfView`)。 */
export function dfRange(c: Case): readonly [number, number] {
  return c.dfView;
}

export function clampX(c: Case, x: number): number {
  if (!Number.isFinite(x)) return (c.a + c.b) / 2;
  return Math.min(Math.max(x, c.a), c.b);
}

/* ══ 显示 ═════════════════════════════════════════════════════════ */

export interface Need {
  readonly n: string;
  readonly what: string;
  readonly detail: string;
}

/** ⭐ 论点前置:两条前提,以及那个几乎没人问的"为什么一开一闭"。 */
export const MVT_NEEDS: readonly Need[] = [
  {
    n: '1',
    what: 'continuous on the closed [a, b]',
    detail: 'Closed, because the chord needs both endpoint values. Lose continuity at either end and the chord is describing a function that is not there.',
  },
  {
    n: '2',
    what: 'differentiable on the open (a, b)',
    detail: 'Open, because the c the theorem produces lives strictly inside. Demanding a derivative at the endpoints would rule out functions the theorem handles perfectly well.',
  },
] as const;

export const HEADLINE = 'One Missing Point Is Enough';
/**
 * ⚠️ 这句话**不许点名某一个函数**。
 * 第一版写的是「|x| 在 [−1,1] 上……」,而页面默认打开的是三次函数 ——
 * 字说 A,图显示 B,正是这个项目反复栽的那个坑。
 * 具体的函数放到它自己那一屏的 `note` 里说,那里图能作证。
 */
export const MAIN_IDEA =
  'The conclusion is easy to remember and easy to apply where it does not hold. Every case below breaks at most one of the two hypotheses, and breaking one is always enough.';

export const WHY_OPEN_CLOSED =
  'The two intervals are different on purpose. The endpoint values are used, so continuity is required there. The endpoint derivatives are not used, so differentiability is not required there — and requiring it would throw away functions the theorem covers.';

export const ROLLE_NOTE =
  'With the endpoints at equal heights the chord is level, so the conclusion becomes f′(c) = 0. That case has its own name, Rolle, but it is the same statement, not a second theorem.';

/**
 * ⚠️⚠️ 连线水平、但前提**没成立**的那几个情形要说的是另一句话。
 *
 * 第一版在 `|x|` 那一屏也照样显示 `ROLLE_NOTE`,写着"这就是 Rolle" ——
 * 而 Rolle 在那里根本用不了。这一页整篇都在骂"不检查前提就套结论",
 * 自己却在页脚示范了一遍。(截图看出来的,当时测试全绿。)
 *
 * ⭐ 而且这里有一句更值钱的话:Rolle **不是**中值定理失败时的退路。
 *   它要的前提一模一样,所以同一个反例把两条一起推翻。
 */
export const ROLLE_ALSO_FAILS =
  'The chord is level here, which is exactly the setting Rolle describes — so this is a counterexample to Rolle too. Rolle asks for the same two hypotheses, so it is never the weaker result you fall back on when the mean value theorem does not apply.';

export const NAIVE_NOTE =
  'A central difference at the corner returns (h − h)/2h = 0, which matches the chord exactly. So a purely numerical search reports a solution at x = 0 — a value the derivative does not have. Numerical methods do not fail loudly at a corner; they hand back something plausible.';

export function show(v: number | null, places = 4): string {
  return v === null || !Number.isFinite(v) ? 'undefined' : showNumber(v, places);
}
