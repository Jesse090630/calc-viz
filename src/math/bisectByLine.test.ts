/**
 * ⚠️ 期望值不从被测模块里取。这里的锚点是**另外推的闭式**:
 *
 *   · 椭圆总面积 `πab`;
 *   · 竖直割线 `x = c` 左边那块:`ab[π/2 + arcsin(c/a) + (c/a)√(1 − c²/a²)]`
 *     —— 由 `∫ 2b√(1 − x²/a²) dx` 直接积出来,和模块里"压成单位圆求弓形"那条路
 *     没有半点共用;
 *   · 中心对称:过中心的弦必平分 —— 几何,不是公式。
 */
import { describe, expect, it } from 'vitest';
import {
  IVT_NEEDS,
  SHAPES,
  angleTo,
  areaLeft,
  areaLeftExact,
  areaLeftPolar,
  areaLeftPolygon,
  bisect,
  boundaryAt,
  centreShortcut,
  centroid,
  centroidLineGap,
  centroidLineShare,
  centralAsymmetry,
  rotatedOutline,
  clipLeft,
  countRuns,
  gap,
  gapCurve,
  hitState,
  inside,
  isOutside,
  leftPieces,
  matchedTotal,
  polygonArea,
  pushOutside,
  rayInterval,
  segmentArea,
  shapeOf,
  show,
  side,
  tangentAngles,
  totalArea,
} from './bisectByLine';

const A = 3.4;
const B = 2.2;
const T_ELLIPSE = Math.PI * A * B;

const ellipse = shapeOf('ellipse');
const blob = shapeOf('blob');

/** 独立闭式:椭圆里 `x ≤ c` 那一块的面积。 */
function areaLeftOfVertical(c: number): number {
  const u = Math.min(Math.max(c / A, -1), 1);
  return A * B * (Math.PI / 2 + Math.asin(u) + u * Math.sqrt(Math.max(0, 1 - u * u)));
}

describe('图形本身', () => {
  it('椭圆面积就是 πab', () => {
    expect(totalArea(ellipse)).toBeCloseTo(T_ELLIPSE, 6);
  });

  it('⭐ 煎饼必须**星形**(r > 0)—— 极坐标积分要靠这一条', () => {
    let checked = 0;
    for (let i = 0; i < 2000; i += 1) {
      expect(blob.radius((2 * Math.PI * i) / 2000)).toBeGreaterThan(0.5);
      checked += 1;
    }
    expect(checked).toBe(2000);
  });

  it('⭐⭐ 而它**故意不凸** —— 凸性会把"看得出不对称"这件事卡死', () => {
    /**
     * ⚠️ 前两版都要求凸。可极坐标里中心对称 ⇔ 只有偶次谐波,
     *   要打破对称非得靠 3 次谐波,而 3 次一大就不凸 ——
     *   凸性把"转 180° 对不上"卡在 0.33 以内,屏幕上几乎看不见。
     *   放弃凸性换来 0.98,一眼可辨。代价(可能切出三块)另有断言盯着。
     */
    const h = 1e-4;
    let concave = 0;
    for (let i = 0; i < 1440; i += 1) {
      const phi = (2 * Math.PI * i) / 1440;
      const r = blob.radius(phi);
      const rp = (blob.radius(phi + h) - blob.radius(phi - h)) / (2 * h);
      const rpp = (blob.radius(phi + h) - 2 * r + blob.radius(phi - h)) / (h * h);
      if (r * r + 2 * rp * rp - r * rpp < 0) concave += 1;
    }
    expect(concave, '凸回去了,那不对称又看不见了').toBeGreaterThan(0);
    // 而椭圆是凸的
    expect(ellipse.radius(0)).toBeGreaterThan(0);
  });

  it('⭐⭐ 代价:左侧真的可能是**两块** —— 页面得说得出这句话', () => {
    let multi = 0;
    for (let k = 0; k < 240; k += 1) {
      if (leftPieces(blob, blob.startP, (2 * Math.PI * k) / 240, 4000) > 1) multi += 1;
    }
    expect(multi, '一次都没切出两块,那页面上那句话就是死界面').toBeGreaterThan(0);
    // 椭圆是凸的,永远只有一块
    for (let k = 0; k < 120; k += 1) {
      expect(leftPieces(ellipse, ellipse.startP, (2 * Math.PI * k) / 120)).toBeLessThanOrEqual(1);
    }
  });

  it('⭐ 而"两块"照样不影响面积 —— 裁剪和极坐标积分仍然一致', () => {
    let checkedMulti = 0;
    for (let k = 0; k < 240; k += 1) {
      const t = (2 * Math.PI * k) / 240;
      if (leftPieces(blob, blob.startP, t, 4000) <= 1) continue;
      expect(areaLeftPolygon(blob, blob.startP, t, 2880))
        .toBeCloseTo(areaLeftPolar(blob, blob.startP, t), 2);
      checkedMulti += 1;
    }
    expect(checkedMulti, '循环空转了').toBeGreaterThan(0);
  });

  it('⭐ 煎饼确实**不**中心对称 —— 否则这一课的对照就白设了', () => {
    let maxGap = 0;
    for (let i = 0; i < 360; i += 1) {
      const phi = (2 * Math.PI * i) / 360;
      maxGap = Math.max(maxGap, Math.abs(blob.radius(phi) - blob.radius(phi + Math.PI)));
    }
    expect(maxGap).toBeGreaterThan(0.5);
    expect(blob.centrallySymmetric).toBe(false);
    // 而椭圆是
    for (let i = 0; i < 360; i += 1) {
      const phi = (2 * Math.PI * i) / 360;
      expect(ellipse.radius(phi)).toBeCloseTo(ellipse.radius(phi + Math.PI), 12);
    }
  });

  it('两个图形的起始 P 都在外面 —— 题面要求的', () => {
    for (const s of SHAPES) {
      expect(isOutside(s, s.startP), `${s.id} 的起始 P 落在里面了`).toBe(true);
      expect(inside(s, s.origin)).toBe(true);
    }
  });

  it('边界点确实在边界上', () => {
    for (const s of SHAPES) {
      for (let i = 0; i < 40; i += 1) {
        const phi = (2 * Math.PI * i) / 40;
        const X = boundaryAt(s, phi);
        const d = Math.hypot(X[0] - s.origin[0], X[1] - s.origin[1]);
        expect(d).toBeCloseTo(s.radius(phi), 12);
      }
    }
  });
});

describe('弓形闭式', () => {
  it('seg(0) = π/2,seg(±1) = 0 与 π', () => {
    expect(segmentArea(0)).toBeCloseTo(Math.PI / 2, 12);
    expect(segmentArea(1)).toBeCloseTo(0, 12);
    expect(segmentArea(-1)).toBeCloseTo(Math.PI, 12);
  });

  it('⭐ seg(t) + seg(−t) = π —— 左右两块加起来是整个圆', () => {
    for (let t = -1; t <= 1; t += 0.05) {
      expect(segmentArea(t) + segmentArea(-t)).toBeCloseTo(Math.PI, 12);
    }
  });

  it('越界的输入被夹住,不返回 NaN', () => {
    expect(segmentArea(3)).toBeCloseTo(0, 12);
    expect(segmentArea(-3)).toBeCloseTo(Math.PI, 12);
  });
});

describe('⭐⭐ 三条路径 —— 和另外推的闭式对得上', () => {
  it('竖直割线:和 ∫2b√(1−x²/a²)dx 的结果一致', () => {
    for (const c of [-3, -1.5, 0, 0.8, 2.5]) {
      const P: readonly [number, number] = [c, 9];      // 在图形正上方,外面
      const theta = -Math.PI / 2;                        // 朝下,于是"左侧" = {x > c}
      const want = T_ELLIPSE - areaLeftOfVertical(c);
      expect(areaLeftExact(P, theta), `c=${c} 闭式`).toBeCloseTo(want, 8);
      expect(areaLeftPolar(ellipse, P, theta), `c=${c} 极坐标`).toBeCloseTo(want, 3);
      expect(areaLeftPolygon(ellipse, P, theta), `c=${c} 多边形`).toBeCloseTo(want, 3);
    }
  });

  it('过中心的弦必平分 —— 几何,不靠公式', () => {
    for (let k = 0; k < 12; k += 1) {
      const theta = (Math.PI * k) / 12;
      expect(areaLeftExact([0, 0], theta)).toBeCloseTo(T_ELLIPSE / 2, 9);
      expect(areaLeftPolar(ellipse, [0, 0], theta)).toBeCloseTo(T_ELLIPSE / 2, 4);
    }
  });

  it('椭圆上三条路径互相一致', () => {
    const P: readonly [number, number] = [5.6, 3.1];
    for (let k = 0; k < 16; k += 1) {
      const theta = (2 * Math.PI * k) / 16;
      const exact = areaLeftExact(P, theta);
      expect(areaLeftPolar(ellipse, P, theta)).toBeCloseTo(exact, 3);
      expect(areaLeftPolygon(ellipse, P, theta)).toBeCloseTo(exact, 3);
    }
  });

  it('煎饼上两条通用路径一致', () => {
    const P = blob.startP;
    for (let k = 0; k < 16; k += 1) {
      const theta = (2 * Math.PI * k) / 16;
      expect(areaLeftPolygon(blob, P, theta, 2880))
        .toBeCloseTo(areaLeftPolar(blob, P, theta), 2);
    }
  });

  it('⭐ 左 + 右 = 总 —— 一块都没漏掉', () => {
    for (const s of SHAPES) {
      const T = totalArea(s);
      for (let k = 0; k < 12; k += 1) {
        const theta = (2 * Math.PI * k) / 12;
        const L = areaLeft(s, s.startP, theta);
        const R = areaLeft(s, s.startP, theta + Math.PI);
        expect(L + R).toBeCloseTo(T, 2);
      }
    }
  });
});

describe('⭐⭐⭐ 支点:转过 π,左右对调', () => {
  it('A(θ + π) = T − A(θ)', () => {
    for (const s of SHAPES) {
      const T = totalArea(s);
      for (let k = 0; k < 24; k += 1) {
        const theta = (2 * Math.PI * k) / 24;
        expect(areaLeft(s, s.startP, theta + Math.PI), `${s.id} θ=${theta}`)
          .toBeCloseTo(T - areaLeft(s, s.startP, theta), 2);
      }
    }
  });

  it('⭐ 于是 g(θ + π) = −g(θ)', () => {
    for (const s of SHAPES) {
      for (let k = 0; k < 24; k += 1) {
        const theta = (2 * Math.PI * k) / 24;
        expect(gap(s, s.startP, theta + Math.PI)).toBeCloseTo(-gap(s, s.startP, theta), 2);
      }
    }
  });

  it('⭐⭐ 两个端点因此天生异号 —— IVT 要的第三样东西,白送', () => {
    for (const s of SHAPES) {
      for (const P of [s.startP, [6.2, -2.4] as const, [-5.9, 1.2] as const]) {
        const g0 = gap(s, P, 0);
        const gPi = gap(s, P, Math.PI);
        expect(g0 * gPi, `${s.id} 端点没有异号`).toBeLessThanOrEqual(1e-6);
      }
    }
  });

  it('⭐ 而这条性质对**任何**方向的起点都成立,不只是 θ₀ = 0', () => {
    for (const t0 of [0.3, 1.1, 2.7, 4.9]) {
      const a = gap(blob, blob.startP, t0);
      const b = gap(blob, blob.startP, t0 + Math.PI);
      expect(a * b).toBeLessThanOrEqual(1e-6);
    }
  });
});

describe('P 在外面 ⇒ 有一整段角度碰不到图形', () => {
  it('⭐ 平台确实存在 —— 而且两种都有', () => {
    const states = new Set<string>();
    for (let k = 0; k < 240; k += 1) {
      states.add(hitState(ellipse, ellipse.startP, (2 * Math.PI * k) / 240));
    }
    expect(states.has('crosses')).toBe(true);
    expect(states.has('misses-left')).toBe(true);
    expect(states.has('misses-right')).toBe(true);
  });

  it('碰不到时,面积恰好是 0 或 T —— 不是"差不多"', () => {
    const T = totalArea(ellipse);
    let seen = 0;
    for (let k = 0; k < 240; k += 1) {
      const theta = (2 * Math.PI * k) / 240;
      const st = hitState(ellipse, ellipse.startP, theta);
      if (st === 'crosses') continue;
      const a = areaLeft(ellipse, ellipse.startP, theta);
      expect(a).toBeCloseTo(st === 'misses-left' ? T : 0, 2);
      seen += 1;
    }
    expect(seen, '一个平台角度都没扫到').toBeGreaterThan(20);
  });

  it('⭐ 切线夹住的正是"碰得到"的那段角度', () => {
    const [t1, t2] = tangentAngles(ellipse, ellipse.startP);
    expect(hitState(ellipse, ellipse.startP, (t1 + t2) / 2)).toBe('crosses');
    // 稍微越过切线就碰不到了
    expect(hitState(ellipse, ellipse.startP, t1 - 0.05)).not.toBe('crosses');
    expect(hitState(ellipse, ellipse.startP, t2 + 0.05)).not.toBe('crosses');
  });

  it('P 挪到里面时就没有平台了 —— 说明平台真是"P 在外面"造成的', () => {
    let miss = 0;
    for (let k = 0; k < 120; k += 1) {
      if (hitState(ellipse, [0.2, 0.1], (2 * Math.PI * k) / 120) !== 'crosses') miss += 1;
    }
    expect(miss).toBe(0);
  });
});

describe('⭐⭐ 二分法 —— 介值定理构造性的那一半', () => {
  it('每个图形、每个外点都找得到平分线', () => {
    for (const s of SHAPES) {
      const T = totalArea(s);
      for (const P of [s.startP, [6.2, -2.4] as const, [-5.9, 1.2] as const, [0, 7.3] as const]) {
        const r = bisect(s, P);
        expect(Math.abs(r.residual), `${s.id} @ ${P}`).toBeLessThan(1e-8);
        // ⭐ 用**配套的**总量比,不是那个更准的 totalArea —— 混着比会差出系统偏移
        expect(areaLeft(s, P, r.theta)).toBeCloseTo(matchedTotal(s) / 2, 8);
        // 而配套总量和真值本身也就差 1e-5 量级,所以结论对真图形照样成立
        expect(matchedTotal(s)).toBeCloseTo(T, 3);
      }
    }
  });

  it('⭐ 区间每一步真的减半,而且一直夹着根', () => {
    const r = bisect(blob, blob.startP);
    expect(r.steps).toBeGreaterThan(10);
    expect(r.brackets.length).toBeGreaterThan(10);
    for (let i = 1; i < r.brackets.length; i += 1) {
      const prev = r.brackets[i - 1]!;
      const cur = r.brackets[i]!;
      expect(cur[1] - cur[0]).toBeCloseTo((prev[1] - prev[0]) / 2, 9);
      expect(cur[0]).toBeGreaterThanOrEqual(prev[0]);
      expect(cur[1]).toBeLessThanOrEqual(prev[1]);
      // ⭐ 每一步的两端仍然异号 —— 这才是二分法凭什么继续下去
      expect(gap(blob, blob.startP, cur[0]) * gap(blob, blob.startP, cur[1]))
        .toBeLessThanOrEqual(1e-6);
    }
  });

  it('起点已经是根时,一步都不用走', () => {
    const P: readonly [number, number] = [5, 0];
    // 椭圆中心在原点,θ = 0 那条线正好过中心
    // ⭐ 配套之后这里是**精确**的零(浮点意义上),混着比时曾经差 4e-4
    expect(Math.abs(gap(ellipse, P, 0))).toBeLessThan(1e-9);
    expect(bisect(ellipse, P).steps).toBe(0);
  });
});

describe('⭐⭐ 椭圆有捷径,煎饼没有 —— 这才是要用定理的理由', () => {
  it('椭圆:二分法找到的,正是过中心那一条', () => {
    for (const P of [ellipse.startP, [6.2, -2.4] as const, [-4, 4] as const]) {
      const found = bisect(ellipse, P).theta;
      const shortcut = centreShortcut(ellipse, P)!;
      const diff = Math.abs(((found - shortcut) % Math.PI + Math.PI) % Math.PI);
      expect(Math.min(diff, Math.PI - diff), `P=${P}`).toBeLessThan(1e-3);
    }
  });

  it('煎饼:没有中心可用', () => {
    expect(centreShortcut(blob, blob.startP)).toBeNull();
  });

  it('⭐⭐ 而过**形心**的直线并不平分面积 —— 反例要真的差得出来', () => {
    const off = Math.abs(centroidLineGap(blob, blob.startP));
    expect(off, '形心线恰好平分了,那这个反例就没说服力').toBeGreaterThan(1.2);
  });

  it('⭐⭐ 但差得**不多** —— 这才是诚实的说法,也才是它危险的地方', () => {
    /**
     * ⚠️ 第一版的文案说形心线"一般不平分",听上去像会差很远。
     *   凸图形其实有个经典上界:过形心的直线,两侧之比不会超过 5:4。
     *   这块煎饼上只差 0.7% —— **像对的,却不是对的**,那才是真正的陷阱。
     */
    // ⚠️ 别假设偏向哪一边 —— 这里实际是 49.65/50.35,不是 50.35/49.65。
    //   断言"偏了多少",不是"往哪边偏"。
    const share = centroidLineShare(blob, blob.startP);
    expect(Math.abs(share - 0.5)).toBeGreaterThan(0.02);    // 确实偏了
    expect(Math.abs(share - 0.5)).toBeLessThan(0.12);       // 但仍在 5:4 之内
    // 而且这个界对整整一圈的 P 都成立
    for (let a = 0; a < 2 * Math.PI; a += Math.PI / 12) {
      const P: readonly [number, number] = [5.5 * Math.cos(a), 5.5 * Math.sin(a)];
      const r = centroidLineShare(blob, P);
      expect(r).toBeGreaterThan(4 / 9);          // 4:5 ⇒ 4/9
      expect(r).toBeLessThan(5 / 9);
    }
  });

  it('⭐ 而这个"差多少"是随 P 变的 —— 有些位置上它几乎正好平分', () => {
    // 所以默认的 P 是**挑**出来的:挑错了地方,这个反例就作废
    const off = (P: readonly [number, number]) => Math.abs(centroidLineGap(blob, P));
    // ⚠️ 这个位置上形心线**恰好**平分 —— 默认 P 要是落在这儿,反例就作废了
    expect(off([5.53, 0.48])).toBeLessThan(0.02);
    expect(off(blob.startP)).toBeGreaterThan(1.2);     // 搜出来的这里差得看得见
  });

  it('形心不在星形中心上 —— 不然这个反例是假的', () => {
    const c = centroid(blob);
    expect(Math.hypot(c[0] - blob.origin[0], c[1] - blob.origin[1])).toBeGreaterThan(0.2);
    // 椭圆的形心就是中心
    const ce = centroid(ellipse);
    expect(Math.hypot(ce[0], ce[1])).toBeLessThan(1e-6);
  });
});

describe('画图用的量', () => {
  it('g 曲线首尾正是那对异号端点', () => {
    const c = gapCurve(blob, blob.startP);
    // ⭐ 配套总量让这条恒等式在浮点意义上精确成立
    expect(c[0]!.g).toBeCloseTo(-c[c.length - 1]!.g, 9);
    expect(c[0]!.theta).toBeCloseTo(0, 12);
    expect(c[c.length - 1]!.theta).toBeCloseTo(Math.PI, 12);
  });

  it('⭐ 曲线上确实有一次穿零 —— 否则图上看不到 IVT', () => {
    const c = gapCurve(ellipse, ellipse.startP);
    let crossings = 0;
    for (let i = 1; i < c.length; i += 1) {
      if (c[i - 1]!.g * c[i]!.g < 0) crossings += 1;
    }
    expect(crossings).toBeGreaterThanOrEqual(1);
  });

  it('⭐ 曲线上也确实有平台 —— 那是"P 在外面"的证据', () => {
    const T = matchedTotal(ellipse);
    const c = gapCurve(ellipse, ellipse.startP);
    const flat = c.filter((p) => Math.abs(Math.abs(p.g) - T) < 1e-9);
    expect(flat.length, '一个平台点都没有').toBeGreaterThan(5);
  });

  it('裁剪后的多边形面积就是左侧面积', () => {
    const P = blob.startP;
    for (let k = 0; k < 8; k += 1) {
      const theta = (2 * Math.PI * k) / 8;
      const poly = clipLeft(
        Array.from({ length: 720 }, (_, i) => boundaryAt(blob, (2 * Math.PI * i) / 720)),
        P, theta,
      );
      expect(polygonArea(poly)).toBeCloseTo(areaLeftPolygon(blob, P, theta), 9);
    }
  });

  it('side 的符号约定:θ 加 π 时整体变号', () => {
    const P: readonly [number, number] = [1, 2];
    const X: readonly [number, number] = [4, -1];
    for (const th of [0, 0.7, 2.2, 5.1]) {
      expect(side(P, th + Math.PI, X)).toBeCloseTo(-side(P, th, X), 12);
    }
  });

  it('angleTo 落在 [0, π) 里 —— 直线没有朝向', () => {
    for (let k = 0; k < 24; k += 1) {
      const a = angleTo([0, 0], [Math.cos((2 * Math.PI * k) / 24), Math.sin((2 * Math.PI * k) / 24)]);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(Math.PI);
    }
  });

  it('show 不吐 NaN', () => {
    expect(show(null)).toBe('undefined');
    expect(show(Number.NaN)).toBe('undefined');
    expect(show(Number.POSITIVE_INFINITY)).toBe('undefined');
  });
});


describe('⚠️ 变异测试逼出来的两条', () => {
  /**
   * 「射线与直线平行」那一支,在积分里是**走不到的**(`sin(φ−θ)` 恰好为 0 是零测度)。
   * 拆成独立函数才测得到 —— 否则改反了也没人发现。
   */
  describe('rayInterval', () => {
    it('平行且极点在左:整条射线都算', () => {
      expect(rayInterval(2, 0.5, 0)).toEqual([0, 2]);
    });

    it('⭐ 平行且极点在右:一点都不算', () => {
      expect(rayInterval(2, -0.5, 0)).toEqual([0, 0]);
    });

    it('平行且极点正好在线上:不算 —— 那是一条零面积的边界', () => {
      expect(rayInterval(2, 0, 0)).toEqual([0, 0]);
    });

    it('m > 0:从交点开始,到边界为止,且不越过极点', () => {
      expect(rayInterval(3, -1, 0.5)).toEqual([2, 3]);      // cut = 2
      expect(rayInterval(3, 1, 0.5)).toEqual([0, 3]);       // cut = −2,夹回 0
    });

    it('m < 0:从极点开始,到交点为止,且不越过边界', () => {
      expect(rayInterval(3, 1, -0.5)).toEqual([0, 2]);      // cut = 2
      expect(rayInterval(3, 9, -0.5)).toEqual([0, 3]);      // cut = 18,夹回 r
    });

    it('⭐ 空区间用 t₁ ≤ t₀ 表示,不返回负长度', () => {
      const [t0, t1] = rayInterval(3, -5, -0.5);            // cut = −10
      expect(t1).toBeLessThanOrEqual(t0);
    });
  });

  /**
   * 把起始区间从 π 改成 2π,两端是同一条有向直线、`g` 完全相等 —— 根本没夹住根。
   * 可二分照样瞎撞出一个零点,测试全绿。**前提必须自己验。**
   */
  describe('二分的前提', () => {
    it('起始区间宽度恰好是 π', () => {
      const r = bisect(blob, blob.startP);
      expect(r.brackets[0]![1] - r.brackets[0]![0]).toBeCloseTo(Math.PI, 12);
    });

    it('⭐ 起始两端确实异号', () => {
      for (const s of SHAPES) {
        const r = bisect(s, s.startP);
        const [lo, hi] = r.brackets[0]!;
        expect(gap(s, s.startP, lo) * gap(s, s.startP, hi)).toBeLessThanOrEqual(0);
      }
    });

    it('⭐⭐ 换成整圈就必须**报错**,不能硬算出一个答案来', () => {
      // 整圈:两端是同一条有向直线,g 完全相等,IVT 的前提不成立。
      // ⚠️ 而二分照样会瞎撞出一个零点 —— 所以前提要当场验,不能靠运气。
      const P = blob.startP;
      expect(gap(blob, P, 0.4 + 2 * Math.PI)).toBeCloseTo(gap(blob, P, 0.4), 9);
      expect(() => bisect(blob, P, 0.4, 1e-9, 2 * Math.PI)).toThrow(/straddle/);
    });

    it('⭐ 半个 π 也不行 —— 那份保证只在整整 π 上成立', () => {
      // 取一个 g 在 [t₀, t₀+π/2] 上不变号的起点
      const P = blob.startP;
      let bad = 0;
      for (const t0 of [0, 0.5, 1, 1.5, 2, 2.5, 3]) {
        if (gap(blob, P, t0) * gap(blob, P, t0 + Math.PI / 2) > 0) {
          expect(() => bisect(blob, P, t0, 1e-9, Math.PI / 2)).toThrow(/straddle/);
          bad += 1;
        }
      }
      expect(bad, '没找到一个半 π 会失败的起点,这条断言就空转了').toBeGreaterThan(0);
    });

    it('⭐ 而整整 π,对每一个起点都成立', () => {
      for (const t0 of [0, 0.9, 2.3, 5.5]) {
        expect(() => bisect(blob, blob.startP, t0)).not.toThrow();
      }
    });
  });
});

describe('拖动时守住「P 在外面」这个前提', () => {
  it('本来就在外面的点原样返回', () => {
    for (const s of SHAPES) expect(pushOutside(s, s.startP)).toEqual(s.startP);
  });

  it('⭐ 落进去的点被推回边界外,方向不变', () => {
    for (const s of SHAPES) {
      for (const P of [[0, 0] as const, [0.4, -0.3] as const, [1.2, 0.9] as const]) {
        const out = pushOutside(s, P);
        expect(isOutside(s, out), `${s.id}`).toBe(true);
      }
    }
  });

  it('⭐ 正中心那个点也推得出来 —— 方向退化,不能返回 NaN', () => {
    const out = pushOutside(ellipse, ellipse.origin);
    expect(Number.isFinite(out[0])).toBe(true);
    expect(Number.isFinite(out[1])).toBe(true);
    expect(isOutside(ellipse, out)).toBe(true);
  });
});

describe('⚠️ 截图逼出来的:煎饼必须**看上去**就不对称', () => {
  /**
   * 第一版的系数在屏幕上就是一个圆。测试全绿 —— 凸性过了,不对称也"过"了
   * (最大差 0.5 而已)。可这一课全靠「椭圆一眼看得出、煎饼看不出」这个对照,
   * 图形长得像圆,对照当场塌掉。**看得清楚是硬指标,得写成断言。**
   */
  it('⭐ 半径最大最小要拉开到 1.8 倍以上', () => {
    let lo = Infinity;
    let hi = 0;
    for (let i = 0; i < 2000; i += 1) {
      const r = blob.radius((2 * Math.PI * i) / 2000);
      lo = Math.min(lo, r);
      hi = Math.max(hi, r);
    }
    expect(hi / lo, '煎饼太圆了,和椭圆的对照就没了').toBeGreaterThan(1.8);
    // ⭐ 但真正决定"看不看得出没有中心"的是**转 180° 对不上多少**,不是这个比
    expect(centralAsymmetry(blob, centroid(blob))).toBeGreaterThan(0.8);
  });

  it('⭐ 形心离中心要看得见 —— 那个红点得离开图形正中', () => {
    const c = centroid(blob);
    expect(Math.hypot(c[0] - blob.origin[0], c[1] - blob.origin[1])).toBeGreaterThan(0.3);
  });
});

describe('⭐⭐ 「有没有中心」这件事必须**看得见**,不能只是个标志位', () => {
  it('椭圆绕中心转 180° 后落回自己身上', () => {
    expect(centralAsymmetry(ellipse, ellipse.origin)).toBeLessThan(1e-9);
  });

  it('⭐ 煎饼转完对不上 —— 而且差得看得见', () => {
    // 绕形心转(最有利于它的那个点),照样对不上
    expect(centralAsymmetry(blob, centroid(blob))).toBeGreaterThan(0.8);
    expect(centralAsymmetry(blob, blob.origin)).toBeGreaterThan(0.8);
  });

  it('⭐⭐ centrallySymmetric 这个手写标志不许说谎', () => {
    for (const s of SHAPES) {
      const sym = centralAsymmetry(s, centroid(s)) < 1e-6;
      expect(sym, `${s.id} 的标志和实际对不上`).toBe(s.centrallySymmetric);
    }
  });

  it('转过去的轮廓点数和原轮廓一致', () => {
    expect(rotatedOutline(blob, blob.origin, 120)).toHaveLength(120);
  });
});

describe('⚠️ 第二轮变异测试逼出来的四条', () => {
  it('⭐ rotatedOutline 转的是**绕那个点**,不是绕它的一半', () => {
    /**
     * ⚠️ 把 `2 * about - x` 写成 `about - x` 活了下来:
     *   椭圆绕原点转,两者恰好相同(0 和 0 的两倍一样);
     *   煎饼那条只看"差得够不够大",半个偏移照样够大。
     *   得直接钉住几何:φ 处的边界点必须落到 `2c − B(φ)`。
     */
    const c: readonly [number, number] = [1.3, -0.7];
    const spun = rotatedOutline(blob, c, 360);
    for (const i of [0, 37, 180, 299]) {
      const B = boundaryAt(blob, (2 * Math.PI * i) / 360);
      expect(spun[i]![0]).toBeCloseTo(2 * c[0] - B[0], 12);
      expect(spun[i]![1]).toBeCloseTo(2 * c[1] - B[1], 12);
    }
  });

  it('⭐ leftPieces 的边界是**闭合**的 —— 跨过索引 0 的那一段不能被数成两段', () => {
    /**
     * ⚠️ 把首尾环绕去掉活了下来,因为测过的角度恰好都没跨过 φ = 0。
     *   椭圆是凸的,只要切得到就**恒为 1 块** —— 一圈扫下来必然有跨 0 的情形。
     */
    let crossed = 0;
    for (let k = 0; k < 360; k += 1) {
      const t = (2 * Math.PI * k) / 360;
      if (hitState(ellipse, ellipse.startP, t) !== 'crosses') continue;
      expect(leftPieces(ellipse, ellipse.startP, t), `θ=${t} 被数成了多块`).toBe(1);
      crossed += 1;
    }
    expect(crossed, '一个切得到的角度都没有').toBeGreaterThan(30);
  });

  it('⭐ 整块都在左边时是 **1** 块,不是 0 块', () => {
    let seenAll = 0;
    let seenNone = 0;
    for (let k = 0; k < 240; k += 1) {
      const t = (2 * Math.PI * k) / 240;
      const st = hitState(ellipse, ellipse.startP, t);
      if (st === 'misses-left') { expect(leftPieces(ellipse, ellipse.startP, t)).toBe(1); seenAll += 1; }
      if (st === 'misses-right') { expect(leftPieces(ellipse, ellipse.startP, t)).toBe(0); seenNone += 1; }
    }
    expect(seenAll).toBeGreaterThan(10);
    expect(seenNone).toBeGreaterThan(10);
  });

  it('⭐⭐ centroidLineShare 的分母必须**配套** —— 两边加起来要精确等于 1', () => {
    /**
     * ⚠️ 分母换成更准的 `totalArea` 活了下来:两者只差 1e-5,
     *   而所有断言的容差都比这宽得多。
     *   钉法是这条恒等式:同一条线两侧的占比,加起来必须**精确**是 1。
     *   分母一旦不配套,这个和就会偏离 1 大约 1e-5。
     */
    for (const s of SHAPES) {
      for (const P of [s.startP, [6.1, -2.2] as const, [-5.4, 2.8] as const]) {
        const a = centroidLineShare(s, P);
        const b = areaLeft(s, P, angleTo(P, centroid(s)) + Math.PI) / matchedTotal(s);
        expect(a + b, `${s.id}`).toBeCloseTo(1, 10);
      }
    }
  });
});


describe('countRuns —— 环形数组数段数', () => {
  const T = true;
  const F = false;

  it('全真是一段,全假是零段', () => {
    expect(countRuns([T, T, T, T])).toBe(1);
    expect(countRuns([F, F, F])).toBe(0);
    expect(countRuns([])).toBe(0);
  });

  it('⭐ 一段**恰好从下标 0 开始** —— 变异体正是从这里溜过去的', () => {
    expect(countRuns([T, T, F, F])).toBe(1);
    expect(countRuns([T, F, F, F])).toBe(1);
  });

  it('⭐ 一段**跨过首尾** —— 不能被数成两段', () => {
    expect(countRuns([T, F, F, T])).toBe(1);
    expect(countRuns([T, T, F, F, T])).toBe(1);
  });

  it('两段就是两段', () => {
    expect(countRuns([T, F, T, F])).toBe(2);
    expect(countRuns([F, T, F, T, F, T])).toBe(3);
  });

  it('单个元素', () => {
    expect(countRuns([T])).toBe(1);
    expect(countRuns([F])).toBe(0);
  });
});

describe('⭐ 论点前置:IVT 要的三样东西', () => {
  it('恰好三条,而且**只有一条**是难的', () => {
    expect(IVT_NEEDS).toHaveLength(3);
    const hard = IVT_NEEDS.filter((n) => n.hard);
    expect(hard).toHaveLength(1);
    expect(hard[0]!.n).toBe('3');
  });

  it('每一条都说清了「在这道题里是什么」', () => {
    for (const n of IVT_NEEDS) {
      expect(n.what.length).toBeGreaterThan(10);
      expect(n.here.length).toBeGreaterThan(30);
    }
  });

  it('⭐ 难的那一条必须点名 π —— 否则它就没说到点子上', () => {
    expect(IVT_NEEDS.find((n) => n.hard)!.here).toContain('π');
  });

  it('编号是 1、2、3,不重不漏', () => {
    expect(IVT_NEEDS.map((n) => n.n)).toEqual(['1', '2', '3']);
  });
});
