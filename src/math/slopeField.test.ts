import { describe, expect, it } from 'vitest';
import {
  EQS, eqOf, field, constantC, isConstantSolution, lostEquilibria,
  curveByFormula, curveByStepping, pathGap, stepTol,
  clampTo, equilibriumAt, SEPARATION,
  HEADLINE, MAIN_IDEA, FIELD_NOTE, RECOVERED, LOST, show,
} from './slopeField';

const exp = eqOf('exp');
const square = eqOf('square');
const logistic = eqOf('logistic');
const circles = eqOf('circles');
const linear = eqOf('linear');

/* ── 平衡解是真的平衡解 ────────────────────────────────────────── */

describe('equilibria', () => {
  it('每个声明的平衡解都让 f 在整条水平线上为零', () => {
    // ⚠️ 不看声明,直接代进 f 里验。
    let checked = 0;
    for (const e of EQS) {
      for (const k of e.equilibria) {
        for (let i = 0; i <= 20; i += 1) {
          const x = e.window[0] + ((e.window[1] - e.window[0]) * i) / 20;
          expect(e.f(x, k)).toBe(0);
          checked += 1;
        }
      }
    }
    expect(checked).toBe(4 * 21); // exp 1 + square 1 + logistic 2 —— 空转保护
  });

  it('没有漏掉平衡解:声明为空的方程,f 在任何水平线上都不恒为零', () => {
    for (const e of [circles, linear]) {
      expect(e.equilibria).toEqual([]);
      for (let j = 0; j <= 20; j += 1) {
        const k = e.window[2] + ((e.window[3] - e.window[2]) * j) / 20;
        const flat = [0.3, 1.1, 2.4].every((x) => e.f(x, k) === 0);
        expect(flat).toBe(false);
      }
    }
  });

  it('logistic 的两个平衡解就是 0 和 1', () => {
    expect([...logistic.equilibria].sort()).toEqual([0, 1]);
    expect(logistic.f(2, 0)).toBe(0);
    expect(logistic.f(2, 1)).toBe(0);
    expect(logistic.f(2, 0.5)).toBeCloseTo(0.25, 12);
  });
});

/* ── ⭐⭐ 这一课的支点:哪个平衡解捡得回来 ─────────────────────── */

describe('which constant solutions the general formula can produce', () => {
  it('dy/dx = y:C = 0 正好把 y = 0 补回来', () => {
    expect(constantC(exp, 0)).toBe(0);
    expect(lostEquilibria(exp)).toEqual([]);
  });

  it('⭐⭐⭐ dy/dx = y²:没有任何有限的 C 能给出 y = 0', () => {
    expect(constantC(square, 0)).toBeNull();
    expect(lostEquilibria(square)).toEqual([0]);
  });

  it('⭐⭐ logistic 一个方程演完两边', () => {
    expect(constantC(logistic, 1)).toBe(0);   // 承载量在通解里
    expect(constantC(logistic, 0)).toBeNull(); // 灭绝解不在
    expect(lostEquilibria(logistic)).toEqual([0]);
  });

  it('⚠️ 独立复核:把 C 扫一遍,看通解到底能不能变成那条常数解', () => {
    // ⭐ 不用 `cFrom`,直接在很宽的 C 上量 sup 误差。
    //   捡得回来的那些,sup 误差必须**恰好是 0**;
    //   捡不回来的那些,再大的 C 也只能压小它,永远压不到 0。
    const supError = (e: typeof exp, k: number, C: number): number => {
      let worst = 0;
      for (let i = 0; i <= 30; i += 1) {
        const x = e.window[0] + ((e.window[1] - e.window[0]) * i) / 30;
        const v = e.family(x, C);
        if (v === null || !Number.isFinite(v)) return Number.POSITIVE_INFINITY;
        worst = Math.max(worst, Math.abs(v - k));
      }
      return worst;
    };
    const best = (e: typeof exp, k: number): number => {
      let b = Number.POSITIVE_INFINITY;
      for (const C of [0, 1e-9, -1e-9, 1, -1, 10, -10, 1e3, -1e3, 1e6, -1e6, 1e12, -1e12]) {
        b = Math.min(b, supError(e, k, C));
      }
      return b;
    };
    expect(best(exp, 0)).toBe(0);
    expect(best(logistic, 1)).toBe(0);
    // ⭐ 这两条是整课的分量所在:最好的 C 也只能"接近",到不了。
    expect(best(square, 0)).toBeGreaterThan(0);
    expect(best(logistic, 0)).toBeGreaterThan(0);
    // 而且确实是"越大的 C 越接近" —— 说明它是极限,不是别的毛病
    expect(supError(square, 0, 1e6)).toBeLessThan(supError(square, 0, 1e3));
    expect(supError(square, 0, 1e6)).toBeGreaterThan(0);
  });

  it('⭐⭐⭐ "处处差不到 1e−9" 依然不是"等于" —— 判据放宽,这一课就没了', () => {
    // y = −1/(x + C) 取 C = 10⁹ 时,在整个画框上都落在 −1e−9 附近,
    // 可它**不是**那条常数解。把 `!==` 换成"差 < 1e−6",下面这条就会翻。
    const k = -1e-9;
    const C = square.cFrom([0, k])!;
    expect(C).toBeCloseTo(1e9, 0);
    expect(isConstantSolution(square, k, C)).toBe(false);
    // 而它确实处处接近 —— 所以这不是"差得远"混过去的
    for (const x of [-3, -1, 0, 1, 3]) {
      expect(Math.abs(square.family(x, C)! - k)).toBeLessThan(1e-14);
    }
    expect(constantC(square, k)).toBeNull();
  });

  it('⚠️ cFrom 给得出 C 不等于那条曲线就是常数解 —— 检查不许跳过', () => {
    // −x/y 过 (0, 2) 的 C 是 4,有限得很;而 √(4 − x²) 只在 x = 0 处等于 2。
    expect(circles.cFrom([0, 2])).toBe(4);
    expect(isConstantSolution(circles, 2, 4)).toBe(false);
    expect(constantC(circles, 2)).toBeNull();
    // 真的是常数解时它必须点头
    expect(isConstantSolution(exp, 0, 0)).toBe(true);
    expect(isConstantSolution(logistic, 1, 0)).toBe(true);
  });

  it('⚠️ 初值正好落在丢掉的那个解上时,cFrom 说 null —— 不许编一个 C 出来', () => {
    expect(square.cFrom([0, 0])).toBeNull();
    expect(logistic.cFrom([0, 0])).toBeNull();
    // 而没丢的那个给得出 C
    expect(exp.cFrom([0, 0])).toBe(0);
    expect(logistic.cFrom([0, 1])).toBe(0);
  });

  it('cFrom 在一般点上真的解出了穿过该点的那条曲线', () => {
    let seen = 0;
    for (const e of EQS) {
      for (const p of e.starts) {
        const C = e.cFrom(p);
        if (C === null) continue;
        const y = e.family(p[0], C);
        expect(y).not.toBeNull();
        expect(y!).toBeCloseTo(p[1], 9);
        seen += 1;
      }
    }
    expect(seen).toBeGreaterThan(12); // 空转保护
  });
});

/* ── 斜率场 ────────────────────────────────────────────────────── */

describe('slope field', () => {
  it('⚠️ 每一段都是单位长 —— 线段长度不许随斜率变', () => {
    let seen = 0;
    for (const e of EQS) {
      for (const t of field(e)) {
        if (t.dir === null) continue;
        expect(Math.hypot(t.dir[0], t.dir[1])).toBeCloseTo(1, 12);
        seen += 1;
      }
    }
    expect(seen).toBeGreaterThan(1000);
  });

  it('方向和斜率对得上:dir 的 y/x 就是 f', () => {
    for (const e of EQS) {
      for (const t of field(e)) {
        if (t.dir === null || t.slope === null) continue;
        expect(t.dir[1] / t.dir[0]).toBeCloseTo(t.slope, 9);
        expect(t.dir[0]).toBeGreaterThan(0); // 一律朝右,免得同一个方向画成两种
      }
    }
  });

  it('⭐⭐ −x/y 那一课的 y = 0 一行确实是空的 —— 那个分支走得到', () => {
    // 这一条同时钉住"窗口必须对称、ny 必须是奇数"。
    const ticks = field(circles);
    const holes = ticks.filter((t) => t.dir === null);
    expect(holes.length).toBeGreaterThan(0);
    for (const h of holes) expect(h.at[1]).toBe(0);
    expect(holes).toHaveLength(17); // 一整行,nx = 17
    expect(holes.every((h) => h.slope === null)).toBe(true);
  });

  it('其他方程处处有方向', () => {
    for (const e of [exp, square, logistic, linear]) {
      expect(field(e).every((t) => t.dir !== null)).toBe(true);
    }
  });

  it('格点都在画框里', () => {
    for (const e of EQS) {
      const [x0, x1, y0, y1] = e.window;
      for (const t of field(e)) {
        expect(t.at[0]).toBeGreaterThan(x0);
        expect(t.at[0]).toBeLessThan(x1);
        expect(t.at[1]).toBeGreaterThanOrEqual(y0);
        expect(t.at[1]).toBeLessThanOrEqual(y1);
      }
    }
  });

  it('平衡解那一行的方向是水平的 —— 常数解在场里看得见', () => {
    let seen = 0;
    for (const e of [exp, square, logistic]) {
      for (const k of e.equilibria) {
        const s = e.f(1.3, k);
        expect(s).toBe(0);
        seen += 1;
      }
    }
    expect(seen).toBe(4);
  });
});

/* ── 两条互不相干的路径 ────────────────────────────────────────── */

describe('path ① (algebra) and path ② (stepping the directions) agree', () => {
  it('每个方程的每个初值上都对得上', () => {
    // ⚠️ 阈值不是拍的:用**步进器自己声明的容差**。
    //   它承诺每一步都解析到 `stepTol`,那么两条路径至少要好到这个程度。
    let compared = 0;
    for (const e of EQS) {
      for (const p of e.starts) {
        const gap = pathGap(e, p);
        if (gap === null) continue; // 平衡解上没有 C,单独测
        expect(gap).toBeLessThan(stepTol(e));
        compared += 1;
      }
    }
    expect(compared).toBeGreaterThan(12); // 空转保护
  });

  it('⭐ 曲线光滑的那四个方程,两条路径好到 1e-9 以内', () => {
    // ⚠️ 单独留出 `circles`:它的解曲线会转成竖直,
    //   在那附近"等距的 x"是最糟糕的参数化,误差理应大一些(实测 ~6e−6)。
    //   把它和光滑的那些混在一条断言里,阈值就得放宽到谁也测不出问题。
    let compared = 0;
    for (const e of EQS) {
      if (e.id === 'circles') continue;
      for (const p of e.starts) {
        const gap = pathGap(e, p);
        if (gap === null) continue;
        expect(gap).toBeLessThan(1e-9);
        compared += 1;
      }
    }
    expect(compared).toBe(14); // 空转保护:exp 4 + square 3 + logistic 4 + linear 3
  });

  it('⚠️ 空转保护:pathGap 真的比过东西,不是一步没走就返回 0', () => {
    const walked = curveByStepping(logistic, [0, 0.5]);
    expect(walked.length).toBeGreaterThan(500);
    expect(pathGap(logistic, [0, 0.5])).toBeGreaterThan(0);
  });

  it('⚠️ 重叠不够时 pathGap 说 null,不说"验过了"', () => {
    // 要一个比实际重叠还多的点数,那条守卫就必须开口。
    expect(pathGap(logistic, [0, 0.5], 1e9)).toBeNull();
    expect(pathGap(logistic, [0, 0.5], 10)).not.toBeNull();
  });

  it('⭐ pathGap 取的是**最大**差,不是最后一个点的差', () => {
    // y² 过 (0, −1):峰值出现在中途,是末点的三千多倍。
    const p: readonly [number, number] = [0, -1];
    const C = square.cFrom(p)!;
    const walked = curveByStepping(square, p);
    const errs = walked
      .map(([x, y]) => {
        const v = square.family(x, C);
        return v === null || !Number.isFinite(v) ? null : Math.abs(v - y);
      })
      .filter((z): z is number => z !== null);
    expect(errs.length).toBeGreaterThan(100);
    const max = Math.max(...errs);
    const last = errs[errs.length - 1]!;
    expect(max).toBeGreaterThan(last * 100); // 两者真的差得远
    expect(pathGap(square, p)).toBe(max);    // 而取的是 max
  });

  it('⭐ 数值那条路在丢掉的解上照样走得通 —— 那个解本来就存在', () => {
    // 代数那条路在这里交白卷(没有 C),而方向场从来没出过问题。
    expect(square.cFrom([0, 0])).toBeNull();
    expect(curveByFormula(square, [0, 0])).toEqual([]);
    const walked = curveByStepping(square, [0, 0]);
    expect(walked.length).toBeGreaterThan(500);
    for (const [, y] of walked) expect(y).toBe(0); // 真的是那条水平线
  });

  it('logistic 的灭绝解同样:走得出来,却不在通解里', () => {
    expect(curveByFormula(logistic, [0, 0])).toEqual([]);
    const walked = curveByStepping(logistic, [0, 0]);
    expect(walked.length).toBeGreaterThan(500);
    for (const [, y] of walked) expect(y).toBe(0);
  });

  it('⭐ 而承载量 y = 1 两条路都给得出来', () => {
    expect(logistic.cFrom([0, 1])).toBe(0);
    const byFormula = curveByFormula(logistic, [0, 1]).filter((p) => p !== null);
    expect(byFormula.length).toBeGreaterThan(300);
    for (const p of byFormula) expect(p![1]).toBeCloseTo(1, 12);
    expect(pathGap(logistic, [0, 1])).toBeLessThan(1e-9);
  });
});

describe('solution curves that end', () => {
  it('⭐ −x/y:解曲线在圆转竖直的地方停住,不会硬撑到画框边', () => {
    const walked = curveByStepping(circles, [0, 2]);
    const xs = walked.map((p) => p[0]);
    // 圆 x² + y² = 4 在 x = ±2 处碰到 y = 0,而画框到 ±3
    expect(Math.min(...xs)).toBeGreaterThan(-2.05);
    expect(Math.max(...xs)).toBeLessThan(2.05);
    expect(Math.max(...xs)).toBeGreaterThan(1.9); // 确实走到了头附近
    for (const [x, y] of walked) {
      expect(Math.abs(x * x + y * y - 4)).toBeLessThan(1e-5); // 全程在那个圆上
      expect(y).toBeGreaterThan(0);
    }
  });

  it('走出画框就停,不会画出一条冲天的假边', () => {
    for (const e of EQS) {
      const [x0, x1, y0, y1] = e.window;
      for (const p of e.starts) {
        for (const [x, y] of curveByStepping(e, p)) {
          expect(x).toBeGreaterThanOrEqual(x0 - 1e-9);
          expect(x).toBeLessThanOrEqual(x1 + 1e-9);
          expect(y).toBeGreaterThanOrEqual(y0 - 1e-9);
          expect(y).toBeLessThanOrEqual(y1 + 1e-9);
        }
      }
    }
  });

  it('代数那条路也一样:出框抬笔,不硬连', () => {
    // y = −1/(x + C) 在 x = −C 处爆掉,两支不许连起来
    const pts = curveByFormula(square, [0, 1]);
    expect(pts.some((p) => p === null)).toBe(true);
    for (const p of pts) {
      if (p === null) continue;
      expect(p[1]).toBeGreaterThanOrEqual(square.window[2]);
      expect(p[1]).toBeLessThanOrEqual(square.window[3]);
    }
  });
});

/* ── 手推的闭式 ────────────────────────────────────────────────── */

describe('closed forms, checked by hand', () => {
  it('dy/dx = y 过 (0, 1) 的解是 e^x', () => {
    expect(exp.cFrom([0, 1])).toBe(1);
    expect(exp.family(1, 1)!).toBeCloseTo(Math.E, 12);
    expect(exp.family(-1, 1)!).toBeCloseTo(1 / Math.E, 12);
  });

  it('dy/dx = y² 过 (0, 1) 的解是 1/(1 − x),在 x = 1 处爆掉', () => {
    const C = square.cFrom([0, 1])!;
    expect(C).toBe(-1);
    expect(square.family(0.5, C)!).toBeCloseTo(2, 12);
    expect(square.family(1, C)).toBeNull();
  });

  it('logistic 过 (0, 0.5) 的解是 1/(1 + e^{−x})', () => {
    expect(logistic.cFrom([0, 0.5])).toBe(1);
    expect(logistic.family(0, 1)!).toBeCloseTo(0.5, 12);
    expect(logistic.family(100, 1)!).toBeCloseTo(1, 9);   // 趋向承载量
    expect(logistic.family(-100, 1)!).toBeCloseTo(0, 9);  // 趋向灭绝,但到不了
    expect(logistic.family(-100, 1)!).toBeGreaterThan(0);
  });

  it('dy/dx = x − y 过 (0, 2) 的解是 x − 1 + 3e^{−x}', () => {
    expect(linear.cFrom([0, 2])).toBe(3);
    expect(linear.family(0, 3)!).toBeCloseTo(2, 12);
    // 代回方程验一遍:y′ 应该等于 x − y
    const h = 1e-6;
    const dy = (linear.family(1 + h, 3)! - linear.family(1 - h, 3)!) / (2 * h);
    expect(dy).toBeCloseTo(linear.f(1, linear.family(1, 3)!)!, 6);
  });

  it('每条通解都真的满足它自己的方程', () => {
    // ⭐ 最硬的一条:把 family 代回 dy/dx = f(x, y),两边必须相等。
    let checked = 0;
    const h = 1e-6;
    for (const e of EQS) {
      for (const p of e.starts) {
        const C = e.cFrom(p);
        if (C === null) continue;
        for (const x of [-0.7, 0.2, 0.9]) {
          const y = e.family(x, C);
          const lo = e.family(x - h, C);
          const hi = e.family(x + h, C);
          if (y === null || lo === null || hi === null) continue;
          const rhs = e.f(x, y);
          if (rhs === null || Math.abs(rhs) > 50) continue;
          expect((hi - lo) / (2 * h)).toBeCloseTo(rhs, 4);
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(25); // 空转保护
  });
});

/* ── 小工具与文案 ──────────────────────────────────────────────── */

describe('helpers and prose', () => {
  it('clampTo 把点夹回框里,遇到脏数据给中点', () => {
    expect(clampTo(exp, [99, 99])).toEqual([3, 3]);
    expect(clampTo(exp, [-99, -99])).toEqual([-3, -3]);
    expect(clampTo(exp, [1, 2])).toEqual([1, 2]);
    expect(clampTo(exp, [Number.NaN, 1])).toEqual([0, 1]);
  });

  it('equilibriumAt 认得出落在平衡解上的点', () => {
    expect(equilibriumAt(logistic, [0, 0])).toBe(0);
    expect(equilibriumAt(logistic, [3, 1])).toBe(1);
    expect(equilibriumAt(logistic, [0, 0.5])).toBeNull();
    expect(equilibriumAt(linear, [0, 0])).toBeNull(); // 它根本没有平衡解
  });

  it('⭐ 分离变量的四步里,只有第二步有代价 —— 而它必须被标出来', () => {
    expect(SEPARATION).toHaveLength(4);
    const costly = SEPARATION.filter((s) => s.cost !== null);
    expect(costly).toHaveLength(1);
    expect(costly[0]!.n).toBe('2');
    expect(costly[0]!.what).toContain('divide');
    expect(costly[0]!.cost!.length).toBeGreaterThan(40);
  });

  it('每个方程都有像样的说明和公式', () => {
    for (const e of EQS) {
      expect(e.note.length).toBeGreaterThan(80);
      expect(e.tex.length).toBeGreaterThan(5);
      expect(e.familyTex.length).toBeGreaterThan(3);
      expect(e.starts.length).toBeGreaterThan(2);
    }
    expect(new Set(EQS.map((e) => e.id)).size).toBe(EQS.length);
  });

  it('恰好有一个方程是分不了离的 —— "场不在乎你会不会解"那条线索有着落', () => {
    expect(EQS.filter((e) => !e.separable)).toHaveLength(1);
    expect(linear.separable).toBe(false);
  });

  it('文案齐全', () => {
    for (const s of [HEADLINE, MAIN_IDEA, FIELD_NOTE, RECOVERED, LOST]) {
      expect(s.length).toBeGreaterThan(10);
    }
    expect(RECOVERED).not.toBe(LOST);
  });

  it('show 说 undefined,不印假数字', () => {
    expect(show(null)).toBe('undefined');
    expect(show(Number.NaN)).toBe('undefined');
    expect(show(Number.POSITIVE_INFINITY)).toBe('undefined');
    expect(show(2.5, 2)).toContain('2.5');
  });
});
