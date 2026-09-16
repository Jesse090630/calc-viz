/**
 * ⚠️ 期望值不从被测模块里取,锚点是**手推的闭式**:
 *
 *   · 椭圆 `x = 3cos t, y = 2sin t`:`dy/dx = −(2/3)cot t`,`d²y/dx² = −2/(9 sin³t)`;
 *     (第二条由 `y = 2√(1 − x²/9)` 直接对 x 求两次导也能得到,和参数那条路无关。)
 *   · 旋轮线 `x = t − sin t, y = 1 − cos t`:`dy/dx = cot(t/2)`;
 *   · `x = t², y = t³`:`dy/dx = 3t/2`,`d²y/dx² = 3/(4t)`。
 */
import { describe, expect, it } from 'vitest';
import {
  CURVES,
  bounds,
  clampT,
  curveOf,
  naiveSecond,
  samplePath,
  secondBySecant,
  secondDeriv,
  show,
  slope,
  slopeBySecant,
  speed,
  stateAt,
} from './parametric';

const ell = curveOf('ellipse');
const cyc = curveOf('cycloid');
const cus = curveOf('cusp');

describe('曲线本身:参数式和它自己的导数对得上', () => {
  it('⭐ 解析一阶导 = x(t)、y(t) 的中心差商', () => {
    const h = 1e-6;
    let checked = 0;
    for (const c of CURVES) {
      const [lo, hi] = c.tRange;
      for (let i = 1; i < 30; i += 1) {
        const t = lo + ((hi - lo) * i) / 30;
        expect(c.dx(t), `${c.id} dx at ${t}`)
          .toBeCloseTo((c.x(t + h) - c.x(t - h)) / (2 * h), 4);
        expect(c.dy(t), `${c.id} dy at ${t}`)
          .toBeCloseTo((c.y(t + h) - c.y(t - h)) / (2 * h), 4);
        checked += 1;
      }
    }
    expect(checked, '循环空转了').toBe(87);
  });

  it('⭐ 解析二阶导也对得上', () => {
    const h = 1e-4;
    for (const c of CURVES) {
      const [lo, hi] = c.tRange;
      for (let i = 1; i < 20; i += 1) {
        const t = lo + ((hi - lo) * i) / 20;
        expect(c.d2x(t), `${c.id} d2x at ${t}`)
          .toBeCloseTo((c.x(t + h) - 2 * c.x(t) + c.x(t - h)) / (h * h), 3);
        expect(c.d2y(t), `${c.id} d2y at ${t}`)
          .toBeCloseTo((c.y(t + h) - 2 * c.y(t) + c.y(t - h)) / (h * h), 3);
      }
    }
  });

  it('⭐⭐ 每个标记点都**落在滑块范围之内** —— 点不到的例外等于没有', () => {
    for (const c of CURVES) {
      expect(c.marks.length).toBeGreaterThan(0);
      for (const m of c.marks) {
        expect(m.t, `${c.id} 的标记 ${m.t} 在范围外`).toBeGreaterThanOrEqual(c.tRange[0]);
        expect(m.t).toBeLessThanOrEqual(c.tRange[1]);
        expect(m.why.length).toBeGreaterThan(15);
      }
      expect(c.startT).toBeGreaterThanOrEqual(c.tRange[0]);
      expect(c.startT).toBeLessThanOrEqual(c.tRange[1]);
    }
  });
});

describe('⭐⭐ 斜率:两条路径必须一致', () => {
  it('解析商 = 曲线上的割线斜率', () => {
    let checked = 0;
    for (const c of CURVES) {
      const [lo, hi] = c.tRange;
      for (let i = 1; i < 40; i += 1) {
        const t = lo + ((hi - lo) * i) / 40;
        const a = slope(c, t);
        const b = slopeBySecant(c, t);
        if (a === null || b === null) continue;
        // 靠近竖直切线时割线本身很陡,用相对容差
        expect(Math.abs(a - b) / Math.max(1, Math.abs(a)), `${c.id} at t=${t}`).toBeLessThan(1e-3);
        checked += 1;
      }
    }
    expect(checked, '循环空转了').toBeGreaterThan(90);
  });

  it('椭圆的斜率就是 −(2/3)cot t —— 手推的', () => {
    for (const t of [0.3, 0.8, Math.PI / 4, 2.0, 4.1]) {
      expect(slope(ell, t)!).toBeCloseTo(-(2 / 3) / Math.tan(t), 9);
    }
  });

  it('旋轮线的斜率就是 cot(t/2)', () => {
    for (const t of [0.7, 1.5, 2.6, 4.0]) {
      expect(slope(cyc, t)!).toBeCloseTo(1 / Math.tan(t / 2), 9);
    }
  });

  it('x = t², y = t³ 的斜率就是 3t/2', () => {
    for (const t of [-1.7, -0.4, 0.6, 1.3]) {
      expect(slope(cus, t)!).toBeCloseTo((3 * t) / 2, 9);
    }
  });
});

describe('⭐⭐⭐ 反例一:竖直切线 —— 还在动,却没有斜率', () => {
  it('椭圆在 t = 0 和 t = π 处斜率不存在', () => {
    expect(slope(ell, 0)).toBeNull();
    expect(slope(ell, Math.PI)).toBeNull();
    expect(stateAt(ell, 0)).toBe('vertical');
    expect(stateAt(ell, Math.PI)).toBe('vertical');
  });

  it('⭐⭐ 而那里的**速度最大**,不是零 —— 这正是要讲的那句话', () => {
    const v0 = speed(ell, 0);
    expect(v0).toBeCloseTo(2, 9);           // |dy/dt| = 2
    // 而且它确实是全程最大的速度之一
    let maxV = 0;
    for (let i = 0; i <= 400; i += 1) maxV = Math.max(maxV, speed(ell, (2 * Math.PI * i) / 400));
    expect(v0).toBeGreaterThan(maxV * 0.6);
    // ⭐ dy/dt 在那里也不为零
    expect(Math.abs(ell.dy(0))).toBeCloseTo(2, 9);
  });

  it('⭐ 绝不返回 Infinity —— 竖直切线是"不存在",不是"很大"', () => {
    for (const t of [0, Math.PI, 2 * Math.PI]) {
      expect(slope(ell, t)).toBeNull();
      expect(show(slope(ell, t))).toBe('undefined');
    }
  });

  it('水平切线是另一回事:斜率是 0,存在', () => {
    expect(slope(ell, Math.PI / 2)).toBeCloseTo(0, 9);
    expect(stateAt(ell, Math.PI / 2)).toBe('horizontal');
  });
});

describe('⭐⭐ 反例二:两个导数同时为零', () => {
  it('旋轮线在 t = 2π 处停住', () => {
    const t = 2 * Math.PI;
    expect(Math.abs(cyc.dx(t))).toBeLessThan(1e-9);
    expect(Math.abs(cyc.dy(t))).toBeLessThan(1e-9);
    expect(stateAt(cyc, t)).toBe('stopped');
    expect(speed(cyc, t)).toBeCloseTo(0, 6);
  });

  it('⭐ `stopped` 要先于 `vertical` 判 —— 否则尖点会被误当成竖直切线', () => {
    expect(stateAt(cyc, 2 * Math.PI)).not.toBe('vertical');
    expect(stateAt(cus, 0)).toBe('stopped');
  });

  it('⭐⭐ 而"都为零"并不决定有没有切线方向 —— 两条曲线正好相反', () => {
    // 旋轮线:dy/dx = cot(t/2),t → 0⁺ 时冲向 +∞,没有极限方向
    expect(slope(cyc, 0.001)!).toBeGreaterThan(500);
    // x = t², y = t³:dy/dx = 3t/2 → 0,方向是有的
    expect(slope(cus, 0.001)!).toBeCloseTo(0.0015, 6);
    expect(slope(cus, -0.001)!).toBeCloseTo(-0.0015, 6);
  });

  it('四种状态每一种都出现得到,没有死分支', () => {
    const seen = new Set<string>();
    for (const c of CURVES) {
      const [lo, hi] = c.tRange;
      for (let i = 0; i <= 400; i += 1) seen.add(stateAt(c, lo + ((hi - lo) * i) / 400));
      for (const m of c.marks) seen.add(stateAt(c, m.t));
    }
    expect([...seen].sort()).toEqual(['horizontal', 'smooth', 'stopped', 'vertical']);
  });
});

describe('⭐⭐⭐ 反例三:二阶导不是两个二阶导相除', () => {
  it('椭圆的 d²y/dx² 就是 −2/(9 sin³t) —— 手推的', () => {
    for (const t of [0.5, Math.PI / 4, 1.2, 2.4]) {
      const want = -2 / (9 * Math.sin(t) ** 3);
      expect(secondDeriv(ell, t)!, `t=${t}`).toBeCloseTo(want, 3);
    }
  });

  it('⭐ 而且用"沿曲线量二阶差商"这条独立路径也对得上', () => {
    let checked = 0;
    for (const t of [0.6, 1.0, Math.PI / 4, 2.2]) {
      const a = secondDeriv(ell, t);
      const b = secondBySecant(ell, t);
      expect(a).not.toBeNull();
      expect(b).not.toBeNull();
      expect(Math.abs(a! - b!) / Math.max(1, Math.abs(a!)), `t=${t}`).toBeLessThan(2e-2);
      checked += 1;
    }
    expect(checked).toBe(4);
  });

  it('⭐⭐ 那个想当然的写法差得离谱 —— 在 t = π/4 处连符号都反', () => {
    const t = Math.PI / 4;
    const right = secondDeriv(ell, t)!;
    const wrong = naiveSecond(ell, t)!;
    expect(right).toBeCloseTo(-2 / (9 * Math.sin(t) ** 3), 3);   // ≈ −0.6285
    expect(wrong).toBeCloseTo((2 / 3) * Math.tan(t), 9);          // ≈ +0.6667
    expect(right).toBeLessThan(0);
    expect(wrong).toBeGreaterThan(0);
    expect(Math.sign(right)).not.toBe(Math.sign(wrong));
  });

  it('⭐ 而且不是只有一个点上反 —— 大片区域都不一样', () => {
    let differ = 0;
    let looked = 0;
    for (let i = 1; i < 40; i += 1) {
      const t = (Math.PI * i) / 40;
      const a = secondDeriv(ell, t);
      const b = naiveSecond(ell, t);
      if (a === null || b === null) continue;
      looked += 1;
      if (Math.abs(a - b) > 0.05 * Math.max(1, Math.abs(a))) differ += 1;
    }
    expect(looked).toBeGreaterThan(30);
    expect(differ / looked, '两者差不多的话,这个反例就没说服力').toBeGreaterThan(0.9);
  });

  it('x = t², y = t³ 的二阶导是 3/(4t)', () => {
    for (const t of [0.5, 1.0, 1.6, -1.2]) {
      expect(secondDeriv(cus, t)!, `t=${t}`).toBeCloseTo(3 / (4 * t), 2);
    }
  });

  it('竖直切线处二阶导也不存在', () => {
    expect(secondDeriv(ell, 0)).toBeNull();
    expect(secondDeriv(ell, Math.PI)).toBeNull();
  });
});

describe('画图用的量', () => {
  it('取样都是有限值,而且够密', () => {
    for (const c of CURVES) {
      const pts = samplePath(c);
      expect(pts.length).toBeGreaterThan(500);
      for (const p of pts) {
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
      }
    }
  });

  it('⭐ 画框把整条曲线装得下', () => {
    for (const c of CURVES) {
      const [x0, x1, y0, y1] = bounds(c);
      expect(x0).toBeLessThan(x1);
      expect(y0).toBeLessThan(y1);
      for (const p of samplePath(c, 200)) {
        expect(p.x).toBeGreaterThanOrEqual(x0);
        expect(p.x).toBeLessThanOrEqual(x1);
        expect(p.y).toBeGreaterThanOrEqual(y0);
        expect(p.y).toBeLessThanOrEqual(y1);
      }
    }
  });

  it('⭐ 三条曲线的尺度确实不一样 —— 所以画框不能写死', () => {
    const widths = CURVES.map((c) => { const b = bounds(c); return b[1] - b[0]; });
    expect(Math.max(...widths) / Math.min(...widths)).toBeGreaterThan(1.5);
  });

  it('clampT 夹在自己的范围里', () => {
    expect(clampT(ell, 99)).toBe(ell.tRange[1]);
    expect(clampT(ell, -99)).toBe(ell.tRange[0]);
    expect(clampT(ell, Number.NaN)).toBe(ell.startT);
  });

  it('show 不吐 NaN 或 Infinity', () => {
    expect(show(null)).toBe('undefined');
    expect(show(Number.NaN)).toBe('undefined');
    expect(show(Number.POSITIVE_INFINITY)).toBe('undefined');
  });

  it('每条曲线都有一句自己的说明', () => {
    for (const c of CURVES) {
      expect(c.note.length).toBeGreaterThan(80);
      expect(c.xTex).toContain('x(t)');
      expect(c.yTex).toContain('y(t)');
    }
  });
});

describe('⚠️ 变异测试逼出来的两条', () => {
  /**
   * ⚠️ "速度只看 dy/dt" 这个变异体活了下来 —— 因为我只在 `dx/dt = 0` 的点上验过速度,
   *   那里两种算法恰好相同。**挑的验证点全都落在特例上,等于没验。**
   */
  it('⭐ 速度是**两个分量**合起来的,不是只看 dy/dt', () => {
    const t = Math.PI / 4;
    // 手算:dx = −3/√2,dy = 2/√2 ⇒ |v| = √(4.5 + 2) = √6.5
    expect(speed(ell, t)).toBeCloseTo(Math.sqrt(6.5), 9);
    expect(speed(ell, t)).not.toBeCloseTo(Math.abs(ell.dy(t)), 3);
  });

  it('⭐ 而且处处满足 |v|² = (dx/dt)² + (dy/dt)²', () => {
    let checked = 0;
    for (const c of CURVES) {
      const [lo, hi] = c.tRange;
      for (let i = 1; i < 25; i += 1) {
        const t = lo + ((hi - lo) * i) / 25;
        expect(speed(c, t) ** 2).toBeCloseTo(c.dx(t) ** 2 + c.dy(t) ** 2, 9);
        checked += 1;
      }
    }
    expect(checked, '循环空转了').toBe(72);
  });

  /**
   * ⚠️ "画框不留边" 也活了下来:我用的是 `>=` / `<=`,零边距时点正好压在边界上,
   *   照样算"装得下"。可屏幕上那条曲线会**贴着框边**,顶点被截平。
   */
  it('⭐ 画框要留出真正的余量 —— 曲线不许贴边', () => {
    for (const c of CURVES) {
      const [x0, x1, y0, y1] = bounds(c);
      const pts = samplePath(c, 300);
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      const w = x1 - x0;
      const hgt = y1 - y0;
      // 每一侧都要有至少 2% 画框宽度的空隙
      expect(Math.min(...xs) - x0, `${c.id} 左边贴边了`).toBeGreaterThan(w * 0.02);
      expect(x1 - Math.max(...xs), `${c.id} 右边贴边了`).toBeGreaterThan(w * 0.02);
      expect(Math.min(...ys) - y0, `${c.id} 下边贴边了`).toBeGreaterThan(hgt * 0.02);
      expect(y1 - Math.max(...ys), `${c.id} 上边贴边了`).toBeGreaterThan(hgt * 0.02);
    }
  });
});
