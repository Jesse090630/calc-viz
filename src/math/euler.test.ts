import { describe, expect, it } from 'vitest';
import {
  EQS, eqOf, eulerPath, eulerAt, exactAt, accurateAt, exactPath,
  biasOf, orderTable, observedOrder, STEP_COUNTS,
  amplification, stabilityOf, stableLimit, pastTheEnd,
  CLAIMS, HEADLINE, MAIN_IDEA, ORDER_NOTE, show,
} from './euler';

const exp = eqOf('exp');
const wave = eqOf('wave');
const log = eqOf('log');
const stiff = eqOf('stiff');
const blowup = eqOf('blowup');

/* ── 真解:两条互不相干的路径 ──────────────────────────────────── */

describe('the true solution, two ways', () => {
  it('闭式和极小步长的 RK4 处处一致', () => {
    // ⭐ 一条纯代数,一条只用 f。欧拉法不参与验证 —— 它是被研究的对象。
    let compared = 0;
    for (const e of EQS) {
      for (let i = 1; i <= 8; i += 1) {
        const x = e.x0 + ((e.checkAt - e.x0) * i) / 8;
        const a = exactAt(e, x);
        const b = accurateAt(e, x);
        if (a === null || b === null) continue;
        expect(b).toBeCloseTo(a, 8);
        compared += 1;
      }
    }
    expect(compared).toBe(40); // 空转保护:5 个方程 × 8 个点
  });

  it('手推的几个值', () => {
    expect(exactAt(exp, 1)!).toBeCloseTo(Math.E, 12);
    expect(exactAt(wave, Math.PI)!).toBeCloseTo(2, 12);
    expect(exactAt(wave, (3 * Math.PI) / 2)!).toBeCloseTo(1, 12);
    expect(exactAt(stiff, 0)!).toBe(2);
    expect(exactAt(stiff, 0.1)!).toBeCloseTo(1 + Math.exp(-2), 12);
    expect(exactAt(blowup, 0.5)!).toBeCloseTo(2, 12);
    expect(exactAt(log, 2)!).toBeCloseTo(Math.log(3), 12);
  });

  it('每条闭式解都真的满足它自己的方程和初值', () => {
    const h = 1e-6;
    let checked = 0;
    for (const e of EQS) {
      expect(exactAt(e, e.x0)!).toBeCloseTo(e.y0, 12);
      for (let i = 1; i <= 5; i += 1) {
        const x = e.x0 + ((e.checkAt - e.x0) * i) / 6;
        const y = exactAt(e, x);
        const lo = exactAt(e, x - h);
        const hi = exactAt(e, x + h);
        if (y === null || lo === null || hi === null) continue;
        expect((hi - lo) / (2 * h)).toBeCloseTo(e.f(x, y), 4);
        checked += 1;
      }
    }
    expect(checked).toBe(25);
  });

  it('⭐ y′ = y² 的解到 x = 1 为止 —— 那之后是"不存在",不是"另一支"', () => {
    // ⚠️ 闭式本身在 1.2 处给得出 −5(另一支),是 `validUntil` 把它挡住的。
    expect(exactAt(blowup, 0.99)!).toBeCloseTo(100, 6);
    expect(exactAt(blowup, 1)).toBeNull();
    expect(exactAt(blowup, 1.2)).toBeNull();
    // ⚠️ 1/(1 − 1.2) = −5,是个正正经经的有限数。
    //   不挡住的话就会画出一条根本不属于这条初值问题的曲线。
    expect(blowup.exact(1.2)).toBeCloseTo(-5, 12);
  });
});

/* ── ❶ 偏差同向,不抵消 ────────────────────────────────────────── */

describe('bias', () => {
  it('⭐⭐ y′ = y 是凸的,欧拉折线**整条**在真解下方', () => {
    for (const h of [0.05, 0.1, 0.25, 0.5]) {
      expect(biasOf(exp, h)).toBe('below');
    }
  });

  it('⚠️ 而 y′ = sin x 上误差真的会抵消 —— 所以上面那条是关于方程的,不是关于方法的', () => {
    expect(biasOf(wave, 0.2)).toBe('mixed');
    expect(biasOf(wave, 0.1)).toBe('mixed');
  });

  it('⭐⭐ y′ = 1/(1+x) 是凹的,折线**整条**在真解上方', () => {
    for (const h of [0.05, 0.1, 0.25, 0.5]) {
      expect(biasOf(log, h)).toBe('above');
    }
  });

  it('⚠️ 三种偏向都有方程走得到 —— 没有写了却到不了的状态', () => {
    // 这个项目在"死界面"上栽过四次,这一条专门盯着它。
    const seen = new Set(EQS.map((e) => biasOf(e, e.hRange[0])));
    expect([...seen].sort()).toEqual(['above', 'below', 'mixed']);
  });

  it('每一步的偏低量都是正的,而且累计起来单调变大', () => {
    // "同向"这件事的直接证据:差值从头到尾不变号,而且越走越大。
    const { pts } = eulerPath(exp, 0.1);
    const diffs = pts.map(([x, y]) => y - exactAt(exp, x)!);
    expect(diffs.length).toBeGreaterThan(8);
    expect(diffs[0]).toBeCloseTo(0, 12);
    for (let i = 2; i < diffs.length; i += 1) {
      expect(diffs[i]!).toBeLessThan(0);
      expect(diffs[i]!).toBeLessThan(diffs[i - 1]!); // 越来越低
    }
  });

  it('sin x 那条上确实两边都出现过 —— mixed 不是蒙的', () => {
    const { pts } = eulerPath(wave, 0.2);
    const diffs = pts.map(([x, y]) => y - exactAt(wave, x)!);
    expect(Math.max(...diffs)).toBeGreaterThan(1e-9);
    expect(Math.min(...diffs)).toBeLessThan(-1e-9);
  });
});

/* ── ❷ 一阶:步长减半,误差只减一半 ───────────────────────────── */

describe('order', () => {
  it('⭐⭐ 比值那一列全是 2', () => {
    let seen = 0;
    for (const e of EQS) {
      for (const r of orderTable(e)) {
        if (r.ratio === null) continue;
        expect(r.ratio).toBeGreaterThan(1.7);
        expect(r.ratio).toBeLessThan(2.3);
        seen += 1;
      }
    }
    expect(seen).toBe(5 * (STEP_COUNTS.length - 1)); // 空转保护
  });

  it('量出来的阶接近 1', () => {
    for (const e of EQS) {
      const p = observedOrder(e)!;
      expect(p).toBeGreaterThan(0.85);
      expect(p).toBeLessThan(1.15);
    }
  });

  it('⚠️ 第一行没有比值 —— 不许拿 0 或者 1 冒充', () => {
    for (const e of EQS) {
      const rows = orderTable(e);
      expect(rows).toHaveLength(STEP_COUNTS.length);
      expect(rows[0]!.ratio).toBeNull();
      for (let i = 1; i < rows.length; i += 1) expect(rows[i]!.ratio).not.toBeNull();
    }
  });

  it('误差确实在变小,h 确实在减半', () => {
    for (const e of EQS) {
      const rows = orderTable(e);
      for (let i = 1; i < rows.length; i += 1) {
        expect(rows[i]!.error).toBeLessThan(rows[i - 1]!.error);
        expect(rows[i]!.h).toBeCloseTo(rows[i - 1]!.h / 2, 12);
      }
      expect(rows[0]!.h).toBeCloseTo((e.checkAt - e.x0) / STEP_COUNTS[0]!, 12);
    }
  });

  it('⭐ 误差是拿闭式量的,不是拿更小步长的欧拉法量的', () => {
    // 自己验自己就会把系统偏差一起约掉。这里直接钉住基准值。
    const truth = exactAt(exp, 1)!;
    for (const r of orderTable(exp)) {
      expect(r.error).toBeCloseTo(Math.abs(r.value - truth), 12);
      expect(r.value).toBeLessThan(truth); // 又一次:全在下方
    }
  });

  it('eulerAt 正好落在 checkAt 上', () => {
    // 手推:y′ = y、y(0) = 1、n = 1、h = 1 ⇒ 一步得 2
    expect(eulerAt(exp, 1)).toBeCloseTo(2, 12);
    // n = 2、h = 0.5 ⇒ 1 → 1.5 → 2.25
    expect(eulerAt(exp, 2)).toBeCloseTo(2.25, 12);
    // 一般地就是 (1 + 1/n)^n,经典的那个
    for (const n of [5, 20, 100]) {
      expect(eulerAt(exp, n)).toBeCloseTo((1 + 1 / n) ** n, 9);
    }
  });
});

/* ── ❸ 稳定性 ──────────────────────────────────────────────────── */

describe('stability', () => {
  it('λ 是真的 ∂f/∂y —— 不看声明,直接量', () => {
    const h = 1e-6;
    for (const e of EQS) {
      if (e.lambda === null) continue;
      for (const y of [0.5, 1.5, 2.5]) {
        const d = (e.f(0.3, y + h) - e.f(0.3, y - h)) / (2 * h);
        expect(d).toBeCloseTo(e.lambda, 5);
      }
    }
    // 空转保护:确实有方程没有常数 λ
    expect(EQS.filter((e) => e.lambda === null).map((e) => e.id)).toEqual(['blowup']);
  });

  it('⭐⭐⭐ y′ = −20(y − 1) 的门槛正好是 h = 0.1', () => {
    expect(stableLimit(stiff)).toBeCloseTo(0.1, 12);
    expect(stabilityOf(stiff, 0.05)).toBe('stable');
    expect(stabilityOf(stiff, 0.1)).toBe('marginal');
    expect(stabilityOf(stiff, 0.15)).toBe('unstable');
    expect(amplification(stiff, 0.15)!).toBeCloseTo(2, 12);
  });

  it('⚠️ marginal 是真的存在的一档,不许并进 stable', () => {
    expect(amplification(stiff, 0.1)!).toBe(1);
    expect(stabilityOf(stiff, 0.1)).not.toBe('stable');
    expect(stabilityOf(stiff, 0.1)).not.toBe('unstable');
  });

  it('⚠️ 而且滑块真的走得到这三档', () => {
    const [lo, hi, step] = stiff.hRange;
    const seen = new Set<string>();
    for (let h = lo; h <= hi + 1e-12; h += step) {
      seen.add(stabilityOf(stiff, Number(h.toFixed(6))));
    }
    expect([...seen].sort()).toEqual(['marginal', 'stable', 'unstable']);
  });

  it('⭐⭐ 不稳定时数值解**上下变号并越走越远**,而真解单调趋向 1', () => {
    const { pts } = eulerPath(stiff, 0.15);
    const offs = pts.map(([, y]) => y - 1);
    expect(offs.length).toBeGreaterThan(2);
    // 每一步乘上 (1 + hλ) = −2:符号交替,绝对值翻倍
    for (let i = 1; i < offs.length; i += 1) {
      expect(offs[i]! * offs[i - 1]!).toBeLessThan(0);         // 变号
      expect(Math.abs(offs[i]!)).toBeGreaterThan(Math.abs(offs[i - 1]!)); // 变大
    }
    // 而真解从头到尾在 1 上方,单调下降
    let prev = Number.POSITIVE_INFINITY;
    for (let i = 0; i <= 10; i += 1) {
      const t = exactAt(stiff, (0.5 * i) / 10)!;
      expect(t).toBeGreaterThan(1);
      expect(t).toBeLessThan(prev);
      prev = t;
    }
  });

  it('稳定时它老老实实地趋向 1', () => {
    const { pts } = eulerPath(stiff, 0.02);
    const offs = pts.map(([, y]) => y - 1);
    for (let i = 1; i < offs.length; i += 1) {
      expect(offs[i]!).toBeGreaterThan(0);                      // 不变号
      expect(offs[i]!).toBeLessThan(offs[i - 1]!);              // 单调靠近
    }
    expect(offs[offs.length - 1]!).toBeLessThan(0.01);
  });

  it('没有常数 λ 的方程说 n/a,不编一个数出来', () => {
    expect(amplification(blowup, 0.1)).toBeNull();
    expect(stabilityOf(blowup, 0.1)).toBe('n/a');
    expect(stableLimit(blowup)).toBeNull();
    // λ ≥ 0 的也没有上界可言
    expect(stableLimit(exp)).toBeNull();
    expect(stableLimit(wave)).toBeNull();
  });
});

/* ── ❹ 真解已经没了,而它还在答 ───────────────────────────────── */

describe('answering past the end', () => {
  it('⭐⭐⭐ 欧拉法走过 x = 1,而那里已经没有解了', () => {
    const past = pastTheEnd(blowup, 0.2);
    expect(past.length).toBeGreaterThan(0);
    for (const [x, y] of past) {
      expect(x).toBeGreaterThanOrEqual(1);
      expect(exactAt(blowup, x)).toBeNull();   // 真解不存在
      expect(Number.isFinite(y)).toBe(true);    // 而它给了个正正经经的数
      expect(y).toBeGreaterThan(0);
    }
  });

  it('⚠️ x = 1 **本身**就算过了尽头 —— 解的定义域是 [0, 1),右端开着', () => {
    // h = 0.2 时步点正好落在 1.0 上(0.2 的累加在这里是精确的)。
    // 判据写成 `x > validUntil` 的话,这一点就会被漏掉 ——
    // 而那一点恰恰是"真解已经没有了,它却给了个数"最干净的一次。
    const past = pastTheEnd(blowup, 0.2);
    const atOne = past.filter(([x]) => x === 1);
    expect(atOne).toHaveLength(1);
    expect(Number.isFinite(atOne[0]![1])).toBe(true);
    expect(exactAt(blowup, 1)).toBeNull();
    // 而 0.99 还在定义域里,不该被算进去
    expect(past.every(([x]) => x >= 1)).toBe(true);
  });

  it('其他三个方程没有"尽头"这回事', () => {
    for (const e of [exp, wave, stiff]) {
      expect(e.validUntil).toBeNull();
      expect(pastTheEnd(e, 0.1)).toEqual([]);
    }
  });

  it('真解的取样在尽头处抬笔,不硬连', () => {
    const pts = exactPath(blowup);
    expect(pts.some((q) => q === null)).toBe(true);
    for (const q of pts) {
      if (q === null) continue;
      expect(q[0]).toBeLessThan(1);
      expect(q[1]).toBeLessThanOrEqual(blowup.window[3]);
      expect(q[1]).toBeGreaterThanOrEqual(blowup.window[2]);
    }
  });
});

/* ── 走线本身 ──────────────────────────────────────────────────── */

describe('the polygon', () => {
  it('起点就是初值,步长就是 h', () => {
    for (const e of EQS) {
      const { pts } = eulerPath(e, e.hRange[0]);
      expect(pts[0]![0]).toBe(e.x0);
      expect(pts[0]![1]).toBe(e.y0);
      for (let i = 1; i < pts.length; i += 1) {
        expect(pts[i]![0] - pts[i - 1]![0]).toBeCloseTo(e.hRange[0], 9);
      }
    }
  });

  it('⭐ 每一段的斜率就是那一段**起点**上的 f —— 欧拉法的定义', () => {
    let checked = 0;
    for (const e of EQS) {
      const h = e.hRange[0];
      const { pts } = eulerPath(e, h);
      for (let i = 1; i < pts.length; i += 1) {
        const [x0, y0] = pts[i - 1]!;
        const [x1, y1] = pts[i]!;
        expect((y1 - y0) / (x1 - x0)).toBeCloseTo(e.f(x0, y0), 6);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it('⚠️ 不做自适应:给多大步长就走多大,不许偷偷替学生把步长改小', () => {
    // 这一课的主角就是"它不会喊停"。装了刹车就把要讲的东西藏起来了。
    const coarse = eulerPath(exp, 0.5).pts;
    const fine = eulerPath(exp, 0.05).pts;
    expect(coarse).toHaveLength(3);   // x = 0, 0.5, 1
    expect(fine).toHaveLength(21);
  });

  it('走出画框就停,并且说自己停了', () => {
    const big = eulerPath(stiff, 0.2);
    expect(big.cut).toBe(true);
    const ok = eulerPath(stiff, 0.02);
    expect(ok.cut).toBe(false);
    for (const [, y] of big.pts) {
      expect(y).toBeGreaterThanOrEqual(stiff.window[2]);
      expect(y).toBeLessThanOrEqual(stiff.window[3]);
    }
  });
});

/* ── 文案 ──────────────────────────────────────────────────────── */

describe('prose', () => {
  it('三个想当然各有一句纠正', () => {
    expect(CLAIMS).toHaveLength(3);
    expect(CLAIMS.map((c) => c.n)).toEqual(['1', '2', '3']);
    for (const c of CLAIMS) {
      expect(c.said.length).toBeGreaterThan(10);
      expect(c.truth.length).toBeGreaterThan(50);
    }
  });

  it('每个方程都有像样的说明', () => {
    for (const e of EQS) {
      expect(e.note.length).toBeGreaterThan(90);
      expect(e.tex.length).toBeGreaterThan(5);
      expect(e.exactTex.length).toBeGreaterThan(3);
      expect(e.checkAt).toBeGreaterThan(e.x0);
    }
    expect(new Set(EQS.map((e) => e.id)).size).toBe(EQS.length);
  });

  it('滑块范围合法,而且 h 的上下界都在画框走得完', () => {
    for (const e of EQS) {
      const [lo, hi, step] = e.hRange;
      expect(lo).toBeGreaterThan(0);
      expect(hi).toBeGreaterThan(lo);
      expect(step).toBeGreaterThan(0);
      expect(Math.round((hi - lo) / step) * step).toBeCloseTo(hi - lo, 9);
      expect(eulerPath(e, lo).pts.length).toBeGreaterThan(2);
    }
  });

  it('文案齐全', () => {
    for (const s of [HEADLINE, MAIN_IDEA, ORDER_NOTE]) expect(s.length).toBeGreaterThan(20);
    expect(ORDER_NOTE).toContain('2');
  });

  it('show 说 undefined,不印假数字', () => {
    expect(show(null)).toBe('undefined');
    expect(show(Number.NaN)).toBe('undefined');
    expect(show(Number.POSITIVE_INFINITY)).toBe('undefined');
    expect(show(2.5, 2)).toContain('2.5');
  });
});
