/**
 * ⚠️ 期望值是**手推的闭式**,不从被测模块取:
 *   · 圆 `r = 1`:面积 `π`,而 `∫r dθ = 2π` —— 那是周长;
 *   · 心形线 `r = 1 + cos θ`:面积 `3π/2`;
 *   · 四瓣玫瑰 `r = 2cos 2θ`:一瓣 `πa²/8`,四瓣 `πa²/2 = 2π`。
 */
import { describe, expect, it } from 'vitest';
import {
  POLAR_CURVES,
  areaByIntegral,
  areaByShoelace,
  clampTheta,
  polarOf,
  reach,
  runningArea,
  samplePolar,
  show,
  toXY,
  wedgeArea,
  wedgePath,
  wedgeRatio,
  wrongIntegral,
  wrongWedge,
} from './polar';

const circle = polarOf('circle');
const card = polarOf('cardioid');
const rose = polarOf('rose');

describe('扇形 vs 矩形', () => {
  it('扇形面积就是 ½r²dθ', () => {
    expect(wedgeArea(2, 0.1)).toBeCloseTo(0.5 * 4 * 0.1, 12);
    expect(wedgeArea(1, Math.PI)).toBeCloseTo(Math.PI / 2, 12);
    // ⭐ 整整一圈就是 πr²
    expect(wedgeArea(3, 2 * Math.PI)).toBeCloseTo(Math.PI * 9, 12);
  });

  it('⚠️ 那条错的就是弧长,不是面积', () => {
    // 半径 r、角 dθ 的弧长正是 r·dθ
    expect(wrongWedge(3, 0.2)).toBeCloseTo(0.6, 12);
    expect(wrongWedge(1, 2 * Math.PI)).toBeCloseTo(2 * Math.PI, 12);   // 单位圆周长
  });

  it('⭐⭐ 两者之比是 ½r —— 所以 r = 2 时它们**恰好相等**', () => {
    expect(wedgeRatio(2)).toBeCloseTo(1, 12);
    expect(wedgeArea(2, 0.3)).toBeCloseTo(wrongWedge(2, 0.3), 12);
    // 而别的半径上差得很明显
    expect(wedgeRatio(1)).toBeCloseTo(0.5, 12);
    expect(wedgeRatio(4)).toBeCloseTo(2, 12);
  });

  it('⭐⭐⭐ 因此圆的半径**绝不能设成 2** —— 那样反例会自己消失', () => {
    expect(circle.r(0), '圆的半径设成 2 的话,π·2² 和 2π·2 都是 4π,反例没了')
      .not.toBeCloseTo(2, 6);
    // 而现在这个半径上,正确与错误的答案差整整一倍
    expect(wrongIntegral(circle) / areaByIntegral(circle)).toBeCloseTo(2, 3);
  });
});

describe('⭐⭐ 两条路径算同一块面积', () => {
  it('每条曲线上,极坐标积分 = 鞋带公式 = 手推的闭式', () => {
    let checked = 0;
    for (const c of POLAR_CURVES) {
      expect(areaByIntegral(c), `${c.id} 积分`).toBeCloseTo(c.exactArea, 4);
      expect(areaByShoelace(c), `${c.id} 鞋带`).toBeCloseTo(c.exactArea, 3);
      checked += 1;
    }
    expect(checked, '循环空转了').toBe(3);
  });

  it('手推的那几个数就是课本上的', () => {
    expect(circle.exactArea).toBeCloseTo(Math.PI, 12);
    expect(card.exactArea).toBeCloseTo((3 * Math.PI) / 2, 12);
    expect(rose.exactArea).toBeCloseTo(2 * Math.PI, 12);
  });

  it('⭐ 分段积分加起来等于整块', () => {
    const [lo, hi] = card.sweep;
    const mid = (lo + hi) / 2;
    expect(areaByIntegral(card, lo, mid) + areaByIntegral(card, mid, hi))
      .toBeCloseTo(areaByIntegral(card), 6);
  });

  it('取样点数变了,答案不变', () => {
    for (const c of POLAR_CURVES) {
      expect(areaByIntegral(c, undefined, undefined, 4000))
        .toBeCloseTo(areaByIntegral(c, undefined, undefined, 40_000), 4);
    }
  });
});

describe('⭐⭐⭐ 反例:错的公式连量纲都不对', () => {
  it('单位圆上,∫r dθ 给出的是 2π —— 那是周长', () => {
    expect(wrongIntegral(circle)).toBeCloseTo(2 * Math.PI, 4);
    expect(areaByIntegral(circle)).toBeCloseTo(Math.PI, 4);
    // ⭐ 而 2π 正是这个圆的周长
    expect(wrongIntegral(circle)).toBeCloseTo(2 * Math.PI * 1, 4);
  });

  it('⭐ 三条曲线上错的公式都给出不一样的数', () => {
    for (const c of POLAR_CURVES) {
      const right = areaByIntegral(c);
      const wrong = wrongIntegral(c);
      expect(Math.abs(right - wrong), `${c.id} 上两条公式给出的数太接近了`)
        .toBeGreaterThan(0.2);
    }
  });

  it('⭐ 心形线上错的公式恰好给出 2π —— 也不是它的面积', () => {
    // ∫₀^{2π}(1 + cos θ)dθ = 2π
    expect(wrongIntegral(card)).toBeCloseTo(2 * Math.PI, 4);
    expect(card.exactArea).toBeCloseTo((3 * Math.PI) / 2, 6);
  });
});

describe('负半径', () => {
  it('⭐ 玫瑰线的 r 确实会变负', () => {
    let neg = 0;
    for (let i = 0; i < 400; i += 1) {
      if (rose.r((2 * Math.PI * i) / 400) < -1e-9) neg += 1;
    }
    expect(neg, '一次都没变负的话,四瓣就长不出来').toBeGreaterThan(100);
  });

  it('⭐ 负半径把点甩到对面去', () => {
    const [x, y] = toXY(-1, 0);
    expect(x).toBeCloseTo(-1, 12);
    expect(y).toBeCloseTo(0, 12);
  });

  it('⭐⭐ 而 r² 抹掉符号,所以那几段照样贡献正面积', () => {
    // 玫瑰线四瓣合计 2π,而它有一半的角度上 r < 0
    expect(areaByIntegral(rose)).toBeCloseTo(2 * Math.PI, 4);
    // 圆和心形线的 r 不变负
    for (let i = 0; i < 200; i += 1) {
      expect(circle.r((2 * Math.PI * i) / 200)).toBeGreaterThan(0);
      expect(card.r((2 * Math.PI * i) / 200)).toBeGreaterThanOrEqual(-1e-12);
    }
  });
});

describe('累计', () => {
  it('扫完整圈,累计值就是总面积', () => {
    for (const c of POLAR_CURVES) {
      const run = runningArea(c, c.sweep[1], 4000);
      expect(run[run.length - 1]!.right, c.id).toBeCloseTo(c.exactArea, 2);
    }
  });

  it('⭐ 正确那条单调不减 —— 面积只会越扫越多', () => {
    const run = runningArea(card, card.sweep[1], 500);
    let grew = 0;
    for (let i = 1; i < run.length; i += 1) {
      expect(run[i]!.right).toBeGreaterThanOrEqual(run[i - 1]!.right - 1e-12);
      grew += 1;
    }
    // ⚠️ runningArea(n) 返回 **n + 1** 个点(i 从 0 到 n),所以从 1 起的循环跑 n 次
    expect(grew, '循环空转了').toBe(500);
  });

  it('⭐ 而错的那条在玫瑰线上会**往回走** —— 因为 r 变负了', () => {
    const run = runningArea(rose, rose.sweep[1], 500);
    let wentBack = 0;
    for (let i = 1; i < run.length; i += 1) {
      if (run[i]!.wrong < run[i - 1]!.wrong - 1e-9) wentBack += 1;
    }
    expect(wentBack, '面积怎么会越扫越少 —— 这正说明那条公式算的不是面积')
      .toBeGreaterThan(50);
  });

  it('第一项是零', () => {
    const run = runningArea(circle, circle.sweep[1]);
    expect(run[0]!.right).toBe(0);
    expect(run[0]!.wrong).toBe(0);
    expect(run[0]!.theta).toBeCloseTo(circle.sweep[0], 12);
  });
});

describe('画图用的量', () => {
  it('取样都是有限值', () => {
    for (const c of POLAR_CURVES) {
      const pts = samplePolar(c);
      expect(pts.length).toBeGreaterThan(1000);
      for (const p of pts) {
        expect(Number.isFinite(p[0])).toBe(true);
        expect(Number.isFinite(p[1])).toBe(true);
      }
    }
  });

  it('⭐ 画框把整条曲线装得下,而且留了余量', () => {
    for (const c of POLAR_CURVES) {
      const R = reach(c);
      let far = 0;
      for (const p of samplePolar(c, 400)) far = Math.max(far, Math.hypot(p[0], p[1]));
      expect(R).toBeGreaterThan(far);
      expect(R - far, `${c.id} 贴边了`).toBeGreaterThan(far * 0.05);
    }
  });

  it('扇形的边界从原点出发、回到原点', () => {
    const w = wedgePath(card, 0.5, 0.3);
    expect(w[0]).toEqual([0, 0]);
    expect(w[w.length - 1]).toEqual([0, 0]);
    expect(w.length).toBeGreaterThan(10);
  });

  it('⭐ 扇形的多边形面积 ≈ ½r²dθ —— 画出来的和算出来的是同一个东西', () => {
    const th = 0.7;
    const d = 0.02;
    const w = wedgePath(card, th, d, 200);
    let s = 0;
    for (let i = 0; i < w.length - 1; i += 1) {
      s += w[i]![0] * w[i + 1]![1] - w[i + 1]![0] * w[i]![1];
    }
    const drawn = Math.abs(s) / 2;
    expect(drawn).toBeCloseTo(wedgeArea(card.r(th + d / 2), d), 4);
  });

  it('clampTheta 夹在自己的范围里', () => {
    expect(clampTheta(card, 99)).toBe(card.sweep[1]);
    expect(clampTheta(card, -99)).toBe(card.sweep[0]);
    expect(clampTheta(card, Number.NaN)).toBe(card.startTheta);
  });

  it('show 不吐 NaN', () => {
    expect(show(null)).toBe('undefined');
    expect(show(Number.NaN)).toBe('undefined');
    expect(show(Number.POSITIVE_INFINITY)).toBe('undefined');
  });

  it('每条曲线都有说明和精确值', () => {
    for (const c of POLAR_CURVES) {
      expect(c.note.length).toBeGreaterThan(80);
      expect(c.exactTex.length).toBeGreaterThan(2);
      expect(c.startTheta).toBeGreaterThanOrEqual(c.sweep[0]);
      expect(c.startTheta).toBeLessThanOrEqual(c.sweep[1]);
    }
  });
});

describe('⚠️ 变异测试逼出来的一条:得钉住**形状**,不只是面积', () => {
  /**
   * ⚠️ 把玫瑰 `r = 2cos 2θ` 换成 `r = 2cos θ` 竟然全绿 ——
   *   后者是个半径 1、圆心在 (1,0) 的圆,而它在 0..2π 上被**画了两遍**
   *   (负半径那半圈正好落回同一个圆),于是积分照样是 2π,鞋带也是 2π。
   *   **两条独立路径都对,面积也对,可那根本不是同一条曲线。**
   * ⭐ 面积相同不等于图形相同。得另外钉一条**结构性**的性质。
   *   最省事的是数它穿过原点几次:四瓣玫瑰穿四次,那个圆只穿两次。
   */
  const zerosOf = (c: typeof rose, n = 20_000) => {
    let count = 0;
    let prev = c.r(c.sweep[0]);
    for (let i = 1; i <= n; i += 1) {
      const th = c.sweep[0] + ((c.sweep[1] - c.sweep[0]) * i) / n;
      const cur = c.r(th);
      if ((prev < 0 && cur >= 0) || (prev > 0 && cur <= 0)) count += 1;
      prev = cur;
    }
    return count;
  };

  it('⭐⭐ 四瓣玫瑰穿过原点**四次** —— 这是它有四瓣的原因', () => {
    expect(zerosOf(rose)).toBe(4);
  });

  it('⭐ 而圆一次都不穿,心形线只穿一次(在 θ = π 的尖点)', () => {
    expect(zerosOf(circle)).toBe(0);
    expect(zerosOf(card)).toBe(1);
    expect(card.r(Math.PI)).toBeCloseTo(0, 12);
  });

  it('⭐ 玫瑰的零点就在 π/4 的奇数倍上', () => {
    for (const k of [1, 3, 5, 7]) {
      expect(rose.r((k * Math.PI) / 4)).toBeCloseTo(0, 12);
    }
    // 而在瓣的正中间取到最大半径
    for (const k of [0, 1, 2, 3]) {
      expect(Math.abs(rose.r((k * Math.PI) / 2))).toBeCloseTo(2, 12);
    }
  });

  it('⭐ 曲线也不该自己重复走一遍 —— 四瓣各走一次', () => {
    // 半径为正的角度总长应当是整圈的一半(四段各 π/4)
    let pos = 0;
    const n = 20_000;
    for (let i = 0; i < n; i += 1) {
      if (rose.r((2 * Math.PI * i) / n) > 0) pos += 1;
    }
    expect(pos / n).toBeCloseTo(0.5, 2);
  });
});

describe('⭐⭐⭐ 截图才注意到的那个更狠的反例:玫瑰上错公式总和为 0', () => {
  /**
   * ⚠️ 这一条是把图画出来之后才看见的:
   *   `∫₀^{2π} 2cos 2θ dθ = [sin 2θ]₀^{2π} = 0`。
   *   一个明摆着有四瓣的图形,"面积"算出来是 **0**。
   *   比圆那个"算出周长"还要刺眼 —— 至少周长还是个正数。
   */
  it('玫瑰上 ∫r dθ 恰好是 0', () => {
    expect(wrongIntegral(rose)).toBeCloseTo(0, 4);
  });

  it('⭐ 而它的真实面积明明是 2π —— 差得不能再远了', () => {
    expect(areaByIntegral(rose)).toBeCloseTo(2 * Math.PI, 4);
    expect(Math.abs(areaByIntegral(rose) - wrongIntegral(rose))).toBeGreaterThan(6);
  });

  it('⭐ 原因是正负抵消 —— 半径为正和为负的两段,r dθ 各自不为零', () => {
    // 前四分之一圈 r > 0,那一段的 ∫r dθ 明显为正
    const firstQuarter = wrongIntegral(rose, 0, Math.PI / 4);
    expect(firstQuarter).toBeGreaterThan(0.9);
    // 紧接着那一段 r < 0,积出来为负,把它抵消掉
    const second = wrongIntegral(rose, Math.PI / 4, (3 * Math.PI) / 4);
    expect(second).toBeLessThan(-1.9);
  });

  it('⭐ 而正确的公式在同样两段上都为正 —— r² 抹掉了符号', () => {
    expect(areaByIntegral(rose, 0, Math.PI / 4)).toBeGreaterThan(0);
    expect(areaByIntegral(rose, Math.PI / 4, (3 * Math.PI) / 4)).toBeGreaterThan(0);
  });

  it('⭐ 圆和心形线上错公式不为零 —— 这条分支不是只为玫瑰写的', () => {
    expect(Math.abs(wrongIntegral(circle))).toBeGreaterThan(1);
    expect(Math.abs(wrongIntegral(card))).toBeGreaterThan(1);
  });
});
