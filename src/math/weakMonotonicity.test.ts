/**
 * `weakMonotonicity.ts` 的测试 —— 非递减与非递增,**同一套断言跑两遍**。
 *
 * 四个重点:
 * ① 两条求值路径(段内插值 vs 从左端累加)在整个行程上必须一致;
 * ② 两条判定路径(逐对检查 vs 逐段走向)对四张图必须给出同一个结论,
 *    而且要与图上声明的 `shouldHold` 对得上;
 * ③ ⭐**「输出相等」≠「中间是平的」** —— 两张不合格的图上各现形一次;
 * ④ ⭐**允不允许是「方向」的属性,不是「走向」的属性**。
 *    升在非递减里合法、在非递增里犯规。把 allowed 写死在走向上,
 *    另一节课就会指着一段上坡说"允许"。
 *
 * ⚠️ 凡是能参数化的断言都参数化:两节课共用一个模块,
 *    只测其中一个方向等于把另一节课整个放空。
 */
import { describe, it, expect } from 'vitest';
import {
  DIRECTION,
  DIRECTION_ORDER,
  EPS,
  GRAPHS,
  STEP,
  comparisonSymbol,
  cornerHeights,
  flatSegments,
  graphsFor,
  isAllowed,
  netRise,
  offendingSegments,
  polyline,
  readPair,
  satisfiesStrict,
  sectionShapes,
  shapeByNetRise,
  shapeByOutputs,
  shapeNote,
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
  type Direction,
  type PiecewiseGraph,
  type Shape,
} from './weakMonotonicity';
import { RELATIONS } from './monotonicity';

const ALL = Object.values(GRAPHS);
const STEPS = GRAPHS.steps;
const DIP = GRAPHS.dip;
const FALLING = GRAPHS.fallingSteps;
const BUMP = GRAPHS.bump;

/** 整个滑块行程上的每一个格点 */
function everyStep(graph: PiecewiseGraph): number[] {
  const out: number[] = [];
  for (let i = Math.round(graph.domain.a / STEP); i <= Math.round(graph.domain.b / STEP); i += 1) {
    out.push(snapX(i * STEP));
  }
  return out;
}

/* ══ 方向本身 ══════════════════════════════════════════════════════ */

describe('⭐⭐ 方向:允不允许是方向的属性,不是走向的属性', () => {
  it('平坦在两个方向下都允许 —— 这就是弱版本的全部意义', () => {
    for (const d of DIRECTION_ORDER) expect(isAllowed(d, 'flat')).toBe(true);
  });

  it('升在非递减里允许、在非递增里犯规;降反过来', () => {
    expect(isAllowed('nondecreasing', 'up')).toBe(true);
    expect(isAllowed('nondecreasing', 'down')).toBe(false);
    expect(isAllowed('nonincreasing', 'up')).toBe(false);
    expect(isAllowed('nonincreasing', 'down')).toBe(true);
  });

  it('⭐ 严格版本**不**接受平坦 —— 这是 < 与 ≤ 的唯一差别', () => {
    for (const d of DIRECTION_ORDER) {
      expect(satisfiesStrict(d, 'flat')).toBe(false);
      expect(isAllowed(d, 'flat')).toBe(true);
    }
  });

  it('每个方向:被禁的与被要求的正好相反,三格面板不重不漏', () => {
    for (const d of DIRECTION_ORDER) {
      const spec = DIRECTION[d];
      expect(spec.forbidden).not.toBe(spec.required);
      expect(spec.forbidden).not.toBe('flat');
      expect(spec.required).not.toBe('flat');
      expect([...spec.cells].sort()).toEqual(['down', 'flat', 'up']);
      // 被禁的那一格排在最后 —— 允许的先出场
      expect(spec.cells[spec.cells.length - 1]).toBe(spec.forbidden);
    }
  });

  it('⭐ 与 monotonicity.ts 里的关系表对得上:弱的允许平坦,严格的不允许', () => {
    // 两个模块各写一份"平坦算不算数"的话,迟早对不上。这里把它们钉在一起。
    for (const d of DIRECTION_ORDER) {
      const spec = DIRECTION[d];
      expect(RELATIONS[spec.weak].allowsFlat).toBe(true);
      expect(RELATIONS[spec.strict].allowsFlat).toBe(false);
      expect(RELATIONS[spec.weak].holds(1, 1)).toBe(true);
      expect(RELATIONS[spec.strict].holds(1, 1)).toBe(false);
      // 弱关系对"被要求的那种走向"必须成立
      const [lo, hi] = spec.required === 'up' ? [1, 2] : [2, 1];
      expect(RELATIONS[spec.weak].holds(lo, hi)).toBe(true);
      expect(RELATIONS[spec.strict].holds(lo, hi)).toBe(true);
      // 对被禁止的那种必须不成立
      expect(RELATIONS[spec.weak].holds(hi, lo)).toBe(false);
    }
  });

  it('每个方向两张图:一张该成立、一张该被证否,而且方向标对了', () => {
    for (const d of DIRECTION_ORDER) {
      const [good, broken] = graphsFor(d);
      expect(good!.shouldHold).toBe(true);
      expect(broken!.shouldHold).toBe(false);
      expect(good!.direction).toBe(d);
      expect(broken!.direction).toBe(d);
    }
  });

  it('shapeNote 的措辞跟着方向走', () => {
    expect(shapeNote('nondecreasing', 'up')).toContain('Allowed');
    expect(shapeNote('nondecreasing', 'up')).not.toContain('Not allowed');
    expect(shapeNote('nonincreasing', 'up')).toContain('Not allowed');
    expect(shapeNote('nondecreasing', 'down')).toContain('Not allowed');
    expect(shapeNote('nonincreasing', 'down')).not.toContain('Not allowed');
    for (const d of DIRECTION_ORDER) expect(shapeNote(d, 'flat')).toContain('allowed');
  });
});

/* ══ 图形 ══════════════════════════════════════════════════════════ */

describe('⭐ 提示词钉死的形状', () => {
  it('非递减:平 → 升 → 平 → 升', () => {
    expect(sectionShapes(STEPS)).toEqual(['flat', 'up', 'flat', 'up']);
  });

  it('非递增:降 → 平 → 降', () => {
    expect(sectionShapes(FALLING)).toEqual(['down', 'flat', 'down']);
  });

  it('两张不合格的图各有且只有一段犯规', () => {
    expect(sectionShapes(DIP)).toEqual(['flat', 'up', 'down', 'up']);
    expect(sectionShapes(BUMP)).toEqual(['down', 'up', 'flat', 'down']);
    expect(offendingSegments(DIP)).toHaveLength(1);
    expect(offendingSegments(BUMP)).toHaveLength(1);
    expect(offendingSegments(STEPS)).toHaveLength(0);
    expect(offendingSegments(FALLING)).toHaveLength(0);
  });

  it('⚠️ 同一节课的两张图首尾完全相同 —— 差别只在中间', () => {
    for (const d of DIRECTION_ORDER) {
      const [good, broken] = graphsFor(d);
      expect(valueBySegment(good!, good!.domain.a)).toBe(valueBySegment(broken!, broken!.domain.a));
      expect(valueBySegment(good!, good!.domain.b)).toBe(valueBySegment(broken!, broken!.domain.b));
      expect(good!.domain).toEqual(broken!.domain);
    }
  });

  it('两个方向首尾正好互换:1 → 5 与 5 → 1', () => {
    expect([valueBySegment(STEPS, 0), valueBySegment(STEPS, 8)]).toEqual([1, 5]);
    expect([valueBySegment(FALLING, 0), valueBySegment(FALLING, 8)]).toEqual([5, 1]);
  });

  it('曲线连续 —— 每一段的终点就是下一段的起点', () => {
    for (const graph of ALL) {
      for (let i = 1; i < graph.segments.length; i += 1) {
        expect(graph.segments[i]!.from).toBe(graph.segments[i - 1]!.to);
        expect(graph.segments[i]!.yFrom).toBeCloseTo(graph.segments[i - 1]!.yTo, 12);
      }
    }
  });

  it('斜率一律是 0 或 ±1 —— 读数好看,浮点也干净', () => {
    for (const graph of ALL) {
      for (const segment of graph.segments) {
        expect([0, 1, -1]).toContain(slopeOf(segment));
      }
    }
  });

  it('钉住的几个值', () => {
    expect(valueBySegment(STEPS, 1)).toBe(1);
    expect(valueBySegment(STEPS, 5)).toBe(3);
    expect(valueBySegment(DIP, 4)).toBe(3);
    expect(valueBySegment(DIP, 5)).toBe(2);
    expect(valueBySegment(FALLING, 4)).toBe(3); // 平台
    expect(valueBySegment(BUMP, 3)).toBe(2); // 谷底
    expect(valueBySegment(BUMP, 4)).toBe(3); // 隆起的顶
  });
});

/* ══ 求值 ══════════════════════════════════════════════════════════ */

describe('⭐ 求值:两条独立路径必须一致', () => {
  it('整个行程、四张图上都相等', () => {
    for (const graph of ALL) {
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
    for (const graph of ALL) {
      for (const segment of graph.segments) {
        for (const x of [segment.from, segment.to]) {
          expect(valueBySegment(graph, x)!).toBeCloseTo(valueByAccumulatedRise(graph, x)!, 10);
        }
      }
    }
  });

  it('域外与非有限输入返回 null,不返回 NaN', () => {
    for (const graph of ALL) {
      for (const bad of [-0.5, 8.5, Number.NaN, Number.POSITIVE_INFINITY]) {
        expect(valueBySegment(graph, bad)).toBeNull();
        expect(valueByAccumulatedRise(graph, bad)).toBeNull();
      }
    }
  });

  it('行程上任何一点都不会是 NaN', () => {
    for (const graph of ALL) {
      for (const x of everyStep(graph)) {
        expect(Number.isFinite(valueBySegment(graph, x)!), `${graph.id} at ${x}`).toBe(true);
      }
    }
  });
});

/* ══ 一对输入 ══════════════════════════════════════════════════════ */

describe('⭐ 一对输入的关系:两条独立路径必须一致', () => {
  it('所有格点对上,「比两端输出」与「累加净涨跌」给出同一个答案', () => {
    for (const graph of ALL) {
      const xs = everyStep(graph).filter((_, i) => i % 3 === 0);
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
    for (const graph of ALL) {
      for (const [x1, x2] of [[0, 8], [1, 3], [2, 6], [4, 5], [3.5, 5.5]] as const) {
        const delta = valueBySegment(graph, x2)! - valueBySegment(graph, x1)!;
        expect(netRise(graph, x1, x2), `${graph.id} ${x1}→${x2}`).toBeCloseTo(delta, 10);
      }
    }
  });

  it('⭐ 平坦段上两点:弱版本成立而严格版本不成立 —— 两个方向都一样', () => {
    for (const [graph, pair] of [
      [STEPS, [0.5, 1.8]],
      [FALLING, [2.5, 5.5]],
    ] as const) {
      const reading = readPair(graph, pair[0], pair[1])!;
      expect(reading.shape, graph.id).toBe('flat');
      expect(reading.y1).toBe(reading.y2);
      expect(reading.satisfiesWeak).toBe(true);
      expect(reading.satisfiesStrict).toBe(false); // ⭐ 全部差别就在这一行
      expect(reading.flatBetween).toBe(true);
    }
  });

  it('沿着被要求的方向走:两个都成立', () => {
    expect(readPair(STEPS, 2.5, 3.5)!.satisfiesStrict).toBe(true);
    expect(readPair(STEPS, 2.5, 3.5)!.shape).toBe('up');
    expect(readPair(FALLING, 0.5, 1.5)!.satisfiesStrict).toBe(true);
    expect(readPair(FALLING, 0.5, 1.5)!.shape).toBe('down');
  });

  it('跨过犯规的那一段:两个都不成立', () => {
    const down = readPair(DIP, 4, 5)!;
    expect(down.shape).toBe('down');
    expect(down.satisfiesWeak).toBe(false);
    expect(down.satisfiesStrict).toBe(false);
    const up = readPair(BUMP, 3, 4)!;
    expect(up.shape).toBe('up');
    expect(up.satisfiesWeak).toBe(false);
    expect(up.satisfiesStrict).toBe(false);
  });

  it('⚠️ 同一个走向在两节课里判得**相反**', () => {
    // 同样是"输出升了":非递减那节合法,非递增那节犯规。
    // 判定必须来自 graph.direction,不能来自走向本身。
    expect(readPair(STEPS, 2.5, 3.5)!.satisfiesWeak).toBe(true); // up 在非递减图上
    expect(readPair(BUMP, 3, 4)!.satisfiesWeak).toBe(false); // up 在非递增图上
    expect(readPair(DIP, 4, 5)!.satisfiesWeak).toBe(false); // down 在非递减图上
    expect(readPair(FALLING, 0.5, 1.5)!.satisfiesWeak).toBe(true); // down 在非递增图上
  });

  it('comparisonSymbol 与走向一致', () => {
    expect(comparisonSymbol('up')).toBe('<');
    expect(comparisonSymbol('down')).toBe('>');
    expect(comparisonSymbol('flat')).toBe('=');
  });
});

describe('⭐⭐ 「输出相等」不等于「中间是平的」', () => {
  it('在**合格**的图上,输出相等确实意味着中间全平', () => {
    // 朝允许的方向走出去一步就再也回不来 —— 所以相等只可能来自全程平坦。
    for (const graph of [STEPS, FALLING]) {
      for (const x1 of everyStep(graph)) {
        for (const x2 of everyStep(graph)) {
          if (x2 <= x1) continue;
          const reading = readPair(graph, x1, x2)!;
          if (reading.shape === 'flat') {
            expect(reading.flatBetween, `${graph.id} ${x1}→${x2} 相等却不平`).toBe(true);
          }
        }
      }
    }
  });

  it('⚠️ 但在**不合格**的图上不成立 —— 两张各现形一次', () => {
    // dip:先上后下回到同一高度
    const a = readPair(DIP, 3.5, 5.5)!;
    expect(a.y1).toBeCloseTo(2.5, 10);
    expect(a.y2).toBeCloseTo(2.5, 10);
    expect(a.shape).toBe('flat');
    expect(a.flatBetween).toBe(false);

    // bump:先下后上回到同一高度
    const b = readPair(BUMP, 2, 5)!;
    expect(b.y1).toBeCloseTo(3, 10);
    expect(b.y2).toBeCloseTo(3, 10);
    expect(b.shape).toBe('flat');
    expect(b.flatBetween).toBe(false);
    // 若 spanIsFlat 从 y1 === y2 反推,上面两行会红 ——
    // 而界面会指着一段起伏说"这里是平的"。
  });

  it('spanIsFlat 只在整段走向都为平时为真', () => {
    expect(spanIsFlat(STEPS, 0, 2)).toBe(true);
    expect(spanIsFlat(FALLING, 2, 6)).toBe(true);
    expect(spanIsFlat(STEPS, 1, 3)).toBe(false);
    expect(spanIsFlat(FALLING, 1, 3)).toBe(false);
    expect(spanIsFlat(BUMP, 3, 4)).toBe(false);
  });

  it('退化区间(两点重合)算平', () => {
    expect(spanIsFlat(STEPS, 3, 3)).toBe(true);
  });
});

/* ══ 整张图 ════════════════════════════════════════════════════════ */

describe('⭐ 整张图的判定:两条独立路径,四张图', () => {
  it('两条路径的结论一致,而且与图上声明的 shouldHold 一致', () => {
    for (const graph of ALL) {
      const want = graph.shouldHold ? 'holds-on-grid' : 'refuted';
      expect(verdictByAllPairs(graph).status, `${graph.id} 逐对`).toBe(want);
      expect(verdictBySlopes(graph).status, `${graph.id} 逐段`).toBe(want);
    }
  });

  it('⚠️ 两条路径给的反例不必相同,但**都必须真的是反例**', () => {
    for (const graph of [DIP, BUMP]) {
      for (const verdict of [verdictByAllPairs(graph), verdictBySlopes(graph)]) {
        const c = verdict.counterexample!;
        expect(c).not.toBeNull();
        expect(c.x1).toBeLessThan(c.x2);
        expect(readPair(graph, c.x1, c.x2)!.satisfiesWeak, `${graph.id}`).toBe(false);
      }
    }
  });

  it('成立时没有反例,措辞也只敢说 holds-on-grid', () => {
    for (const graph of [STEPS, FALLING]) {
      const verdict = verdictByAllPairs(graph);
      expect(verdict.counterexample).toBeNull();
      expect(verdict.status).not.toBe('proved');
      expect(verdict.checked).toBeGreaterThan(100);
    }
  });

  it('细一点的格子也不会让合格的图翻案', () => {
    for (const graph of [STEPS, FALLING]) {
      expect(verdictByAllPairs(graph, 0.1).status).toBe('holds-on-grid');
    }
  });
});

describe('给「你能破坏它吗」的提示', () => {
  it('两张不合格的图:给出的一对真的会失败,而且落在格点上', () => {
    for (const graph of [DIP, BUMP]) {
      const hint = suggestCounterexample(graph)!;
      expect(hint, graph.id).not.toBeNull();
      const reading = readPair(graph, hint.x1, hint.x2)!;
      expect(reading.satisfiesWeak, graph.id).toBe(false);
      expect(reading.shape).toBe(DIRECTION[graph.direction].forbidden);
      expect(snapX(hint.x1)).toBeCloseTo(hint.x1, 10);
      expect(snapX(hint.x2)).toBeCloseTo(hint.x2, 10);
      expect(hint.x1).toBeGreaterThanOrEqual(graph.domain.a);
      expect(hint.x2).toBeLessThanOrEqual(graph.domain.b);
    }
  });

  it('合格的图:没有反例,就不许编一个出来', () => {
    for (const graph of [STEPS, FALLING]) expect(suggestCounterexample(graph)).toBeNull();
  });
});

/* ══ 画面要用的派生量 ══════════════════════════════════════════════ */

describe('画面要用的那几个派生量', () => {
  it('shapeOfSegment 与 sectionShapes 一致,而且每段一个', () => {
    for (const graph of ALL) {
      expect(sectionShapes(graph)).toHaveLength(graph.segments.length);
      graph.segments.forEach((s, i) => expect(shapeOfSegment(s)).toBe(sectionShapes(graph)[i]));
    }
  });

  it('flatSegments 与 offendingSegments 不重叠,且都来自这张图', () => {
    for (const graph of ALL) {
      for (const s of flatSegments(graph)) expect(shapeOfSegment(s)).toBe('flat');
      for (const s of offendingSegments(graph)) {
        expect(shapeOfSegment(s)).toBe(DIRECTION[graph.direction].forbidden);
        expect(flatSegments(graph)).not.toContain(s);
      }
    }
  });

  it('y 轴刻度用的是折线真的到过的高度,去重且升序', () => {
    expect(cornerHeights(STEPS)).toEqual([1, 3, 5]);
    expect(cornerHeights(FALLING)).toEqual([1, 3, 5]);
    expect(cornerHeights(DIP)).toEqual([1, 2, 3, 5]);
    expect(cornerHeights(BUMP)).toEqual([1, 2, 3, 5]);
    for (const graph of ALL) {
      const hs = cornerHeights(graph);
      expect([...hs].sort((a, b) => a - b)).toEqual([...hs]);
      expect(new Set(hs).size).toBe(hs.length);
      for (const h of hs) {
        expect(graph.segments.some((s) => Math.abs(s.yFrom - h) < EPS || Math.abs(s.yTo - h) < EPS)).toBe(true);
      }
    }
  });

  it('每个方向都有平坦段可站 —— 否则那节课的核心互动做不出来', () => {
    // ⭐ 没有平台就没法让两点等高,`≤` 与 `<` 的分歧永远演示不了。
    for (const graph of ALL) expect(flatSegments(graph).length).toBeGreaterThan(0);
  });
});

describe('画线用的折线', () => {
  it('每个拐点都在,而且首尾就是定义域两端', () => {
    for (const graph of ALL) {
      const points = polyline(graph);
      expect(points).toHaveLength(graph.segments.length + 1);
      expect(points[0]!.x).toBe(graph.domain.a);
      expect(points[points.length - 1]!.x).toBe(graph.domain.b);
      for (const point of points) {
        expect(valueBySegment(graph, point.x)!).toBeCloseTo(point.y, 10);
      }
    }
  });
});

/* ══ 吸附 ══════════════════════════════════════════════════════════ */

describe('⭐ 吸附一对输入:顺序与间隔不许在吸附里丢掉', () => {
  it('无论传进来什么,出来的一对永远 x₁ < x₂,而且都在格点上、都在定义域内', () => {
    const raw = [-3, -0.04, 0, 0.03, 1.96, 2.01, 2, 4.5, 7.98, 8, 8.4, 12];
    for (const graph of ALL) {
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
    expect(snapPair(STEPS, { x1: 6, x2: 2 }).x1).toBeLessThan(snapPair(STEPS, { x1: 6, x2: 2 }).x2);
  });

  it('已经合法的一对原样通过', () => {
    const pair = snapPair(STEPS, { x1: 1, x2: 5 });
    expect(pair.x1).toBeCloseTo(1, 10);
    expect(pair.x2).toBeCloseTo(5, 10);
  });
});

describe('吸附与容差', () => {
  it('钉住的那几个 x 都踩得到', () => {
    for (const x of [2, 3, 4, 5, 6, 3.5, 5.5]) expect(snapX(x)).toBeCloseTo(x, 10);
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

/* ══ 覆盖率自查 ════════════════════════════════════════════════════ */

describe('⚠️ 这一组是给测试自己的:三种走向在两个方向下都被测到过', () => {
  // 浏览器那一轮吃过亏:扫了一百多个位置,'down' 一次都没出现,
  // 一大堆断言等于空跑。单测这边同样要防。
  it('每张图的格点对里,三种走向都出现过至少一次', () => {
    for (const graph of ALL) {
      const seen = new Set<Shape>();
      const xs = everyStep(graph).filter((_, i) => i % 2 === 0);
      for (let i = 0; i < xs.length; i += 1) {
        for (let j = i + 1; j < xs.length; j += 1) {
          seen.add(readPair(graph, xs[i]!, xs[j]!)!.shape);
        }
      }
      expect([...seen].sort(), `${graph.id} 只见到 ${[...seen]}`).toEqual(
        graph.shouldHold ? [DIRECTION[graph.direction].required, 'flat'].sort() : ['down', 'flat', 'up'],
      );
    }
  });

  it('两个方向都真的被测过 —— 不是只跑了非递减', () => {
    const directions = new Set<Direction>(ALL.map((g) => g.direction));
    expect([...directions].sort()).toEqual(['nondecreasing', 'nonincreasing']);
  });
});
