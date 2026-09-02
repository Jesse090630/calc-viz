/**
 * 隐函数求导的测试。
 *
 * 重心三处:
 *   ① 隐式公式 `−Fₓ/F_y` 与**显式分支的数值导数**一致(两条互不相干的路径);
 *   ② 解析偏导确实是偏导(拿数值偏导核一遍);
 *   ③ `F_y = 0` 处诚实地报"不存在",不是 Infinity、不是一个很大的数。
 */
import { describe, expect, it } from 'vitest';
import {
  CURVES,
  VERTICAL_NOTE,
  chainSteps,
  clampX,
  curveOf,
  isOnCurve,
  isVerticalTangent,
  pointOn,
  sampleBranch,
  show,
  slopeImplicit,
  slopeOnBranch,
  tangentAt,
  termsCarryingDydx,
  verticalTangentPoints,
  type BranchId,
  type Curve,
} from './implicit';

const BRANCHES: readonly BranchId[] = ['upper', 'lower'];

describe('⭐ 手算对得上', () => {
  it('圆 x²+y²=25 在 (3, 4) 处斜率是 −3/4', () => {
    const c = curveOf('circle');
    expect(isOnCurve(c, 3, 4)).toBe(true);
    expect(slopeImplicit(c, 3, 4)).toBeCloseTo(-0.75, 12);
  });

  it('同一个 x 的下分支 (3, −4) 处斜率是 +3/4 —— 符号翻过来', () => {
    const c = curveOf('circle');
    expect(slopeImplicit(c, 3, -4)).toBeCloseTo(0.75, 12);
  });

  it('椭圆 x²/9 + y²/4 = 1 在 (0, 2) 处斜率是 0(顶点,切线水平)', () => {
    const c = curveOf('ellipse');
    expect(isOnCurve(c, 0, 2)).toBe(true);
    expect(slopeImplicit(c, 0, 2)).toBeCloseTo(0, 12);
  });
});

describe('⭐⭐ 两条独立路径必须一致', () => {
  /**
   * 路径 ① 只用隐式关系,从不解出 y;
   * 路径 ② 把显式分支拿来做中心差商,完全不碰隐式那套。
   * 所以两者一致 = 对隐函数求导的一次真实数值检验。
   */
  it('每条曲线、每个分支、整段区间上都一致', () => {
    let checked = 0;
    for (const c of CURVES) {
      const [lo, hi] = c.xRange;
      for (const which of BRANCHES) {
        // ⚠️ 端点附近切线趋于竖直,中心差商会爆 —— 往里收一点再比
        for (let x = lo + 0.35; x <= hi - 0.35; x += 0.15) {
          const p = pointOn(c, x, which);
          if (!p) continue;
          const a = slopeImplicit(c, p.x, p.y);
          const b = slopeOnBranch(c, x, which);
          if (a === null || b === null) continue;
          expect(b, `${c.id}/${which} x=${x.toFixed(2)}`).toBeCloseTo(a, 4);
          checked += 1;
        }
      }
    }
    expect(checked, '一条都没比到,这个测试是空跑').toBeGreaterThan(100);
  });

  it('⭐ 解析偏导确实是偏导 —— 拿数值偏导核一遍', () => {
    const eps = 1e-6;
    for (const c of CURVES) {
      for (const [x, y] of [[1, 1.5], [-2, 0.9], [0.5, -1.2]] as const) {
        const numFx = (c.F(x + eps, y) - c.F(x - eps, y)) / (2 * eps);
        const numFy = (c.F(x, y + eps) - c.F(x, y - eps)) / (2 * eps);
        expect(numFx, `${c.id} Fx`).toBeCloseTo(c.Fx(x, y), 5);
        expect(numFy, `${c.id} Fy`).toBeCloseTo(c.Fy(x, y), 5);
      }
    }
  });

  it('分支上的点确实落在曲线上 —— 否则后面全是空谈', () => {
    for (const c of CURVES) {
      for (const which of BRANCHES) {
        for (const p of sampleBranch(c, which, 40)) {
          expect(isOnCurve(c, p.x, p.y, 1e-9), `${c.id}/${which} (${p.x}, ${p.y})`).toBe(true);
        }
      }
    }
  });
});

describe('⭐⭐ 竖直切线:不存在就是不存在', () => {
  it('圆的最左最右两点上,dy/dx 是 null', () => {
    const c = curveOf('circle');
    expect(slopeImplicit(c, 5, 0)).toBeNull();
    expect(slopeImplicit(c, -5, 0)).toBeNull();
  });

  it('⚠️ 返回的是 null,不是 Infinity,也不是 NaN', () => {
    const c = curveOf('circle');
    const s = slopeImplicit(c, 5, 0);
    expect(s).toBeNull();
    // NaN 与 Infinity 在 JS 里都会一路溜到屏幕上
    expect(Number.isNaN(s as unknown as number)).toBe(false);
    expect(s).not.toBe(Number.POSITIVE_INFINITY);
  });

  it('⭐ 而那些点是**构造**出来的,不是扫描碰上的', () => {
    for (const c of CURVES) {
      const pts = verticalTangentPoints(c);
      expect(pts.length, `${c.id} 一个竖直切点都没找到`).toBe(2);
      for (const p of pts) {
        expect(isOnCurve(c, p.x, p.y), `${c.id} (${p.x},${p.y}) 不在曲线上`).toBe(true);
        expect(isVerticalTangent(c, p.x, p.y)).toBe(true);
        expect(slopeImplicit(c, p.x, p.y)).toBeNull();
      }
    }
  });

  it('⭐ 越靠近那个点,斜率的绝对值越大 —— 而且大得**有公式可依**', () => {
    /**
     * ⚠️ 第一版这里写"到 x = 4.99 时应当超过 30",结果实际是 15.79 —— 又是**凭手感定阈值**。
     * 圆上 `|dy/dx| = x/√(25−x²)`,它按 `1/√(5−x)` 的量级发散。
     * 与其猜一个数,不如把那个闭形式本身钉住,再用它构造出"要多大有多大"。
     */
    const c = curveOf('circle');
    for (const x of [4.0, 4.9, 4.99, 4.9999]) {
      const p = pointOn(c, x, 'upper')!;
      const m = Math.abs(slopeImplicit(c, p.x, p.y)!);
      expect(m, `x=${x} 的闭形式对不上`).toBeCloseTo(x / Math.sqrt(25 - x * x), 6);
    }
  });

  it('⭐ 给任意一个界,都能构造出一个超过它的点 —— 这才叫"发散"', () => {
    const c = curveOf('circle');
    // 用闭形式反解:|m| > B  ⟺  x > 5B/√(B²+1)
    for (const bound of [10, 100, 1000]) {
      const x = (5 * bound) / Math.sqrt(bound * bound + 1) + 1e-9;
      const p = pointOn(c, Math.min(x, 5 - 1e-12), 'upper');
      expect(p, `界 ${bound} 对应的 x 取不到点`).not.toBeNull();
      const m = Math.abs(slopeImplicit(c, p!.x, p!.y)!);
      expect(m, `界 ${bound} 没被超过`).toBeGreaterThan(bound);
    }
  });

  it('⭐ 单调:越靠近端点,斜率只增不减', () => {
    const c = curveOf('circle');
    let previous = 0;
    for (const x of [4.0, 4.5, 4.9, 4.99, 4.999]) {
      const p = pointOn(c, x, 'upper')!;
      const m = Math.abs(slopeImplicit(c, p.x, p.y)!);
      expect(m, `x=${x}`).toBeGreaterThan(previous);
      previous = m;
    }
  });

  it('tangentAt 在竖直处把 vertical 标出来,且 at() 返回 null', () => {
    const c = curveOf('circle');
    const t = tangentAt(c, 5, 0);
    expect(t.vertical).toBe(true);
    expect(t.slope).toBeNull();
    expect(t.at(1)).toBeNull();
  });

  it('别处 tangentAt 给出一条真正过该点的直线', () => {
    const c = curveOf('circle');
    const t = tangentAt(c, 3, 4);
    expect(t.vertical).toBe(false);
    expect(t.at(3)).toBeCloseTo(4, 12);          // 过切点
    expect(t.at(4)! - t.at(3)!).toBeCloseTo(-0.75, 12);  // 斜率对
  });
});

describe('⭐⭐ 那个 dy/dx 是链式法则带来的', () => {
  it('每条曲线**恰好有一项**带 dy/dx —— 就是含 y 的那一项', () => {
    for (const c of CURVES) {
      expect(termsCarryingDydx(c), c.id).toBe(1);
    }
  });

  it('⭐ 带 dy/dx 的那一项,展开式里必须真的出现 dy/dx;不带的必须没有', () => {
    for (const c of CURVES) {
      for (const step of chainSteps(c)) {
        const hasIt = step.afterTex.includes('\\frac{dy}{dx}');
        expect(hasIt, `${c.id} / ${step.termTex} 的 carriesDydx 与展开式对不上`).toBe(step.carriesDydx);
      }
    }
  });

  it('每一步都写了理由 —— 空理由等于没解释', () => {
    for (const c of CURVES) {
      for (const step of chainSteps(c)) {
        expect(step.why.length, `${c.id} / ${step.termTex}`).toBeGreaterThan(20);
      }
    }
  });
});

describe('取值与边界', () => {
  it('分支在定义域外返回 null,不返回 NaN', () => {
    const c = curveOf('circle');
    expect(c.branch(6, 'upper')).toBeNull();
    expect(c.branch(-6, 'lower')).toBeNull();
    expect(pointOn(c, 99, 'upper')).toBeNull();
  });

  it('slopeOnBranch 在会踩出定义域时返回 null,不瞎猜', () => {
    const c = curveOf('circle');
    // 端点上,x+h 已经在圆外
    expect(slopeOnBranch(c, 5, 'upper')).toBeNull();
  });

  it('clampX 夹在这条曲线自己的范围里', () => {
    const c = curveOf('ellipse');
    expect(clampX(c, 99)).toBe(3);
    expect(clampX(c, -99)).toBe(-3);
    expect(clampX(c, Number.NaN)).toBe(c.startX);
  });

  it('curveOf 认不出的 id 回落到第一条', () => {
    expect(curveOf('nope')).toBe(CURVES[0]);
  });

  it('每条曲线的起始点都在曲线上 —— 否则一打开就是空的', () => {
    for (const c of CURVES) {
      const p = pointOn(c, c.startX, c.startBranch);
      expect(p, `${c.id} 起始点取不到`).not.toBeNull();
      expect(isOnCurve(c, p!.x, p!.y), c.id).toBe(true);
      expect(slopeImplicit(c, p!.x, p!.y), `${c.id} 起始点上斜率就没有`).not.toBeNull();
    }
  });

  it('show(null) 是 "undefined"', () => {
    expect(show(null)).toBe('undefined');
    expect(show(Number.POSITIVE_INFINITY)).toBe('undefined');
    expect(show(-0.75)).not.toBe('undefined');
  });
});

describe('⭐⭐ 变异测试逼出来的几个洞', () => {
  /**
   * 下面每一条都对应一个**活下来的变异**。存活 = 测试有洞,不是噪音。
   */

  it('⭐ 两个分支必须**真的不同** —— 不能让下分支悄悄变成上分支', () => {
    /**
     * ⚠️ 把 `which === 'upper' ? root : -root` 改成 `return root`,原来全部测试照样绿:
     * `pointOn` 与 `slopeOnBranch` 用的是同一个 branch,两边一起错;
     * 而 `isOnCurve` 对 `+root` 当然也成立。**一致地错,是最难发现的错。**
     */
    for (const c of CURVES) {
      const x = (c.xRange[0] + c.xRange[1]) / 2 + 0.4;
      const up = c.branch(x, 'upper');
      const down = c.branch(x, 'lower');
      expect(up, `${c.id} 上分支取不到`).not.toBeNull();
      expect(down, `${c.id} 下分支取不到`).not.toBeNull();
      expect(down!, `${c.id} 下分支不是上分支的相反数`).toBeCloseTo(-up!, 12);
      expect(up!, `${c.id} 上分支应当为正`).toBeGreaterThan(0);
      expect(down!, `${c.id} 下分支应当为负`).toBeLessThan(0);
    }
  });

  it('⭐ 两个分支上的斜率互为相反数 —— 上下对称的直接后果', () => {
    for (const c of CURVES) {
      const x = (c.xRange[0] + c.xRange[1]) / 2 + 0.4;
      const a = pointOn(c, x, 'upper')!;
      const b = pointOn(c, x, 'lower')!;
      expect(slopeImplicit(c, b.x, b.y)!).toBeCloseTo(-slopeImplicit(c, a.x, a.y)!, 10);
    }
  });

  it('⭐ isOnCurve 必须对**不在**曲线上的点说不 —— 原来一条否定断言都没有', () => {
    for (const c of CURVES) {
      expect(isOnCurve(c, 0, 0), `${c.id} 原点居然算在曲线上`).toBe(false);
      expect(isOnCurve(c, 100, 100), c.id).toBe(false);
      const p = pointOn(c, c.startX, 'upper')!;
      // 偏一点点就不算在上面 —— 容差不能松
      expect(isOnCurve(c, p.x, p.y + 0.01), `${c.id} 容差太松`).toBe(false);
      expect(isOnCurve(c, p.x, p.y), c.id).toBe(true);
    }
  });

  it('⭐ 非有限的输入必须返回 null,不能把 NaN 放出去', () => {
    /**
     * ⚠️ `Number.isFinite` 那道关不是多余的:`Fy` 正常(非 0)、而 x 是 NaN 时,
     * `fy === 0` 那一关拦不住,`-NaN/2` 会一路溜出去。
     */
    const c = curveOf('circle');
    expect(slopeImplicit(c, Number.NaN, 3)).toBeNull();
    expect(slopeImplicit(c, 3, Number.NaN)).toBeNull();
    expect(slopeImplicit(c, Number.POSITIVE_INFINITY, 3)).toBeNull();
  });

  it('⭐ verticalTangentPoints 会把不在曲线上的候选点挡掉', () => {
    /**
     * ⚠️ 去掉那个 `isOnCurve` 过滤,现有两条曲线照样绿 ——
     * 因为它们的 xRange 端点**恰好**就在曲线上。那是数据碰巧,不是逻辑对。
     * 这里造一条 xRange 比曲线本身宽的曲线,让那道过滤真的起作用。
     */
    const wide: Curve = {
      ...curveOf('circle'),
      id: 'wide-range',
      xRange: [-8, 8],   // 比半径 5 宽 —— 端点根本不在圆上
    };
    expect(isOnCurve(wide, 8, 0)).toBe(false);
    expect(verticalTangentPoints(wide)).toEqual([]);
    // 而正常那条仍然找得到两个
    expect(verticalTangentPoints(curveOf('circle')).length).toBe(2);
  });

  /**
   * ⚠️ **等价变异,不是洞**:去掉 `if (fy === 0) return null`,行为完全不变 ——
   * 因为 `fy = 0` 时 `-Fx/0` 是 ±Infinity 或 NaN,后面那道 `Number.isFinite` 照样拦下来。
   * 两道关互为兜底。保留显式那一道是因为**它说出了意图**("切线竖直"),
   * 而 finite 那道说的是"别让坏值上屏"。两句话不一样,都值得留着。
   */
  it('(记录)fy = 0 与非有限输入,两条路径都归到 null', () => {
    const c = curveOf('circle');
    expect(slopeImplicit(c, 5, 0)).toBeNull();          // fy = 0
    expect(slopeImplicit(c, Number.NaN, 1)).toBeNull(); // 非有限
  });
});

describe('⭐ 散文里不许出现 TeX 记号', () => {
  /**
   * ⚠️ 全站那条老规矩:同一个字符串既当 TeX 又当散文用,总有一头是错的。
   * `VERTICAL_NOTE` 是直接当文字渲染的,里面写 `F_y` 就会显示成字面的下划线。
   */
  it('VERTICAL_NOTE 里没有反斜杠、没有下划线记号', () => {
    expect(VERTICAL_NOTE).not.toMatch(/\\/);
    expect(VERTICAL_NOTE).not.toMatch(/[A-Za-z]_[A-Za-z]/);
  });

  it('chainSteps 的 why 也是散文,同样不许有反斜杠', () => {
    for (const c of CURVES) {
      for (const step of chainSteps(c)) {
        expect(step.why, `${c.id} / ${step.termTex}`).not.toMatch(/\\/);
      }
    }
  });

  it('而 termTex / afterTex 是 TeX,允许反斜杠 —— 两类字符串分得开', () => {
    const withBackslash = CURVES.flatMap((c) => chainSteps(c)).filter((s) => s.afterTex.includes('\\'));
    expect(withBackslash.length, 'TeX 那一侧一个反斜杠都没有,分类就没意义了').toBeGreaterThan(0);
  });
});
