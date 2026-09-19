/**
 * MATH — 收敛判别法:**判别法说不出话的时候,它还是没说话。**
 *
 * ⭐⭐⭐ 单元 10 占 BC 整卷 17~18%,是 BC 相对 AB 最大的一块增量,
 *   而学生在这一单元犯的错几乎全是同一个:**把"判别法没结论"读成"判别法有结论"。**
 *
 *   ❶ **"aₙ → 0,所以级数收敛。"** —— 最常见的一个错。
 *      第 n 项判别法**只能判发散**。`aₙ → 0` 之后它就闭嘴了,
 *      而调和级数 `Σ 1/n` 正是终点都到 0、和却跑到无穷的那个。
 *
 *   ❷ ⭐⭐ **比值判别法 `L = 1` 时它什么也没说。**
 *      `Σ 1/n` 和 `Σ 1/n²` 的 `L` **都等于 1**,
 *      一个发散一个收敛到 `π²/6`。**同样的 L,相反的答案。**
 *      这一对摆在一起,比讲十遍"L = 1 时判别法失效"管用。
 *
 *   ❸ **绝对收敛和条件收敛不是一回事。**
 *      `Σ (−1)ⁿ⁺¹/n` 收敛到 `ln 2`,而把每一项取绝对值就成了调和级数。
 *      **同一批项,加上符号收敛,去掉符号发散。**
 *
 * ⭐ 两条互不相干的路径判断一个级数到底收不收敛:
 *   ① `verdictOf`  —— 声明的结论(p 级数判据、几何级数判据、交错级数判别法);
 *   ② `tailBlock`  —— 纯数值:`S(2N) − S(N)`。
 *      收敛的级数这一块必然趋于 0;而调和级数上它**恒等于 ln 2 ≈ 0.693**,
 *      一个不随 N 变小的常数 —— 这正是"调和级数发散"最短的那个证明。
 *      ⚠️ 这条路完全不看声明,它只做加法。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import { showNumber } from './format';

/**
 * `1/n!`,带缓存。
 *
 * ⚠️ 第一版每次调用都从头乘一遍 —— 单项 `O(n)`,于是 `partialSums` 成了 `O(n²)`,
 *   一条 20 万项的部分和跑了半分钟。项函数会被部分和、尾块、比值反复调用,
 *   **它必须是常数时间的。**
 * ⚠️ `n!` 在 `n = 171` 处溢出成 `Infinity`,那之后 `1/n!` 就是 0。
 *   ⓘ 这里**不用**额外写 `Number.isFinite` 的守卫:`1 / Infinity` 在 JS 里本来就是 0,
 *     写了也是一段永远走不到的分支(变异测试把它照出来了)。
 *     真正该做的是钉一条断言,说明越过 170 之后这一项确实是 0 —— 见测试。
 */
const FACT_CACHE: number[] = [1, 1];
function reciprocalFactorial(n: number): number {
  for (let k = FACT_CACHE.length; k <= n; k += 1) {
    FACT_CACHE[k] = FACT_CACHE[k - 1]! * k;
  }
  return 1 / FACT_CACHE[n]!;
}

/* ══ 级数 ══════════════════════════════════════════════════════════ */

export type Verdict = 'converges' | 'diverges';
/** 判别法给得出结论,还是**什么也没说**。 */
export type TestSays = 'converges' | 'diverges' | 'says nothing';

export interface Series {
  readonly id: string;
  readonly label: string;
  readonly tex: string;
  /** 第 n 项(n 从 1 起)。 */
  readonly a: (n: number) => number;
  /** 真正的结论,以及**凭什么** —— 不是靠上面那两个判别法得到的。 */
  readonly verdict: Verdict;
  readonly why: string;
  /** `lim aₙ`;**极限不存在**时为 `null`。 */
  readonly termLimit: number | null;
  /** 比值判别法的 `L = lim |aₙ₊₁/aₙ|`。 */
  readonly ratioL: number;
  /** 收敛时的和;不知道或发散时为 `null`。 */
  readonly sum: number | null;
  readonly sumTex: string | null;
  /** 取绝对值之后还收不收敛 —— 区分绝对收敛与条件收敛。 */
  readonly absVerdict: Verdict;
  /** 部分和图画到第几项 */
  readonly plotN: number;
  readonly yView: readonly [number, number];
  readonly note: string;
}

export const SERIES: readonly Series[] = [
  {
    /** ⭐⭐⭐ 这一课的主角:项趋于 0,和却跑到无穷。 */
    id: 'harmonic',
    label: 'Σ 1/n — the terms go to zero and the sum does not',
    tex: String.raw`\sum_{n=1}^{\infty}\frac{1}{n}`,
    a: (n) => 1 / n,
    verdict: 'diverges',
    why: 'A p-series with p = 1. The p-series rule says it diverges, and the blocks S(2N) − S(N) each add another ln 2 no matter how far out you go.',
    termLimit: 0,
    ratioL: 1,
    sum: null,
    sumTex: null,
    absVerdict: 'diverges',
    plotN: 300,
    yView: [0, 7],
    note: 'Every term is smaller than the last and they head for zero, and the running total still climbs past any number you name. It climbs slowly — like ln N — but it never stops. This is the series that makes "the terms go to zero" worthless as evidence of convergence.',
  },
  {
    /**
     * ⭐⭐ 和调和级数**两个判别法的结果一模一样**,结论相反。
     * 这一对是整页的支点。
     */
    id: 'psquare',
    label: 'Σ 1/n² — same two test results, opposite answer',
    tex: String.raw`\sum_{n=1}^{\infty}\frac{1}{n^2}`,
    a: (n) => 1 / (n * n),
    verdict: 'converges',
    why: 'A p-series with p = 2 > 1, so it converges. Euler found the sum: π²/6.',
    termLimit: 0,
    ratioL: 1,
    sum: Math.PI ** 2 / 6,
    sumTex: String.raw`\frac{\pi^2}{6}`,
    absVerdict: 'converges',
    plotN: 300,
    yView: [0, 2],
    note: 'The nth-term test says nothing here and the ratio test says nothing here — exactly as on the harmonic series, whose answer is the opposite. Two tests, identical output, and the truth is decided by neither of them. That is what "inconclusive" means, and it is not a soft way of saying "diverges".',
  },
  {
    /** 判别法**真的给得出结论**的那一个,免得整页只剩"判别法没用"。 */
    id: 'geometric',
    label: 'Σ (1/2)ⁿ — the ratio test actually decides this one',
    tex: String.raw`\sum_{n=1}^{\infty}\left(\frac12\right)^{n}`,
    a: (n) => 0.5 ** n,
    verdict: 'converges',
    why: 'Geometric with r = 1/2, and |r| < 1. The sum of a geometric series is a/(1 − r) = 1.',
    termLimit: 0,
    ratioL: 0.5,
    sum: 1,
    sumTex: String.raw`1`,
    absVerdict: 'converges',
    plotN: 20,
    yView: [0, 1.2],
    note: 'Here L = 1/2, comfortably below 1, and the ratio test settles it outright. The running total is already within a thousandth of 1 by the tenth term. Tests are not useless — they are useless exactly where L = 1, and that is a narrow and well-marked place.',
  },
  {
    /** ⭐ 第 n 项判别法**唯一**能做的事:判发散。 */
    id: 'nover',
    label: 'Σ n/(n+1) — the one case the nth-term test settles',
    tex: String.raw`\sum_{n=1}^{\infty}\frac{n}{n+1}`,
    a: (n) => n / (n + 1),
    verdict: 'diverges',
    why: 'The terms approach 1, not 0. A series whose terms do not approach zero cannot converge — this is the only thing the nth-term test is able to prove.',
    termLimit: 1,
    ratioL: 1,
    sum: null,
    sumTex: null,
    absVerdict: 'diverges',
    plotN: 40,
    yView: [0, 40],
    note: 'The terms creep up towards 1, so from some point on you are adding roughly 1 each time, forever. This is the nth-term test doing the one job it has. Notice the direction: it proves divergence and never proves convergence, and no amount of terms going to zero reverses that.',
  },
  {
    /**
     * ⭐⭐ 同一批项,加上符号收敛,去掉符号发散。
     * 条件收敛的标准例子,也是 BC 必考的一个。
     */
    id: 'alternating',
    label: 'Σ (−1)ⁿ⁺¹/n — converges, and its absolute value does not',
    tex: String.raw`\sum_{n=1}^{\infty}\frac{(-1)^{n+1}}{n}`,
    a: (n) => (n % 2 === 1 ? 1 / n : -1 / n),
    verdict: 'converges',
    why: 'The alternating series test applies: the magnitudes 1/n decrease and go to zero. It converges to ln 2 — but only conditionally, since the absolute values are the harmonic series.',
    termLimit: 0,
    ratioL: 1,
    sum: Math.LN2,
    sumTex: String.raw`\ln 2`,
    absVerdict: 'diverges',
    plotN: 300,
    yView: [0.3, 1.1],
    note: 'Strip the signs and this is the harmonic series, which diverges. Keep the signs and it settles on ln 2. The convergence is held together entirely by the cancellation, which is what "conditional" means — and it is why rearranging the terms of this series can make it add up to anything at all.',
  },
  {
    /** 比值判别法 L = 0 —— 收敛得极快,和上面几个形成对照。 */
    id: 'factorial',
    label: 'Σ 1/n! — L = 0, and it converges almost immediately',
    tex: String.raw`\sum_{n=1}^{\infty}\frac{1}{n!}`,
    a: (n) => reciprocalFactorial(n),
    verdict: 'converges',
    why: 'The ratio test gives L = lim 1/(n+1) = 0, which is decisively below 1. The sum is e − 1.',
    termLimit: 0,
    ratioL: 0,
    sum: Math.E - 1,
    sumTex: String.raw`e - 1`,
    absVerdict: 'converges',
    plotN: 12,
    yView: [0, 2],
    note: 'L = 0 is as far from the inconclusive case as it gets, and the running total reaches e − 1 to six decimal places by the tenth term. Put this next to the harmonic series: both have terms going to zero, and that fact alone told you nothing about either of them.',
  },
  {
    /** ⚠️ 极限**不存在**(不是"不等于 0")—— 第 n 项判别法同样能判。 */
    id: 'pmone',
    label: 'Σ (−1)ⁿ⁺¹ — the terms have no limit at all',
    tex: String.raw`\sum_{n=1}^{\infty}(-1)^{n+1}`,
    a: (n) => (n % 2 === 1 ? 1 : -1),
    verdict: 'diverges',
    why: 'The terms bounce between 1 and −1, so lim aₙ does not exist — and in particular is not zero. The partial sums bounce between 1 and 0 forever and never settle.',
    termLimit: null,
    ratioL: 1,
    sum: null,
    sumTex: null,
    absVerdict: 'diverges',
    plotN: 16,
    yView: [-0.25, 1.25],
    note: 'The partial sums are 1, 0, 1, 0, … forever. They stay bounded, they never blow up, and the series still diverges — because diverging means failing to settle on a limit, not running off to infinity. The nth-term test catches it, since a limit that does not exist is certainly not zero.',
  },
] as const;

export function seriesOf(id: string): Series {
  return SERIES.find((s) => s.id === id) ?? SERIES[0]!;
}

/* ══ 部分和 ════════════════════════════════════════════════════════ */

/** `S₁ … S_n`。 */
export function partialSums(s: Series, n: number): readonly number[] {
  const out: number[] = [];
  let total = 0;
  for (let k = 1; k <= n; k += 1) {
    total += s.a(k);
    out.push(total);
  }
  return out;
}

export function partialSum(s: Series, n: number): number {
  let total = 0;
  for (let k = 1; k <= n; k += 1) total += s.a(k);
  return total;
}

/* ══ 路径 ② —— 纯数值,完全不看声明 ═══════════════════════════════ */

/**
 * ⭐⭐⭐ `S(2N) − S(N)` —— 这一课最硬的一个数。
 *
 * 级数收敛 ⇔ 部分和是 Cauchy 列 ⇒ 这一块必然趋于 0。
 * 而调和级数上它**恒等于 ln 2 ≈ 0.693**,不随 N 变小:
 *   `1/(N+1) + … + 1/(2N)` 有 N 项,每项至少 `1/(2N)`,所以这一块 ≥ 1/2。
 * ⚠️ 这是"调和级数发散"最短的证明,而且**只用加法**,
 *   跟 `verdict` 那个声明字段一点关系都没有。
 */
export function tailBlock(s: Series, N: number): number {
  let total = 0;
  for (let k = N + 1; k <= 2 * N; k += 1) total += s.a(k);
  return total;
}

/**
 * 把 `tailBlock` 在越来越大的 N 上看一遍,判断它到底趋不趋于 0。
 *
 * ⚠️ 判据是**比较**,不是绝对阈值:N 翻四倍之后这一块有没有明显变小。
 *   收敛的级数会一路缩到 0;调和级数会卡在 0.69 附近纹丝不动。
 */
export function blockShrinks(s: Series, from = 64, factor = 16): boolean {
  const near = Math.abs(tailBlock(s, from));
  const far = Math.abs(tailBlock(s, from * factor));
  // 缩到十分之一以下才算"在趋于 0"
  return far < near / 10;
}

/** 数值那条路给出的结论。 */
export function numericVerdict(s: Series): Verdict {
  return blockShrinks(s) ? 'converges' : 'diverges';
}

/* ══ 判别法说了什么 —— 以及它什么时候什么也没说 ═══════════════════ */

/**
 * ⭐ 第 n 项判别法。**它只有一个方向。**
 * ⚠️ `aₙ → 0` 时返回 `'says nothing'`,绝不能返回 `'converges'` ——
 *   那正是这一课要消灭的那个错误。
 */
export function nthTermTest(s: Series): TestSays {
  if (s.termLimit === null) return 'diverges';  // 极限不存在 ⇒ 肯定不是 0
  return s.termLimit === 0 ? 'says nothing' : 'diverges';
}

/**
 * ⭐⭐ 比值判别法。`L = 1` 时它什么也没说 —— 而 `Σ1/n` 与 `Σ1/n²` 的 L 都是 1。
 */
export function ratioTest(s: Series): TestSays {
  if (s.ratioL < 1) return 'converges';
  if (s.ratioL > 1) return 'diverges';
  return 'says nothing';
}

/** `L` 的数值复核:直接量 `|aₙ₊₁/aₙ|` 在很大的 n 上的值。 */
export function ratioAt(s: Series, n: number): number | null {
  const top = s.a(n + 1);
  const bottom = s.a(n);
  if (bottom === 0 || !Number.isFinite(top) || !Number.isFinite(bottom)) return null;
  return Math.abs(top / bottom);
}

/**
 * 判别法给出的结论有没有和真相冲突。
 * ⚠️ 判别法可以**没结论**,但绝不允许给出**错的**结论。
 */
export function testAgrees(says: TestSays, truth: Verdict): boolean {
  return says === 'says nothing' || says === truth;
}

/** 收敛但绝对值发散 —— 条件收敛。 */
export function isConditional(s: Series): boolean {
  return s.verdict === 'converges' && s.absVerdict === 'diverges';
}

/* ══ 画图 ═════════════════════════════════════════════════════════ */

/** 部分和图上的点。 */
export function sumPoints(s: Series): readonly (readonly [number, number])[] {
  return partialSums(s, s.plotN).map((v, i) => [i + 1, v] as const);
}

/** 两个级数并排比较时用的共同纵轴。 */
export function sharedView(a: Series, b: Series): readonly [number, number] {
  return [Math.min(a.yView[0], b.yView[0]), Math.max(a.yView[1], b.yView[1])];
}

/* ══ 说明 ═════════════════════════════════════════════════════════ */

export interface TestCard {
  readonly n: string;
  readonly name: string;
  /** 它能证明什么 */
  readonly proves: string;
  /** ⚠️ 它**证明不了**什么 —— 这一栏才是这一课的内容 */
  readonly cannot: string;
}

export const TESTS: readonly TestCard[] = [
  {
    n: '1',
    name: 'nth-term test',
    proves: 'If the terms do not approach zero, the series diverges.',
    cannot: 'Nothing else. Once the terms do approach zero this test is finished and has told you nothing — it never proves convergence.',
  },
  {
    n: '2',
    name: 'ratio test',
    proves: 'If L < 1 the series converges; if L > 1 it diverges.',
    cannot: 'At L = 1 it says nothing, and that is where the hard series live. Σ1/n and Σ1/n² both have L = 1.',
  },
  {
    n: '3',
    name: 'p-series rule',
    proves: 'Σ 1/n^p converges exactly when p > 1.',
    cannot: 'It only applies to that one shape. The threshold sits at p = 1 with divergence on the boundary itself.',
  },
] as const;

export const HEADLINE = 'Inconclusive Is Not a Verdict';
export const MAIN_IDEA =
  'The nth-term test proves divergence and nothing else. The ratio test goes quiet at L = 1. Both of them say exactly the same thing about Σ1/n and Σ1/n², and those two have opposite answers.';

export const BLOCK_NOTE =
  'Add up the terms from N + 1 to 2N. For a convergent series that block shrinks to nothing as N grows. On the harmonic series it is always at least 1/2 — the block has N terms and each is at least 1/(2N) — so the total keeps gaining no matter how far out you start.';

export const PAIR_NOTE =
  'Same nth-term result, same ratio-test result, opposite truth. Whatever decided these two, it was not either of those tests.';

export function show(v: number | null, places = 4): string {
  return v === null || !Number.isFinite(v) ? 'undefined' : showNumber(v, places);
}
