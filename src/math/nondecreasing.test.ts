/**
 * `nondecreasing.ts` 的测试。
 *
 * 三个重点:
 * ① 两条求值路径(段内插值 vs 从左端累加)在整个行程上必须一致;
 * ② 两条判定路径(逐对检查 vs 逐段斜率)对两张图必须给出同一个结论;
 * ③ ⭐**「输出相等」≠「中间是平的」** —— 这一条只在有下坡的图上才现形,
 *    而它正是最容易写成"看两端输出就下结论"的地方。
 */
import { describe, it, expect } from 'vitest';
import {
  EPS,
  GRAPHS,
  GRAPH_ORDER,
  STEP,
  cornerHeights,
  fallingSegments,
  flatSegments,
  netRise,
  polyline,
  readPair,
  sectionShapes,
  shapeByNetRise,
  shapeByOutputs,
  shapeOfSegment,
  slopeOf,
  snapPair,
  snapX,
  spanIsFlat,
  suggestCounterexample,
  valueByAccumulatedRise,
  valueBySegment,
  verdictByAllPairs,
  verdictBySlopes,
  type PiecewiseGraph,
} from './nondecreasing';

const STEPS = GRAPHS.steps;
const DIP = GRAPHS.dip;

/** 整个滑块行程上的每一个格点 */
function everyStep(graph: PiecewiseGraph): number[] {
  const out: number[] = [];
  for (let i = Math.round(graph.domain.a / STEP); i <= Math.round(graph.domain.b / STEP); i += 1) {
    out.push(snapX(i * STEP));
  }
  return out;
}

describe('⭐ 提示词钉死的形状:平 → 升 → 平 → 升', () => {
  it('四段的斜率依次是 0, 正, 0, 正', () => {
    const slopes = STEPS.segments.map(slopeOf);
    expect(slopes).toHaveLength(4);
    expect(slopes[0]).toBe(0);
    expect(slopes[1]!).toBeGreaterThan(0);
    expect(slopes[2]).toBe(0);
    expect(slopes[3]!).toBeGreaterThan(0);
  });

  it('曲线连续 —— 每一段的终点就是下一段的起点', () => {
    for (const graph of GRAPH_ORDER.map((id) => GRAPHS[id])) {
      for (let i = 1; i < graph.segments.length; i += 1) {
        expect(graph.segments[i]!.from).toBe(graph.segments[i - 1]!.to);
        expect(graph.segments[i]!.yFrom).toBeCloseTo(graph.segments[i - 1]!.yTo, 12);
      }
    }
  });

  it('⚠️ 两张图首尾完全相同 —— 差别只在中间', () => {
    // 这不是巧合,是刻意的:起点终点一样,学生才会去看中间发生了什么。
    for (const graph of [STEPS, DIP]) {
      expect(valueBySegment(graph, 0)).toBe(1);
      expect(valueBySegment(graph, 8)).toBe(5);
    }
    expect(STEPS.domain).toEqual(DIP.domain);
  });

  it('dip 图正好有一段在下坡,而 steps 图一段都没有', () => {
    expect(fallingSegments(DIP)).toHaveLength(1);
    expect(fallingSegments(STEPS)).toHaveLength(0);
    expect(flatSegments(STEPS)).toHaveLength(2);
  });

  it('钉住的几个值', () => {
    expect(valueBySegment(STEPS, 1)).toBe(1); // 第一段平的
    expect(valueBySegment(STEPS, 3)).toBe(2); // 爬到一半
    expect(valueBySegment(STEPS, 5)).toBe(3); // 第二段平的
    expect(valueBySegment(DIP, 4)).toBe(3); // 峰顶
    expect(valueBySegment(DIP, 5)).toBe(2); // 谷底
  });
});

describe('⭐ 求值:两条独立路径必须一致', () => {
  it('整个行程、两张图上都相等', () => {
    for (const graph of [STEPS, DIP]) {
      for (const x of everyStep(graph)) {
        const a = valueBySegment(graph, x);
        const b = valueByAccumulatedRise(graph, x);
        expect(a).not.toBeNull();
        expect(b).not.toBeNull();
        expect(a!, `${graph.id} at x=${x}`).toBeCloseTo(b!, 10);
      }
    }
  });

  it('在拐点上也相等 —— 那是插值与累加最容易分岔的地方', () => {
    for (const graph of [STEPS, DIP]) {
      for (const segment of graph.segments) {
        for (const x of [segment.from, segment.to]) {
          expect(valueBySegment(graph, x)!).toBeCloseTo(valueByAccumulatedRise(graph, x)!, 10);
        }
      }
    }
  });

  it('域外与非有限输入返回 null,不返回 NaN', () => {
    for (const graph of [STEPS, DIP]) {
      for (const bad of [-0.5, 8.5, Number.NaN, Number.POSITIVE_INFINITY]) {
        expect(valueBySegment(graph, bad)).toBeNull();
        expect(valueByAccumulatedRise(graph, bad)).toBeNull();
      }
    }
  });

  it('行程上任何一点都不会是 NaN', () => {
    for (const graph of [STEPS, DIP]) {
      for (const x of everyStep(graph)) {
        expect(Number.isFinite(valueBySegment(graph, x)!), `${graph.id} at ${x}`).toBe(true);
      }
    }
  });
});

describe('⭐ 一对输入的关系:两条独立路径必须一致', () => {
  it('所有格点对上,「比两端输出」与「累加净涨跌」给出同一个答案', () => {
    for (const graph of [STEPS, DIP]) {
      const xs = everyStep(graph).filter((_, i) => i % 3 === 0); // 采样,不然是 O(n²) 的大表
      for (let i = 0; i < xs.length; i += 1) {
        for (let j = i + 1; j < xs.length; j += 1) {
          const x1 = xs[i]!;
          const x2 = xs[j]!;
          const byOutputs = shapeByOutputs(valueBySegment(graph, x1)!, valueBySegment(graph, x2)!);
          expect(shapeByNetRise(graph, x1, x2), `${graph.id} ${x1}→${x2}`).toBe(byOutputs);
        }
      }
    }
  });

  it('净涨跌与两端输出之差相等', () => {
    for (const graph of [STEPS, DIP]) {
      for (const [x1, x2] of [[0, 8], [1, 3], [2, 6], [4, 5], [3.5, 5.5]] as const) {
        const delta = valueBySegment(graph, x2)! - valueBySegment(graph, x1)!;
        expect(netRise(graph, x1, x2), `${graph.id} ${x1}→${x2}`).toBeCloseTo(delta, 10);
      }
    }
  });

  it('平坦段上两点:输出相等,`≤` 成立而 `<` 不成立', () => {
    const reading = readPair(STEPS, 0.5, 1.8)!;
    expect(reading.shape).toBe('flat');
    expect(reading.y1).toBe(reading.y2);
    expect(reading.satisfiesNondecreasing).toBe(true);
    expect(reading.satisfiesStrict).toBe(false); // ⭐ 这就是 ≤ 与 < 的全部差别
  });

  it('上坡段上两点:两个都成立', () => {
    const reading = readPair(STEPS, 2.5, 3.5)!;
    expect(reading.shape).toBe('up');
    expect(reading.satisfiesNondecreasing).toBe(true);
    expect(reading.satisfiesStrict).toBe(true);
  });

  it('跨过下坡:两个都不成立', () => {
    const reading = readPair(DIP, 4, 5)!;
    expect(reading.shape).toBe('down');
    expect(reading.satisfiesNondecreasing).toBe(false);
    expect(reading.satisfiesStrict).toBe(false);
  });
});

describe('⭐⭐ 「输出相等」不等于「中间是平的」', () => {
  // 这一条是这个模块里最容易写错的地方,单开一节。
  it('在**非递减**的图上,输出相等确实意味着中间全平', () => {
    // 往上走一步就再也回不来 —— 所以相等只可能来自全程平坦。
    for (const x1 of everyStep(STEPS)) {
      for (const x2 of everyStep(STEPS)) {
        if (x2 <= x1) continue;
        const reading = readPair(STEPS, x1, x2)!;
        if (reading.shape === 'flat') {
          expect(reading.flatBetween, `steps ${x1}→${x2} 相等却不平`).toBe(true);
        }
      }
    }
  });

  it('⚠️ 但在**有下坡**的图上不成立:f(3.5) = f(5.5),中间却先上后下', () => {
    const reading = readPair(DIP, 3.5, 5.5)!;
    expect(reading.y1).toBeCloseTo(2.5, 10);
    expect(reading.y2).toBeCloseTo(2.5, 10);
    expect(reading.shape).toBe('flat'); // 两端确实相等
    expect(reading.flatBetween).toBe(false); // 但中间根本不平
    // 如果 spanIsFlat 是从 y1 === y2 反推的,上面这行会红 ——
    // 而界面会指着一段起伏说"这里是平的"。
  });

  it('spanIsFlat 只在整段斜率都为零时为真', () => {
    expect(spanIsFlat(STEPS, 0, 2)).toBe(true);
    expect(spanIsFlat(STEPS, 4, 6)).toBe(true);
    expect(spanIsFlat(STEPS, 1, 3)).toBe(false); // 越过了上坡的起点
    expect(spanIsFlat(DIP, 4, 5)).toBe(false);
  });

  it('退化区间(两点重合)算平', () => {
    expect(spanIsFlat(STEPS, 3, 3)).toBe(true);
  });
});

describe('⭐ 整张图的判定:两条独立路径', () => {
  it('steps 图:两条路径都说成立', () => {
    expect(verdictByAllPairs(STEPS).status).toBe('holds-on-grid');
    expect(verdictBySlopes(STEPS).status).toBe('holds-on-grid');
  });

  it('dip 图:两条路径都说被证否', () => {
    expect(verdictByAllPairs(DIP).status).toBe('refuted');
    expect(verdictBySlopes(DIP).status).toBe('refuted');
  });

  it('⚠️ 两条路径给的反例不必相同,但**都必须真的是反例**', () => {
    // 逐对检查找到的是格点上最先撞见的一对;逐段斜率给的是整段下坡的两端。
    // 断言"两者相等"会把一个正确实现判成错的。
    for (const verdict of [verdictByAllPairs(DIP), verdictBySlopes(DIP)]) {
      const c = verdict.counterexample!;
      expect(c).not.toBeNull();
      expect(c.x1).toBeLessThan(c.x2);
      expect(readPair(DIP, c.x1, c.x2)!.shape).toBe('down');
    }
  });

  it('成立时没有反例,措辞也只敢说 holds-on-grid', () => {
    const verdict = verdictByAllPairs(STEPS);
    expect(verdict.counterexample).toBeNull();
    expect(verdict.status).not.toBe('proved');
    expect(verdict.checked).toBeGreaterThan(100);
  });

  it('细一点的格子也不会让 steps 图翻案', () => {
    expect(verdictByAllPairs(STEPS, 0.1).status).toBe('holds-on-grid');
  });
});

describe('给「你能破坏它吗」的提示', () => {
  it('dip 图:给出的一对真的会失败,而且落在格点上', () => {
    const hint = suggestCounterexample(DIP)!;
    expect(hint).not.toBeNull();
    expect(readPair(DIP, hint.x1, hint.x2)!.shape).toBe('down');
    // 提示的值必须是滑块停得住的值 —— 否则界面会让人去拖一个到不了的位置
    expect(snapX(hint.x1)).toBeCloseTo(hint.x1, 10);
    expect(snapX(hint.x2)).toBeCloseTo(hint.x2, 10);
    expect(hint.x1).toBeGreaterThanOrEqual(DIP.domain.a);
    expect(hint.x2).toBeLessThanOrEqual(DIP.domain.b);
  });

  it('steps 图:没有反例,就不许编一个出来', () => {
    expect(suggestCounterexample(STEPS)).toBeNull();
  });
});

describe('⭐ 吸附一对输入:顺序与间隔不许在吸附里丢掉', () => {
  it('无论传进来什么,出来的一对永远 x₁ < x₂,而且都在格点上、都在定义域内', () => {
    const raw = [-3, -0.04, 0, 0.03, 1.96, 2.01, 2, 4.5, 7.98, 8, 8.4, 12];
    for (const graph of [STEPS, DIP]) {
      for (const p of raw) {
        for (const q of raw) {
          const pair = snapPair(graph, { x1: p, x2: q });
          expect(pair.x1, `${p}/${q}`).toBeLessThan(pair.x2);
          expect(pair.x2 - pair.x1).toBeGreaterThanOrEqual(STEP - EPS);
          for (const v of [pair.x1, pair.x2]) {
            expect(snapX(v)).toBeCloseTo(v, 10);
            expect(v).toBeGreaterThanOrEqual(graph.domain.a - EPS);
            expect(v).toBeLessThanOrEqual(graph.domain.b + EPS);
          }
        }
      }
    }
  });

  it('⚠️ 各自吸到同一格的那一对不会重合', () => {
    // 1.96 与 2.01 各自吸附都是 2.0 —— 不处理的话两点当场重合。
    const pair = snapPair(STEPS, { x1: 1.96, x2: 2.01 });
    expect(pair.x1).not.toBe(pair.x2);
    expect(pair.x1).toBeCloseTo(2, 10);
    expect(pair.x2).toBeCloseTo(2.1, 10);
  });

  it('⚠️ 顶到右端点也不会重合 —— 这时把两个一起往左让一格', () => {
    const pair = snapPair(STEPS, { x1: 8, x2: 8 });
    expect(pair.x1).toBeCloseTo(7.9, 10);
    expect(pair.x2).toBeCloseTo(8, 10);
  });

  it('顺序传反了也会被纠正回来', () => {
    const pair = snapPair(STEPS, { x1: 6, x2: 2 });
    expect(pair.x1).toBeLessThan(pair.x2);
  });

  it('已经合法的一对原样通过', () => {
    const pair = snapPair(STEPS, { x1: 1, x2: 5 });
    expect(pair.x1).toBeCloseTo(1, 10);
    expect(pair.x2).toBeCloseTo(5, 10);
  });
});

describe('画面要用的那几个派生量', () => {
  it('每一段的走向', () => {
    expect(sectionShapes(STEPS)).toEqual(['flat', 'up', 'flat', 'up']);
    expect(sectionShapes(DIP)).toEqual(['flat', 'up', 'down', 'up']);
  });

  it('shapeOfSegment 与 sectionShapes 一致,而且每段一个', () => {
    for (const graph of [STEPS, DIP]) {
      expect(sectionShapes(graph)).toHaveLength(graph.segments.length);
      graph.segments.forEach((s, i) => expect(shapeOfSegment(s)).toBe(sectionShapes(graph)[i]));
    }
  });

  it('y 轴刻度用的是折线真的到过的高度,去重且升序', () => {
    // ⚠️ 等距刻度(2、4)会把"平台停在 1、3、5"这件事藏起来。
    expect(cornerHeights(STEPS)).toEqual([1, 3, 5]);
    expect(cornerHeights(DIP)).toEqual([1, 2, 3, 5]);
    for (const graph of [STEPS, DIP]) {
      const hs = cornerHeights(graph);
      expect([...hs].sort((a, b) => a - b)).toEqual([...hs]);
      expect(new Set(hs).size).toBe(hs.length);
      // 每个高度都真的是某个拐点的高度
      for (const h of hs) {
        expect(graph.segments.some((s) => Math.abs(s.yFrom - h) < EPS || Math.abs(s.yTo - h) < EPS)).toBe(true);
      }
    }
  });
});

describe('画线用的折线', () => {
  it('每个拐点都在,而且首尾就是定义域两端', () => {
    for (const graph of [STEPS, DIP]) {
      const points = polyline(graph);
      expect(points).toHaveLength(graph.segments.length + 1);
      expect(points[0]!.x).toBe(graph.domain.a);
      expect(points[points.length - 1]!.x).toBe(graph.domain.b);
      // ⚠️ 拐点必须原样在列表里。等距取样会把 (4, 3) 这种尖角磨圆,
      //    而"哪里开始变平"正是这一节要看清的东西。
      for (const point of points) {
        expect(valueBySegment(graph, point.x)!).toBeCloseTo(point.y, 10);
      }
    }
  });
});

describe('吸附与容差', () => {
  it('钉住的那几个 x 都踩得到', () => {
    for (const x of [2, 4, 5, 6, 3.5, 5.5]) expect(snapX(x)).toBeCloseTo(x, 10);
  });

  it('⚠️ 吸附到**最近**的格点,不是往左取整', () => {
    // 变异测试抓到的洞:把 round 换成 floor,上面那条全绿 ——
    // 因为 2 / 0.1、3.5 / 0.1 都除得尽,两者答案相同。
    // 但拖动传进来的是**任意实数**,floor 会让每一次拖动都系统性地偏左半格。
    expect(snapX(2.06)).toBeCloseTo(2.1, 10);
    expect(snapX(2.04)).toBeCloseTo(2.0, 10);
    expect(snapX(-0.04)).toBeCloseTo(0, 10);
  });

  it('⚠️ 右端点够得到 —— 往左取整的话 x = 8 永远差一点', () => {
    expect(snapX(7.97)).toBeCloseTo(8, 10);
  });

  it('容差比格点上可能出现的浮点噪声大得多,又比真实差值小得多', () => {
    expect(EPS).toBeLessThan(0.01);
    expect(EPS).toBeGreaterThan(Number.EPSILON);
  });
});
