import { describe, expect, it } from 'vitest';
import {
  ALPHA_MAX, N, OMEGA, STEPS, HEADLINE, MAIN_IDEA, TRAP, RHOMBUS_NOTE,
  centerBottom, centerTop, secondPoint, centerDistance, centralAngle, halfAngleAtNail,
  diskArea, sectorArea, triangleArea, segmentArea,
  overlapClosed, overlapByDistance, shadedClosed, shadedByDistance, shadedByGrid,
  rate, rateNumeric, fastestAlpha, shadedBoundary, polygonArea, circlePoints,
  degrees, show,
} from './rotatingDisks';

const R = 1.3;
/** 取样角,避开两个端点,也包含它们。 */
const ANGLES = [0, 0.2, Math.PI / 6, 1, Math.PI / 2, 2, 2.6, Math.PI];
const INNER = ANGLES.filter((a) => a > 1e-9 && a < Math.PI - 1e-9);

const dist = (a: readonly [number, number], b: readonly [number, number]) =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);

/* ── 几何先站住 ────────────────────────────────────────────────── */

describe('the four points', () => {
  it('⭐⭐ N O₁ M O₂ 四条边都是半径 —— 这就是「菱形」那一步的全部依据', () => {
    let checked = 0;
    for (const a of ANGLES) {
      const o1 = centerBottom(R);
      const o2 = centerTop(R, a);
      const m = secondPoint(R, a);
      expect(dist(N, o1)).toBeCloseTo(R, 12);
      expect(dist(o1, m)).toBeCloseTo(R, 12);
      expect(dist(m, o2)).toBeCloseTo(R, 12);
      expect(dist(o2, N)).toBeCloseTo(R, 12);
      checked += 1;
    }
    expect(checked).toBe(ANGLES.length);
  });

  it('⚠️ M 确实同时落在两个圆上 —— 它是用菱形拿到的,不是解方程解的', () => {
    for (const a of ANGLES) {
      const m = secondPoint(R, a);
      expect(dist(m, centerBottom(R))).toBeCloseTo(R, 12);
      expect(dist(m, centerTop(R, a))).toBeCloseTo(R, 12);
    }
  });

  it('⭐⭐⭐ 弦 NM 把角 α 平分 —— 题面说「可以假设」,其实是定理', () => {
    let checked = 0;
    for (const a of INNER) {
      expect(halfAngleAtNail(R, a)!).toBeCloseTo(a / 2, 10);
      checked += 1;
    }
    expect(checked).toBe(INNER.length);
  });

  it('⚠️ α = π 时 M 退回 N,那个半角没有定义 —— 返回 null,不编数', () => {
    const m = secondPoint(R, Math.PI);
    expect(dist(m, N)).toBeCloseTo(0, 12);
    expect(halfAngleAtNail(R, Math.PI)).toBeNull();
  });

  it('⭐ 圆心角量出来正好是 π − α', () => {
    for (const a of ANGLES) {
      expect(centralAngle(R, a)).toBeCloseTo(Math.PI - a, 10);
    }
  });

  it('⭐ 圆心距量出来正好是 2r sin(α/2)', () => {
    for (const a of ANGLES) {
      expect(centerDistance(R, a)).toBeCloseTo(2 * R * Math.sin(a / 2), 12);
    }
    // 两个端点的意义:重合 → 0;相切 → 2r
    expect(centerDistance(R, 0)).toBeCloseTo(0, 12);
    expect(centerDistance(R, Math.PI)).toBeCloseTo(2 * R, 12);
  });

  it('上盘圆心确实是下盘圆心绕 N 转过 α 的像(长度不变,夹角是 α)', () => {
    for (const a of INNER) {
      const o1 = centerBottom(R);
      const o2 = centerTop(R, a);
      expect(Math.hypot(...o2)).toBeCloseTo(R, 12);
      const cos = (o1[0] * o2[0] + o1[1] * o2[1]) / (R * R);
      expect(Math.acos(Math.min(1, Math.max(-1, cos)))).toBeCloseTo(a, 10);
    }
  });
});

/* ── ⭐ 三条互不相干的路径 ─────────────────────────────────────── */

describe('three independent routes to the same area', () => {
  it('⭐⭐ 闭式(走角度)和圆心距公式(走距离)处处一致', () => {
    let compared = 0;
    for (const a of ANGLES) {
      expect(shadedByDistance(R, a)).toBeCloseTo(shadedClosed(R, a), 10);
      expect(overlapByDistance(R, a)).toBeCloseTo(overlapClosed(R, a), 10);
      compared += 1;
    }
    expect(compared).toBe(ANGLES.length);
  });

  it('⭐⭐ 纯数值(撒格点)也对得上', () => {
    // 格点法精度有限,给一个和格距相称的容差
    for (const a of [0.6, Math.PI / 2, 2.2]) {
      expect(shadedByGrid(R, a, 500)).toBeCloseTo(shadedClosed(R, a), 1);
    }
  });

  it('⚠️ 两个端点上的值必须说得通', () => {
    // α = 0:完全盖住,什么也看不见
    expect(shadedClosed(R, 0)).toBeCloseTo(0, 12);
    expect(overlapClosed(R, 0)).toBeCloseTo(diskArea(R), 12);
    // α = π:只在 N 处相切,下盘整个露出来
    expect(shadedClosed(R, Math.PI)).toBeCloseTo(diskArea(R), 12);
    expect(overlapClosed(R, Math.PI)).toBeCloseTo(0, 12);
  });

  it('⚠️ 面积一路单调增 —— 转得越多露得越多,不许中途回头', () => {
    let prev = -1;
    for (let i = 0; i <= 200; i += 1) {
      const a = (Math.PI * i) / 200;
      const v = shadedClosed(R, a);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = v;
    }
  });

  it('⚠️ 面积永远夹在 0 和整圆之间', () => {
    for (let i = 0; i <= 100; i += 1) {
      const a = (Math.PI * i) / 100;
      expect(shadedClosed(R, a)).toBeGreaterThanOrEqual(-1e-12);
      expect(shadedClosed(R, a)).toBeLessThanOrEqual(diskArea(R) + 1e-12);
    }
  });
});

/* ── 组成部分 ──────────────────────────────────────────────────── */

describe('the pieces the derivation uses', () => {
  it('弓形 = 扇形 − 三角形,而且两个弓形拼起来就是那块透镜', () => {
    for (const a of INNER) {
      const theta = Math.PI - a;
      expect(segmentArea(R, theta)).toBeCloseTo(sectorArea(R, theta) - triangleArea(R, theta), 12);
      expect(2 * segmentArea(R, theta)).toBeCloseTo(overlapClosed(R, a), 10);
    }
  });

  it('⭐ sin(π − α) = +sin α —— 第 5 步最容易丢的那个符号', () => {
    for (const a of INNER) {
      expect(Math.sin(Math.PI - a)).toBeCloseTo(Math.sin(a), 12);
      expect(triangleArea(R, Math.PI - a)).toBeCloseTo(0.5 * R * R * Math.sin(a), 12);
      expect(triangleArea(R, Math.PI - a)).toBeGreaterThan(0);   // 不是负的
    }
  });

  it('手推的几个值', () => {
    // α = π/2:A = r²(π/2 + 1)
    expect(shadedClosed(1, Math.PI / 2)).toBeCloseTo(Math.PI / 2 + 1, 12);
    // 重叠 = r²(π − π/2 − 1) = r²(π/2 − 1)
    expect(overlapClosed(1, Math.PI / 2)).toBeCloseTo(Math.PI / 2 - 1, 12);
    // 两者之和是整圆
    expect(shadedClosed(1, Math.PI / 2) + overlapClosed(1, Math.PI / 2)).toBeCloseTo(Math.PI, 12);
  });
});

/* ── ⭐⭐⭐ 变化率:这一课的答案 ──────────────────────────────── */

describe('the rate', () => {
  it('⭐ 解析式和数值差商处处一致', () => {
    // 一个求导,一个只做减法。
    let compared = 0;
    for (const a of INNER) {
      const num = rateNumeric(R, a);
      expect(num).not.toBeNull();
      expect(num!).toBeCloseTo(rate(R, a), 6);
      compared += 1;
    }
    expect(compared).toBe(INNER.length);
  });

  it('⭐⭐⭐ 角速度是常数,变化率**不是** —— 这一课的全部内容', () => {
    const start = rate(R, 0);
    const mid = rate(R, Math.PI / 2);
    const end = rate(R, Math.PI);
    expect(start).toBeCloseTo(2 * R * R * OMEGA, 12);   // (1 + 1)·r²ω
    expect(mid).toBeCloseTo(R * R * OMEGA, 12);         // (1 + 0)·r²ω
    expect(end).toBeCloseTo(0, 12);                     // (1 − 1)·r²ω
    expect(start).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(end);
    // 而 ω 从头到尾没变过
    expect(OMEGA).toBe(0.5);
  });

  it('⭐ 最快的那一刻是 α = 0 —— 露出来的还只是一道细缝', () => {
    expect(fastestAlpha()).toBe(0);
    const best = rate(R, 0);
    for (let i = 1; i <= 200; i += 1) {
      expect(rate(R, (Math.PI * i) / 200)).toBeLessThanOrEqual(best + 1e-12);
    }
  });

  it('⚠️ 变化率一路不增,而且终点正好是 0(不是「接近 0」)', () => {
    let prev = Infinity;
    for (let i = 0; i <= 200; i += 1) {
      const v = rate(R, (Math.PI * i) / 200);
      expect(v).toBeLessThanOrEqual(prev + 1e-12);
      expect(v).toBeGreaterThanOrEqual(-1e-12);
      prev = v;
    }
    expect(rate(R, Math.PI)).toBe(0);
  });

  it('题目给的 0.5 rad/s 下,答案就是 (r²/2)(1 + cos α)', () => {
    for (const a of ANGLES) {
      expect(rate(R, a, 0.5)).toBeCloseTo((R * R / 2) * (1 + Math.cos(a)), 12);
    }
  });

  it('⚠️ 变化率和半径是平方关系 —— 盘子大一倍,快四倍', () => {
    for (const a of INNER) {
      expect(rate(2, a)).toBeCloseTo(4 * rate(1, a), 10);
    }
  });

  it('⚠️ 步长跨出定义域时 rateNumeric 说 null,不去框外取值', () => {
    expect(rateNumeric(R, 0)).toBeNull();
    expect(rateNumeric(R, ALPHA_MAX)).toBeNull();
    expect(rateNumeric(R, 0.5)).not.toBeNull();
  });
});

/* ── ⭐⭐ 画出来的那块阴影,面积必须是真的 ──────────────────── */

describe('the drawn region is the real region', () => {
  it('⭐⭐⭐ 边界多边形的鞋带面积 = 闭式面积', () => {
    // 这一条让「图画错了」变成一个会红的测试,而不是只能靠眼睛看。
    let checked = 0;
    for (const a of INNER) {
      const poly = shadedBoundary(R, a, 400);
      expect(polygonArea(poly)).toBeCloseTo(shadedClosed(R, a), 3);
      checked += 1;
    }
    expect(checked).toBe(INNER.length);
  });

  it('⚠️ 边界的每个点都真的落在某一个圆上', () => {
    for (const a of [0.7, Math.PI / 2, 2.4]) {
      const o1 = centerBottom(R);
      const o2 = centerTop(R, a);
      for (const p of shadedBoundary(R, a, 60)) {
        const d1 = Math.abs(dist(p, o1) - R);
        const d2 = Math.abs(dist(p, o2) - R);
        expect(Math.min(d1, d2)).toBeLessThan(1e-9);
      }
    }
  });

  it('⚠️ 边界不许跑到上盘内部去 —— 那块地方是被盖住的', () => {
    for (const a of [0.7, Math.PI / 2, 2.4]) {
      const o2 = centerTop(R, a);
      for (const p of shadedBoundary(R, a, 120)) {
        expect(dist(p, o2)).toBeGreaterThan(R - 1e-9);
      }
    }
  });

  it('边界从 N 出发,也回到 N', () => {
    for (const a of INNER) {
      const poly = shadedBoundary(R, a, 40);
      expect(dist(poly[0]!, N)).toBeLessThan(1e-9);
      expect(dist(poly[poly.length - 1]!, N)).toBeLessThan(1e-9);
    }
  });

  it('circlePoints 画出来的是整整一圈', () => {
    const c: readonly [number, number] = [0.4, -0.2];
    const pts = circlePoints(c, R, 200);
    for (const p of pts) expect(dist(p, c)).toBeCloseTo(R, 12);
    expect(polygonArea(pts)).toBeCloseTo(diskArea(R), 2);
  });

  it('⚠️ 鞋带公式不在乎绕向', () => {
    const square: readonly (readonly [number, number])[] = [[0, 0], [2, 0], [2, 2], [0, 2]];
    expect(polygonArea(square)).toBeCloseTo(4, 12);
    expect(polygonArea([...square].reverse())).toBeCloseTo(4, 12);
  });
});

/* ── 讲解 ──────────────────────────────────────────────────────── */

describe('the written derivation', () => {
  it('⭐ 八步,每一步都带「这里最容易错在哪」', () => {
    expect(STEPS).toHaveLength(8);
    expect(STEPS.map((s) => s.n)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
    for (const s of STEPS) {
      expect(s.title.length).toBeGreaterThan(10);
      expect(s.body.length).toBeGreaterThan(80);
      expect(s.watch!.length).toBeGreaterThan(20);
    }
  });

  it('关键的几个式子确实写在步骤里', () => {
    const tex = STEPS.map((s) => s.tex ?? '').join(' ');
    expect(tex).toContain('\\pi-\\alpha');
    expect(tex).toContain('\\sin\\alpha');
    expect(tex).toContain('\\frac{dA}{dt}');
  });

  it('⭐ 那句要打掉的话写清楚了', () => {
    expect(TRAP.toLowerCase()).toContain('constant');
    expect(TRAP).toContain('1 + cos');
    expect(RHOMBUS_NOTE.toLowerCase()).toContain('rhombus');
    expect(MAIN_IDEA.length).toBeGreaterThan(80);
    expect(HEADLINE.length).toBeGreaterThan(10);
  });

  it('degrees / show 规矩', () => {
    expect(degrees(Math.PI)).toBeCloseTo(180, 12);
    expect(degrees(0)).toBe(0);
    expect(show(null)).toBe('undefined');
    expect(show(Number.NaN)).toBe('undefined');
    expect(show(Number.POSITIVE_INFINITY)).toBe('undefined');
    expect(show(1.5, 2)).toContain('1.5');
  });
});
