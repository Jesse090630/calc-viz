import { describe, expect, it } from 'vitest';
import {
  CASES, caseOf, chordSlope, isRolle, verdictOf,
  findC, findCNumeric, findCNaive,
  sampleF, sampleDf, dfRange, chordAt, tangentAt, leftLimitAt, clampX, scanRoots, gridPoint, verdictFrom,
  MVT_NEEDS, HEADLINE, MAIN_IDEA, WHY_OPEN_CLOSED, ROLLE_NOTE, ROLLE_ALSO_FAILS,
  NAIVE_NOTE, show,
} from './mvt';

const cubic = caseOf('cubic');
const rolle = caseOf('rolle');
const abs = caseOf('abs');
const cusp = caseOf('cusp');
const jump = caseOf('jump');

/* ── 连线斜率:闭式,不经过扫描器 ──────────────────────────────── */

describe('chord slope', () => {
  it('cubic: (2 − (−2)) / 4 = 1, exactly', () => {
    expect(chordSlope(cubic)).toBe(1);
  });

  it('every counterexample has a level chord — that is what makes them sharp', () => {
    // 连线水平时,结论读作 f'(c) = 0,学生一眼能判断有没有这样的点。
    for (const c of [rolle, abs, cusp, jump]) {
      expect(Math.abs(chordSlope(c))).toBeLessThan(1e-12);
    }
  });

  it('is the secant slope, recomputed from the two endpoint values', () => {
    for (const c of CASES) {
      const m = (c.f(c.b) - c.f(c.a)) / (c.b - c.a);
      expect(chordSlope(c)).toBeCloseTo(m, 12);
    }
  });
});

describe('Rolle is the level-chord case, not a second theorem', () => {
  it('flags exactly the cases whose endpoints match', () => {
    expect(isRolle(rolle)).toBe(true);
    expect(isRolle(abs)).toBe(true);
    expect(isRolle(cusp)).toBe(true);
    expect(isRolle(jump)).toBe(true);
    // ⚠️ 这一条杀掉"isRolle 恒真"的变异体
    expect(isRolle(cubic)).toBe(false);
  });

  it('endpoints really do differ on the cubic', () => {
    expect(cubic.f(cubic.a)).toBe(-2);
    expect(cubic.f(cubic.b)).toBe(2);
  });
});

/* ── 前提 ──────────────────────────────────────────────────────── */

describe('which hypothesis broke', () => {
  it('names the weaker failure first', () => {
    expect(verdictOf(cubic)).toBe('applies');
    expect(verdictOf(rolle)).toBe('applies');
    expect(verdictOf(abs)).toBe('no-derivative');
    expect(verdictOf(cusp)).toBe('no-derivative');
    // ⭐⭐ 关键:jump 的 differentiable 是 true(内部确实处处可导),
    //   所以如果两个 if 调换顺序,它会被判成 'applies' —— 直接说反。
    expect(verdictOf(jump)).toBe('no-continuity');
  });

  it('the jump case really is differentiable inside — the order test is not vacuous', () => {
    expect(jump.differentiable).toBe(true);
    expect(jump.continuous).toBe(false);
    for (const x of [0.1, 0.5, 0.9, 0.999]) expect(jump.df(x)).toBe(1);
  });

  it('badPoints is nonempty exactly when a hypothesis fails', () => {
    for (const c of CASES) {
      const broken = !c.continuous || !c.differentiable;
      expect(c.badPoints.length > 0).toBe(broken);
    }
  });

  it('derivatives return null where they do not exist — never Infinity or NaN', () => {
    expect(abs.df(0)).toBeNull();
    expect(cusp.df(0)).toBeNull();
    for (const c of CASES) {
      for (const p of c.badPoints) expect(c.df(p)).toBeNull();
      for (let i = 1; i < 200; i += 1) {
        const x = c.a + ((c.b - c.a) * i) / 200;
        const d = c.df(x);
        if (d !== null) expect(Number.isFinite(d)).toBe(true);
      }
    }
  });
});

/* ── 结论:c 在不在 ────────────────────────────────────────────── */

describe('the guaranteed point', () => {
  it('cubic: the closed form is ±2/√3, and there are two of them', () => {
    // 3x² − 3 = 1  ⇒  x² = 4/3  ⇒  x = ±2/√3.
    // ⚠️ 期望值来自手算,不是扫描器自己的输出。
    const want = 2 / Math.sqrt(3);
    const got = [...findC(cubic)].sort((p, q) => p - q);
    expect(got).toHaveLength(2);
    expect(got[0]!).toBeCloseTo(-want, 6);
    expect(got[1]!).toBeCloseTo(want, 6);
    // "至少一个"——这一课要学生看见的正是"可以不止一个"
    expect(got[1]! - got[0]!).toBeGreaterThan(2);
  });

  it('rolle: x² − 1 has its level tangent at the vertex', () => {
    const got = findC(rolle);
    expect(got).toHaveLength(1);
    expect(got[0]!).toBeCloseTo(0, 9);
  });

  it('every reported c lies strictly inside the open interval', () => {
    let seen = 0;
    for (const c of CASES) {
      for (const x of findC(c)) {
        expect(x).toBeGreaterThan(c.a);
        expect(x).toBeLessThan(c.b);
        seen += 1;
      }
    }
    expect(seen).toBe(3); // 空转保护:cubic 两个 + rolle 一个
  });

  it('every reported c really has the chord slope — checked against f, not f′', () => {
    // ⭐ 独立验证:不看 df,直接量 f 在 c 附近的割线。
    let checked = 0;
    for (const c of CASES) {
      const m = chordSlope(c);
      for (const x of findC(c)) {
        const h = 1e-5;
        const secant = (c.f(x + h) - c.f(x - h)) / (2 * h);
        expect(secant).toBeCloseTo(m, 6);
        checked += 1;
      }
    }
    expect(checked).toBe(3);
  });

  it('⭐⭐ the three counterexamples have no such point at all', () => {
    expect(findC(abs)).toEqual([]);
    expect(findC(cusp)).toEqual([]);
    expect(findC(jump)).toEqual([]);
  });

  it('|x| never has slope 0 anywhere it has a slope', () => {
    // 反例的机制本身,和扫描器无关。
    for (let i = -100; i <= 100; i += 1) {
      const x = i / 100;
      const d = abs.df(x);
      if (d === null) { expect(x).toBe(0); continue; }
      expect(Math.abs(d)).toBe(1);
    }
  });

  it('x^(2/3) has a derivative that runs away rather than passing through 0', () => {
    for (const x of [-0.5, -0.01, -1e-6, 1e-6, 0.01, 0.5]) {
      const d = cusp.df(x)!;
      expect(d).not.toBeNull();
      expect(Math.abs(d)).toBeGreaterThan(0.8);
    }
    // 越靠近 0 越大,而不是越靠近 0 越小
    expect(Math.abs(cusp.df(1e-6)!)).toBeGreaterThan(Math.abs(cusp.df(0.5)!));
  });
});

/* ── 两条互不相干的路径 ────────────────────────────────────────── */

describe('path ① (analytic f′) and path ② (central differences of f) agree', () => {
  it('same count and same values on every case', () => {
    let compared = 0;
    for (const c of CASES) {
      const one = [...findC(c)].sort((p, q) => p - q);
      const two = [...findCNumeric(c)].sort((p, q) => p - q);
      expect(two).toHaveLength(one.length);
      for (let i = 0; i < one.length; i += 1) {
        expect(two[i]!).toBeCloseTo(one[i]!, 4);
        compared += 1;
      }
    }
    expect(compared).toBe(3); // 空转保护
  });

  it('path ② finds nothing on the counterexamples either', () => {
    expect(findCNumeric(abs)).toEqual([]);
    expect(findCNumeric(cusp)).toEqual([]);
    expect(findCNumeric(jump)).toEqual([]);
  });
});

describe('⭐⭐ the naive numerical path invents a c that is not there', () => {
  it('a central difference across the corner reads exactly 0', () => {
    // (|h| − |−h|) / 2h = 0,和连线斜率一模一样。
    const h = 1e-6;
    expect((abs.f(h) - abs.f(-h)) / (2 * h)).toBe(0);
    expect((cusp.f(h) - cusp.f(-h)) / (2 * h)).toBe(0);
  });

  it('so it reports x = 0 as a solution — and the derivative there does not exist', () => {
    for (const c of [abs, cusp]) {
      const fake = findCNaive(c);
      expect(fake).toHaveLength(1);
      // 报出来的点就是尖点本身(一格之内)
      expect(Math.abs(fake[0]!)).toBeLessThan(1e-3);
      // ⭐⭐ 而尖点处根本没有导数,所以这个"解"不可能是真的
      expect(c.df(0)).toBeNull();
      // 认真的那条路一个都不报
      expect(findC(c)).toEqual([]);
      expect(findCNumeric(c)).toEqual([]);
    }
  });

  it('on the honest cases the naive path agrees, so the difference is the corner, not the method', () => {
    for (const c of [cubic, rolle]) {
      const good = [...findC(c)].sort((p, q) => p - q);
      const naive = [...findCNaive(c)].sort((p, q) => p - q);
      expect(naive).toHaveLength(good.length);
      for (let i = 0; i < good.length; i += 1) {
        expect(naive[i]!).toBeCloseTo(good[i]!, 2);
      }
    }
  });
});

/* ── 画图 ──────────────────────────────────────────────────────── */

describe('drawing', () => {
  it('⚠️ the discontinuous case lifts the pen; the continuous ones never do', () => {
    const pts = sampleF(jump);
    const breaks = pts.filter((p) => p === null).length;
    expect(breaks).toBe(1);
    // 抬笔之后紧接着的那一点就是搬过家的端点值
    const at = pts.indexOf(null);
    expect(at).toBeGreaterThan(0);
    const before = pts[at - 1] as readonly [number, number];
    const after = pts[at + 1] as readonly [number, number];
    expect(before[1]).toBeGreaterThan(0.99); // 左极限接近 1
    expect(after[1]).toBe(0);                 // 实际取值 0
    expect(after[0]).toBeCloseTo(1, 12);

    for (const c of [cubic, rolle, abs, cusp]) {
      expect(sampleF(c).every((p) => p !== null)).toBe(true);
    }
  });

  it('samples span the closed interval', () => {
    for (const c of CASES) {
      const xs = sampleF(c).filter((p): p is readonly [number, number] => p !== null).map((p) => p[0]);
      expect(Math.min(...xs)).toBeCloseTo(c.a, 12);
      expect(Math.max(...xs)).toBeCloseTo(c.b, 12);
    }
  });

  it('f stays inside its own frame — every sampled value fits yView', () => {
    let seen = 0;
    for (const c of CASES) {
      const [lo, hi] = c.yView;
      for (const p of sampleF(c)) {
        if (p === null) continue;
        expect(p[1]).toBeGreaterThanOrEqual(lo);
        expect(p[1]).toBeLessThanOrEqual(hi);
        seen += 1;
      }
    }
    expect(seen).toBeGreaterThan(2000);
  });

  it('f′ is sampled on the open interval only — the endpoints are excluded', () => {
    for (const c of CASES) {
      const xs = sampleDf(c).filter((p): p is readonly [number, number] => p !== null).map((p) => p[0]);
      expect(Math.min(...xs)).toBeGreaterThan(c.a);
      expect(Math.max(...xs)).toBeLessThan(c.b);
    }
  });

  it('f′ has a hole exactly at the corner, and nowhere on the honest cases', () => {
    for (const c of [cubic, rolle]) {
      expect(sampleDf(c).every((p) => p !== null)).toBe(true);
    }
    // |x|:网格 n=600 在 [−1,1] 上恰好命中 x = 0
    expect(sampleDf(abs).some((p) => p === null)).toBe(true);
    expect(sampleDf(cusp).some((p) => p === null)).toBe(true);
  });

  it('⭐ the chord slope is inside the f′ frame on every case', () => {
    // 否则学生根本看不到"曲线够不够得到那条水平线"——而那就是整页的论点。
    for (const c of CASES) {
      const [lo, hi] = dfRange(c);
      const m = chordSlope(c);
      expect(m).toBeGreaterThan(lo);
      expect(m).toBeLessThan(hi);
      expect(hi).toBeGreaterThan(lo);
    }
  });

  it('dfRange is the declared window, not something read off the data', () => {
    // 尖点那条 f′ 发散,数据定标尺就会把整张图压扁。
    for (const c of CASES) expect(dfRange(c)).toBe(c.dfView);
    const wild = sampleDf(cusp).filter((p): p is readonly [number, number] => p !== null)
      .some((p) => Math.abs(p[1]) > cusp.dfView[1]);
    expect(wild).toBe(true); // 确实有样本跑出画框——这是故意的
  });

  it('clampX keeps the marker on the interval and survives garbage', () => {
    expect(clampX(cubic, -99)).toBe(cubic.a);
    expect(clampX(cubic, 99)).toBe(cubic.b);
    expect(clampX(cubic, 0.5)).toBe(0.5);
    expect(clampX(cubic, Number.NaN)).toBe(0);
  });
});

/* ── 文案 ──────────────────────────────────────────────────────── */

describe('what the page says', () => {
  it('lists two hypotheses and distinguishes closed from open', () => {
    expect(MVT_NEEDS).toHaveLength(2);
    expect(MVT_NEEDS[0]!.what).toContain('closed');
    expect(MVT_NEEDS[1]!.what).toContain('open');
    expect(MVT_NEEDS.map((n) => n.n)).toEqual(['1', '2']);
  });

  it('every case carries a note and a formula', () => {
    for (const c of CASES) {
      expect(c.note.length).toBeGreaterThan(40);
      expect(c.fTex.length).toBeGreaterThan(3);
      expect(c.label.length).toBeGreaterThan(5);
    }
    expect(new Set(CASES.map((c) => c.id)).size).toBe(CASES.length);
  });

  it('the prose that carries the argument is present', () => {
    for (const s of [HEADLINE, MAIN_IDEA, WHY_OPEN_CLOSED, ROLLE_NOTE, ROLLE_ALSO_FAILS, NAIVE_NOTE]) {
      expect(s.length).toBeGreaterThan(10);
    }
    expect(ROLLE_NOTE).toContain('Rolle');
    expect(ROLLE_ALSO_FAILS).toContain('Rolle');
    expect(ROLLE_NOTE).not.toBe(ROLLE_ALSO_FAILS);
  });

  it('show() says "undefined" instead of printing a fake number', () => {
    expect(show(null)).toBe('undefined');
    expect(show(Number.NaN)).toBe('undefined');
    expect(show(Number.POSITIVE_INFINITY)).toBe('undefined');
    expect(show(1.23456789, 3)).toContain('1.23');
  });
});


/* ── 抽出来单独测的两段 ────────────────────────────────────────── */

describe('verdictFrom: all four truth combinations, so the order is actually pinned', () => {
  it('reports the weaker failure when both are broken', () => {
    // ⚠️ 现有五个情形里没有"两条都破"的,所以这一条只能直接构造出来测。
    expect(verdictFrom(false, false)).toBe('no-continuity');
  });

  it('and the other three', () => {
    expect(verdictFrom(true, true)).toBe('applies');
    expect(verdictFrom(true, false)).toBe('no-derivative');
    expect(verdictFrom(false, true)).toBe('no-continuity');
  });

  it('agrees with the case-level wrapper on every case', () => {
    for (const c of CASES) {
      expect(verdictOf(c)).toBe(verdictFrom(c.continuous, c.differentiable));
    }
  });
});

describe('scanRoots', () => {
  it('finds a root that sits exactly on a grid point', () => {
    // ⚠️ 这是 `g0 * g1 > 0` 那个 `>` 的守卫:换成 `>=`,乘积恰好为 0 的
    //   那两段会被一起跳过,正中间的零点就丢了。
    const got = scanRoots((x) => x, -1, 1, 4000);
    expect(got).toHaveLength(1);
    expect(got[0]!).toBeCloseTo(0, 12);
  });

  it('finds several roots and keeps them apart', () => {
    const got = [...scanRoots((x) => Math.sin(x), -7, 7, 4000)].sort((p, q) => p - q);
    expect(got).toHaveLength(5); // −2π, −π, 0, π, 2π
    for (let i = 0; i < got.length; i += 1) {
      expect(got[i]!).toBeCloseTo((i - 2) * Math.PI, 6);
    }
  });

  it('⚠️ a root sitting on an endpoint is not reported — the theorem promises an interior c', () => {
    // g(x) = x + 1 的零点正好是左端点;g(x) = x − 1 的正好是右端点。
    // 扫描从 i = 1 到 n−2,两头都不碰,所以这两个都该是空的。
    expect(scanRoots((x) => x + 1, -1, 1, 4000)).toEqual([]);
    expect(scanRoots((x) => x - 1, -1, 1, 4000)).toEqual([]);
    // 空转保护:同一个函数把零点挪进内部就找得到
    expect(scanRoots((x) => x + 0.5, -1, 1, 4000)[0]!).toBeCloseTo(-0.5, 9);
  });

  it('⚠️ the grid lands exactly on the midpoint — the `> 0` guard depends on it', () => {
    // 零点落在网格点上时,g0 * g1 恰好是 0。`>` 会去二分,`>=` 会跳过。
    // 没有这一条,上面那个 `>= 0` 的变异体就是活的。
    // ⓘ 注:把实现改成"先算 step 再累加"是**等价变异体**(见 gridPoint 的注释),
    //   两种写法在这里给出同一个 0,不为它硬造断言。
    expect(gridPoint(-1, 1, 2000, 4000)).toBe(0);
    expect(gridPoint(-1, 1, 0, 4000)).toBe(-1);
    expect(gridPoint(-1, 1, 4000, 4000)).toBe(1);
    expect(gridPoint(0, 1, 1, 4)).toBe(0.25);
  });

  it('⚠️ a sign change that straddles an undefined point is not a root', () => {
    // −1 左边,+1 右边,中间没有定义。硬接就会报出一个不存在的零点。
    const g = (x: number): number | null => (Math.abs(x) < 1e-9 ? null : Math.sign(x));
    expect(scanRoots(g, -1, 1, 4000)).toEqual([]);
    // 把 null 换成 0,同一段就会报出零点 —— 证明上面那条不是空转
    const lying = (x: number): number => (Math.abs(x) < 1e-9 ? 0 : Math.sign(x));
    expect(scanRoots(lying, -1, 1, 4000).length).toBeGreaterThan(0);
  });

  it('a function with no root returns nothing', () => {
    expect(scanRoots((x) => x * x + 1, -2, 2, 400)).toEqual([]);
  });
});

describe('lines the page draws', () => {
  it('the chord passes through both endpoints', () => {
    for (const c of CASES) {
      expect(chordAt(c, c.a)).toBeCloseTo(c.f(c.a), 12);
      expect(chordAt(c, c.b)).toBeCloseTo(c.f(c.b), 12);
    }
  });

  it('⚠️ a level chord does not mean the page may say "this is Rolle"', () => {
    // ⭐ |x|、x^{2/3}、端点跳跃三个都是"两端等高",但前提全不成立。
    //   前提不成立时 Rolle 也一起垮掉,所以那三屏必须说另一句话。
    for (const c of [abs, cusp, jump]) {
      expect(isRolle(c)).toBe(true);
      expect(verdictOf(c)).not.toBe('applies');
    }
    // 而 rolle 那一屏两样都成立 —— 否则上面那条就成了空话
    expect(isRolle(rolle)).toBe(true);
    expect(verdictOf(rolle)).toBe('applies');
  });

  it('⭐ the tangent at c is parallel to the chord — that is the conclusion, drawn', () => {
    let seen = 0;
    for (const c of CASES) {
      for (const x of findC(c)) {
        // 两条线在两个不同的 x 上的高度差必须是常数 —— 平行的定义。
        const d1 = tangentAt(c, x, c.a)! - chordAt(c, c.a);
        const d2 = tangentAt(c, x, c.b)! - chordAt(c, c.b);
        expect(d2).toBeCloseTo(d1, 6);
        seen += 1;
      }
    }
    expect(seen).toBe(3);
  });

  it('the tangent touches f at its own point', () => {
    for (const c of [cubic, rolle]) {
      for (const x of findC(c)) expect(tangentAt(c, x, x)!).toBeCloseTo(c.f(x), 12);
    }
  });

  it('there is no tangent where there is no derivative', () => {
    expect(tangentAt(abs, 0, 0.5)).toBeNull();
    expect(tangentAt(cusp, 0, 0.5)).toBeNull();
    expect(tangentAt(jump, 1, 0.5)).toBeNull();
  });

  it('⚠️ the open circle marks the left limit, and only the broken case gets one', () => {
    // jump:左极限是 1,实际取值是 0 —— 圈和点必须画在不同高度,
    //   否则"端点被搬走了"这件事在图上就看不见。
    const hole = leftLimitAt(jump, 1)!;
    expect(hole).toBeCloseTo(1, 6);
    expect(jump.f(1)).toBe(0);
    expect(Math.abs(hole - jump.f(1))).toBeGreaterThan(0.9);
    for (const c of [cubic, rolle, abs, cusp]) {
      expect(leftLimitAt(c, 0)).toBeNull();
    }
  });
});
