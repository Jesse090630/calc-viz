import { describe, expect, it } from 'vitest';
import {
  SERIES, seriesOf, partialSum, partialSums, sumPoints, sharedView,
  tailBlock, blockShrinks, numericVerdict,
  nthTermTest, ratioTest, ratioAt, testAgrees, isConditional,
  TESTS, HEADLINE, MAIN_IDEA, BLOCK_NOTE, PAIR_NOTE, show,
} from './convergence';

const harmonic = seriesOf('harmonic');
const psquare = seriesOf('psquare');
const geometric = seriesOf('geometric');
const nover = seriesOf('nover');
const alternating = seriesOf('alternating');
const factorial = seriesOf('factorial');
const pmone = seriesOf('pmone');

/* ── 项本身 ────────────────────────────────────────────────────── */

describe('terms', () => {
  it('手推的头几项', () => {
    expect([1, 2, 3, 4].map((n) => harmonic.a(n))).toEqual([1, 0.5, 1 / 3, 0.25]);
    expect([1, 2, 3].map((n) => psquare.a(n))).toEqual([1, 0.25, 1 / 9]);
    expect([1, 2, 3].map((n) => geometric.a(n))).toEqual([0.5, 0.25, 0.125]);
    expect([1, 2, 3].map((n) => alternating.a(n))).toEqual([1, -0.5, 1 / 3]);
    expect([1, 2, 3, 4].map((n) => pmone.a(n))).toEqual([1, -1, 1, -1]);
    // 1/n! : 1, 1/2, 1/6, 1/24
    expect([1, 2, 3, 4].map((n) => factorial.a(n))).toEqual([1, 0.5, 1 / 6, 1 / 24]);
  });

  it('声明的 termLimit 经得起数值复核', () => {
    let checked = 0;
    for (const s of SERIES) {
      if (s.termLimit === null) continue;
      expect(s.a(200_000)).toBeCloseTo(s.termLimit, 4);
      checked += 1;
    }
    expect(checked).toBe(6); // 只有 pmone 没有极限
  });

  it('⚠️ 极限不存在的那个,确实在两个值之间跳,而不是趋向某处', () => {
    expect(pmone.termLimit).toBeNull();
    expect(pmone.a(999_999)).toBe(1);
    expect(pmone.a(1_000_000)).toBe(-1);
  });

  it('⚠️ 1/n! 越过 170 之后就是 0(而不是 NaN 或 Infinity)', () => {
    // 171! 在 double 里溢出成 Infinity,于是 1/171! 正好是 0。
    // 这是 double 的边界,不是缺陷 —— 但它必须是 **0**,不许漏成 NaN。
    expect(factorial.a(170)).toBeGreaterThan(0);
    expect(factorial.a(171)).toBe(0);
    expect(factorial.a(5000)).toBe(0);
    expect(Number.isNaN(factorial.a(5000))).toBe(false);
    // 而且级数早就收敛完了 —— 越过那里一点影响都没有
    expect(partialSum(factorial, 170)).toBeCloseTo(factorial.sum!, 12);
    expect(partialSum(factorial, 5000)).toBeCloseTo(factorial.sum!, 12);
  });

  it('每一项都是有限数', () => {
    for (const s of SERIES) {
      for (let n = 1; n <= s.plotN; n += 1) expect(Number.isFinite(s.a(n))).toBe(true);
    }
  });
});

/* ── ⭐ 两条互不相干的路径 ─────────────────────────────────────── */

describe('declared verdict vs a purely numerical one', () => {
  it('⭐⭐ 每个级数上两条路径一致', () => {
    // ⚠️ `numericVerdict` 只做加法,完全不读 `verdict` 字段。
    let compared = 0;
    for (const s of SERIES) {
      expect(numericVerdict(s)).toBe(s.verdict);
      compared += 1;
    }
    expect(compared).toBe(7);
  });

  it('⭐⭐⭐ 调和级数的块**不缩**,而且卡在 ln 2 附近', () => {
    // S(2N) − S(N) = 1/(N+1) + … + 1/(2N) → ln 2,**从下方**逼近。
    // ⚠️ 所以小 N 上它略小于 ln 2(N = 16 时是 0.6778),不能一刀切地要求 > 0.69。
    for (const N of [16, 64, 256, 1024, 4096]) {
      expect(tailBlock(harmonic, N)).toBeGreaterThan(0.5);
      expect(tailBlock(harmonic, N)).toBeLessThan(Math.LN2);
    }
    for (const N of [1024, 4096]) {
      expect(tailBlock(harmonic, N)).toBeCloseTo(Math.LN2, 3);
    }
    // N 放大 256 倍,它几乎没动 —— 这才是"不缩"的意思
    expect(Math.abs(tailBlock(harmonic, 16) - tailBlock(harmonic, 4096))).toBeLessThan(0.02);
    expect(blockShrinks(harmonic)).toBe(false);
  });

  it('⚠️ 手推的下界:那一块有 N 项,每项至少 1/(2N),所以永远 ≥ 1/2', () => {
    for (const N of [8, 100, 5000]) {
      expect(tailBlock(harmonic, N)).toBeGreaterThanOrEqual(0.5);
    }
  });

  it('而收敛的级数上,那一块一路缩到 0', () => {
    let seen = 0;
    for (const s of SERIES) {
      if (s.verdict !== 'converges') continue;
      expect(blockShrinks(s)).toBe(true);
      expect(Math.abs(tailBlock(s, 4096))).toBeLessThan(1e-3);
      seen += 1;
    }
    expect(seen).toBe(4); // psquare / geometric / factorial / alternating —— 空转保护
  });

  it('⚠️ 交错级数的块也缩 —— 它确实收敛,尽管绝对值不收敛', () => {
    expect(blockShrinks(alternating)).toBe(true);
    expect(Math.abs(tailBlock(alternating, 2048))).toBeLessThan(1e-3);
  });

  it('发散的那几个,块都不缩', () => {
    let seen = 0;
    for (const s of SERIES) {
      if (s.verdict !== 'diverges') continue;
      expect(blockShrinks(s)).toBe(false);
      seen += 1;
    }
    expect(seen).toBe(3); // harmonic / nover / pmone
  });
});

/* ── 和 ────────────────────────────────────────────────────────── */

describe('sums', () => {
  it('⭐ 声明的和经得起部分和复核', () => {
    let checked = 0;
    for (const s of SERIES) {
      if (s.sum === null) continue;
      // 收敛得慢的多加一些项
      // ⚠️ 交错调和级数收敛得慢:20 万项之后误差约 1/(2n) ≈ 2.5e−6,
      //   所以那一个只能要求 4 位。别为了凑位数去加到两百万项 —— 那要跑半分钟。
      expect(partialSum(s, 200_000)).toBeCloseTo(s.sum, 4);
      checked += 1;
    }
    expect(checked).toBe(4);
  });

  it('手推:Σ1/n² = π²/6,Σ(1/2)ⁿ = 1,Σ1/n! = e − 1,Σ(−1)ⁿ⁺¹/n = ln 2', () => {
    expect(psquare.sum!).toBeCloseTo(1.6449340668, 9);
    expect(geometric.sum!).toBe(1);
    expect(factorial.sum!).toBeCloseTo(1.7182818285, 9);
    expect(alternating.sum!).toBeCloseTo(0.6931471806, 9);
  });

  it('⚠️ 发散的级数没有和 —— 不许编一个出来', () => {
    for (const s of SERIES) {
      if (s.verdict === 'diverges') {
        expect(s.sum).toBeNull();
        expect(s.sumTex).toBeNull();
      } else {
        expect(s.sum).not.toBeNull();
        expect(s.sumTex).not.toBeNull();
      }
    }
  });

  it('几何级数很快就贴上 1', () => {
    expect(partialSum(geometric, 10)).toBeCloseTo(1 - 2 ** -10, 12);
    expect(1 - partialSum(geometric, 20)).toBeLessThan(1e-6);
  });

  it('⚠️ 部分和不会跑出各自的画框', () => {
    for (const s of SERIES) {
      const [lo, hi] = s.yView;
      for (const [, v] of sumPoints(s)) {
        expect(v).toBeGreaterThanOrEqual(lo);
        expect(v).toBeLessThanOrEqual(hi);
      }
    }
  });

  it('⚠️ 而且要用得上画框 —— 不许整条线挤在中间一小条里', () => {
    for (const s of SERIES) {
      const vs = sumPoints(s).map((p) => p[1]);
      const span = s.yView[1] - s.yView[0];
      expect(Math.max(...vs) - Math.min(...vs)).toBeGreaterThan(span * 0.3);
    }
  });

  it('±1 那个的部分和就是 1, 0, 1, 0 ——「有界但不收敛」', () => {
    expect(partialSums(pmone, 6)).toEqual([1, 0, 1, 0, 1, 0]);
  });
});

/* ── ⭐⭐⭐ 判别法说了什么,以及什么时候它什么也没说 ─────────────── */

describe('what each test says', () => {
  it('⭐⭐⭐ Σ1/n 和 Σ1/n²:两个判别法的输出一模一样,结论相反', () => {
    // 这一对是整页的支点。
    expect(nthTermTest(harmonic)).toBe('says nothing');
    expect(nthTermTest(psquare)).toBe('says nothing');
    expect(ratioTest(harmonic)).toBe('says nothing');
    expect(ratioTest(psquare)).toBe('says nothing');
    expect(harmonic.ratioL).toBe(1);
    expect(psquare.ratioL).toBe(1);
    // 而真相相反
    expect(harmonic.verdict).toBe('diverges');
    expect(psquare.verdict).toBe('converges');
  });

  it('⚠️ aₙ → 0 时第 n 项判别法说的是"没结论",绝不是"收敛"', () => {
    // 这是这一课要消灭的那个错误,直接钉死。
    for (const s of SERIES) {
      if (s.termLimit === 0) expect(nthTermTest(s)).toBe('says nothing');
    }
    expect(SERIES.filter((s) => s.termLimit === 0).length).toBe(5); // 空转保护
    // 永远不会有哪个级数让它说"收敛"
    expect(SERIES.map(nthTermTest)).not.toContain('converges');
  });

  it('⭐ 它唯一能做的事:判发散', () => {
    expect(nthTermTest(nover)).toBe('diverges');   // 极限是 1
    expect(nthTermTest(pmone)).toBe('diverges');   // 极限不存在
  });

  it('比值判别法在 L ≠ 1 时是给得出结论的', () => {
    expect(ratioTest(geometric)).toBe('converges'); // L = 1/2
    expect(ratioTest(factorial)).toBe('converges'); // L = 0
  });

  it('⚠️ 判别法可以没结论,但绝不允许给出**错的**结论', () => {
    let checked = 0;
    for (const s of SERIES) {
      expect(testAgrees(nthTermTest(s), s.verdict)).toBe(true);
      expect(testAgrees(ratioTest(s), s.verdict)).toBe(true);
      checked += 2;
    }
    expect(checked).toBe(14);
  });

  it('testAgrees 会真的抓到冲突 —— 上面那条不是恒真', () => {
    expect(testAgrees('converges', 'diverges')).toBe(false);
    expect(testAgrees('diverges', 'converges')).toBe(false);
    expect(testAgrees('says nothing', 'diverges')).toBe(true);
    expect(testAgrees('says nothing', 'converges')).toBe(true);
    expect(testAgrees('converges', 'converges')).toBe(true);
  });

  it('⭐ 声明的 L 经得起数值复核 —— 逐个钉死那个比值的闭式', () => {
    /**
     * ⚠️ 不能笼统地"取个很大的 n,看它接不接近 L":
     *   `1/n!` 的比值是 `1/(n+1)`,而 `n!` 在 171 处就溢出了,
     *   能取到的最大 n 上比值还有 1/170 ≈ 0.0059 —— 离 0 远着呢。
     *   `(1/2)ⁿ` 更早,n ≈ 1074 之后整项下溢成 0。
     * 所以改成**逐个钉住比值的闭式**,再单独验它趋向声明的 L。这比模糊的容差硬得多。
     */
    const exact: Record<string, (n: number) => number> = {
      harmonic: (n) => n / (n + 1),
      psquare: (n) => (n / (n + 1)) ** 2,
      geometric: () => 0.5,
      nover: (n) => ((n + 1) * (n + 1)) / (n * (n + 2)),
      alternating: (n) => n / (n + 1),
      factorial: (n) => 1 / (n + 1),
      pmone: () => 1,
    };
    let checked = 0;
    for (const s of SERIES) {
      for (const n of [3, 17, 120]) {
        const r = ratioAt(s, n);
        expect(r).not.toBeNull();
        expect(r!).toBeCloseTo(exact[s.id]!(n), 12);
        checked += 1;
      }
    }
    expect(checked).toBe(21);
  });

  it('⭐ 而那些闭式确实趋向声明的 L', () => {
    const exact: Record<string, (n: number) => number> = {
      harmonic: (n) => n / (n + 1),
      psquare: (n) => (n / (n + 1)) ** 2,
      geometric: () => 0.5,
      nover: (n) => ((n + 1) * (n + 1)) / (n * (n + 2)),
      alternating: (n) => n / (n + 1),
      factorial: (n) => 1 / (n + 1),
      pmone: () => 1,
    };
    for (const s of SERIES) {
      const f = exact[s.id]!;
      expect(f(1e9)).toBeCloseTo(s.ratioL, 6);
      // 越往后越接近 —— 说明是极限,不是碰巧
      expect(Math.abs(f(1e6) - s.ratioL)).toBeLessThanOrEqual(Math.abs(f(1e3) - s.ratioL));
    }
  });

  it('ratioAt 在算不动的地方说 null,不给 NaN', () => {
    expect(ratioAt(factorial, 200)).toBeNull();   // 1/200! 已经下溢成 0
    expect(ratioAt(geometric, 2000)).toBeNull(); // (1/2)^2000 也是
    expect(ratioAt(harmonic, 5)).toBeCloseTo(5 / 6, 12);
  });

  it('三档输出都有级数走得到 —— 没有写了却到不了的状态', () => {
    const says = new Set([...SERIES.map(nthTermTest), ...SERIES.map(ratioTest)]);
    expect([...says].sort()).toEqual(['converges', 'diverges', 'says nothing']);
  });
});

/* ── 绝对收敛与条件收敛 ────────────────────────────────────────── */

describe('conditional convergence', () => {
  it('⭐⭐ 同一批项:带符号收敛,去掉符号发散', () => {
    expect(isConditional(alternating)).toBe(true);
    expect(alternating.verdict).toBe('converges');
    expect(alternating.absVerdict).toBe('diverges');
    // 取绝对值之后,它逐项就是调和级数
    for (const n of [1, 2, 7, 50]) {
      expect(Math.abs(alternating.a(n))).toBeCloseTo(harmonic.a(n), 12);
    }
  });

  it('⚠️ 只有它一个是条件收敛 —— 别的不许被误标', () => {
    expect(SERIES.filter(isConditional).map((s) => s.id)).toEqual(['alternating']);
  });

  it('absVerdict 和实际取绝对值之后的行为对得上', () => {
    // 逐项取绝对值,再跑一遍纯数值那条路。
    let checked = 0;
    for (const s of SERIES) {
      const abs = { ...s, a: (n: number) => Math.abs(s.a(n)) };
      expect(numericVerdict(abs)).toBe(s.absVerdict);
      checked += 1;
    }
    expect(checked).toBe(7);
  });

  it('发散的级数不可能绝对收敛', () => {
    for (const s of SERIES) {
      if (s.verdict === 'diverges') expect(s.absVerdict).toBe('diverges');
    }
  });
});

/* ── 画图与文案 ────────────────────────────────────────────────── */

describe('drawing and prose', () => {
  it('部分和的点数就是 plotN,横坐标从 1 开始', () => {
    for (const s of SERIES) {
      const pts = sumPoints(s);
      expect(pts).toHaveLength(s.plotN);
      expect(pts[0]![0]).toBe(1);
      expect(pts[0]![1]).toBeCloseTo(s.a(1), 12);
      expect(pts[pts.length - 1]![0]).toBe(s.plotN);
    }
  });

  it('sharedView 罩得住两边', () => {
    const v = sharedView(harmonic, psquare);
    expect(v[0]).toBeLessThanOrEqual(Math.min(harmonic.yView[0], psquare.yView[0]));
    expect(v[1]).toBeGreaterThanOrEqual(Math.max(harmonic.yView[1], psquare.yView[1]));
    for (const s of [harmonic, psquare]) {
      for (const [, y] of sumPoints(s)) {
        expect(y).toBeGreaterThanOrEqual(v[0]);
        expect(y).toBeLessThanOrEqual(v[1]);
      }
    }
  });

  it('⭐ 三张判别法卡片,每张都写明它**证明不了**什么', () => {
    expect(TESTS).toHaveLength(3);
    expect(TESTS.map((t) => t.n)).toEqual(['1', '2', '3']);
    for (const t of TESTS) {
      expect(t.proves.length).toBeGreaterThan(30);
      expect(t.cannot.length).toBeGreaterThan(50); // "证明不了"那一栏才是内容
    }
  });

  it('每个级数都有像样的说明', () => {
    for (const s of SERIES) {
      expect(s.note.length).toBeGreaterThan(120);
      expect(s.why.length).toBeGreaterThan(40);
      expect(s.tex.length).toBeGreaterThan(10);
    }
    expect(new Set(SERIES.map((s) => s.id)).size).toBe(SERIES.length);
  });

  it('文案齐全', () => {
    for (const t of [HEADLINE, MAIN_IDEA, BLOCK_NOTE, PAIR_NOTE]) {
      expect(t.length).toBeGreaterThan(20);
    }
  });

  it('show 说 undefined,不印假数字', () => {
    expect(show(null)).toBe('undefined');
    expect(show(Number.NaN)).toBe('undefined');
    expect(show(Number.POSITIVE_INFINITY)).toBe('undefined');
    expect(show(1.5, 2)).toContain('1.5');
  });
});
