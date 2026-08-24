/**
 * `scanning.ts` 的测试。
 *
 * 三个重点:
 * ① ⭐⭐**跨过转折点的区间必须判成 mixed** —— 只比两端会把它判成"上升",
 *    而那正是这一节要纠正的错误读法;
 * ② 两条判定路径(查段 vs 逐对取样)在整条曲线的所有窗口上必须一致;
 * ③ 拐点是**已知的精确值**,不是拟合出来的 —— 屏幕上写 `(−∞, 3)` 必须为真,
 *    包括"真的无界"这件事。
 */
import { describe, it, expect } from 'vitest';
import {
  BEHAVIOUR_COPY,
  CURVES,
  CURVE_ORDER,
  EPS,
  MIN_WIDTH,
  STEP,
  allCrossings,
  behaviourByPairs,
  behaviourByStretches,
  clampWindow,
  containingInterval,
  crossingKind,
  crossingsInside,
  formatInterval,
  monotoneIntervals,
  moveLeftEdge,
  moveRightEdge,
  moveWindow,
  readWindow,
  sampleCurve,
  snapX,
  splitWindow,
  stretches,
  valueAt,
  type Curve,
} from './scanning';

const ALL = CURVE_ORDER.map((id) => CURVES[id]);
const WAVE = CURVES.wave;
const PLATEAU = CURVES.plateau;
const CHALLENGE = CURVES.challenge;

/** 视野内的所有格点 */
function grid(curve: Curve, step = 0.5): number[] {
  const out: number[] = [];
  for (let x = curve.view.from; x <= curve.view.to + EPS; x += step) out.push(Number(x.toFixed(6)));
  return out;
}

describe('⭐ 提示词钉死的形状', () => {
  it('wave:升 → 极大 → 降 → 极小 → 升', () => {
    expect(stretches(WAVE).map((s) => s.behaviour)).toEqual(['up', 'down', 'up']);
    expect(allCrossings(WAVE).map((c) => c.kind)).toEqual(['max', 'min']);
    expect(allCrossings(WAVE).map((c) => c.x)).toEqual([3, 7]);
  });

  it('wave 的单调区间正是提示词里那三条', () => {
    expect(monotoneIntervals(WAVE).map((i) => `${BEHAVIOUR_COPY[i.behaviour].label} ${formatInterval(i)}`)).toEqual([
      'INCREASING (-∞, 3.0)',
      'DECREASING (3.0, 7.0)',
      'INCREASING (7.0, ∞)',
    ]);
  });

  it('plateau 里有一段**真正的**常值段', () => {
    const flat = stretches(PLATEAU).filter((s) => s.behaviour === 'flat');
    expect(flat).toHaveLength(1);
    expect(valueAt(PLATEAU, flat[0]!.from)).toBeCloseTo(valueAt(PLATEAU, flat[0]!.to), 10);
    // 段内任取几点,值完全相同
    for (const x of [3.6, 4.2, 5, 5.9, 6.4]) expect(valueAt(PLATEAU, x)).toBeCloseTo(4.5, 10);
  });

  it('challenge 与 wave 形状不同 —— 否则挑战就是在考记忆', () => {
    expect(stretches(CHALLENGE).map((s) => s.behaviour)).not.toEqual(stretches(WAVE).map((s) => s.behaviour));
    expect(allCrossings(CHALLENGE).map((c) => c.kind)).toEqual(['min', 'max', 'min']);
  });

  it('⭐ 相邻两段的走向一定不同 —— 拐点正是走向改变的地方', () => {
    // 这条不变量是 `monotoneIntervals` 里那段"合并同向段"的代码被删掉的理由:
    // 它永远走不到。与其留一段测不到的防御代码,不如把不变量本身钉出来。
    for (const curve of ALL) {
      const list = stretches(curve);
      for (let i = 1; i < list.length; i += 1) {
        expect(list[i]!.behaviour, `${curve.id} 第 ${i} 段与前一段同向`).not.toBe(list[i - 1]!.behaviour);
      }
      expect(monotoneIntervals(curve)).toEqual(list);
    }
  });

  it('⚠️ 首尾两段都不是平台 —— 否则两条臂的方向说不清', () => {
    for (const curve of ALL) {
      const list = stretches(curve);
      expect(list[1]!.behaviour, `${curve.id} 第一段`).not.toBe('flat');
      expect(list[list.length - 2]!.behaviour, `${curve.id} 最后一段`).not.toBe('flat');
    }
  });
});

describe('⭐ 曲线本身', () => {
  it('连续 —— 每个拐点两侧的极限相等', () => {
    for (const curve of ALL) {
      for (const corner of curve.corners) {
        expect(valueAt(curve, corner.x - 1e-6)).toBeCloseTo(corner.y, 4);
        expect(valueAt(curve, corner.x)).toBeCloseTo(corner.y, 10);
        expect(valueAt(curve, corner.x + 1e-6)).toBeCloseTo(corner.y, 4);
      }
    }
  });

  it('⭐ 两条臂**真的无界** —— 所以 (−∞, 3) 这个记号是诚实的', () => {
    for (const curve of ALL) {
      const [left, ...rest] = monotoneIntervals(curve);
      const right = rest[rest.length - 1]!;
      expect(left!.from).toBe(Number.NEGATIVE_INFINITY);
      expect(right.to).toBe(Number.POSITIVE_INFINITY);
      // 走出去很远,值确实还在往那个方向跑
      const far = valueAt(curve, curve.view.from - 100);
      const near = valueAt(curve, curve.view.from - 1);
      expect(Math.abs(far)).toBeGreaterThan(Math.abs(near) + 100);
    }
  });

  it('在每一段内部严格单调(平台除外)', () => {
    for (const curve of ALL) {
      for (const s of stretches(curve)) {
        if (s.behaviour === 'flat') continue;
        const lo = Math.max(s.from, curve.view.from - 2);
        const hi = Math.min(s.to, curve.view.to + 2);
        for (let i = 1; i <= 20; i += 1) {
          const a = lo + ((hi - lo) * (i - 1)) / 20;
          const b = lo + ((hi - lo) * i) / 20;
          const d = valueAt(curve, b) - valueAt(curve, a);
          expect(s.behaviour === 'up' ? d : -d, `${curve.id} ${a}→${b}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('⚠️ 取样点里包含每一个拐点 —— 而且**在踩不到拐点的取样数下**也要成立', () => {
    // 默认 320 个点时,0..10 上的 3、6、1.5 之类恰好都是格点 ——
    // 于是"显式塞入拐点"那段代码删掉也全绿(变异测试抓到的)。
    // 定义域那一节吃过同一个亏:等距网格未必踩得到关键点。
    // 所以这里专挑除不尽的取样数。
    for (const curve of ALL) {
      for (const count of [7, 13, 33, 101, 320]) {
        const xs = sampleCurve(curve, curve.view.from, curve.view.to, count).map((p) => p.x);
        for (const corner of curve.corners) {
          expect(
            xs.some((x) => Math.abs(x - corner.x) < EPS),
            `${curve.id} count=${count} 少了 x=${corner.x}`,
          ).toBe(true);
        }
        for (let i = 1; i < xs.length; i += 1) expect(xs[i]!).toBeGreaterThanOrEqual(xs[i - 1]!);
      }
    }
  });

  it('取样值不会是 NaN', () => {
    for (const curve of ALL) {
      for (const p of sampleCurve(curve)) expect(Number.isFinite(p.y), `${curve.id} at ${p.x}`).toBe(true);
    }
  });
});

describe('⚠️ "什么算平"的容差', () => {
  // 变异测试:把平坦判定的容差从 EPS 放大到 0.5,全部测试照样绿 ——
  // 因为三条曲线上每一段的落差要么恰好是 0,要么大于 3,中间那一档没有数据。
  // 契约不该只被现有数据检验,所以这里造一条落差很小的曲线专门顶住它。
  const TINY: Curve = {
    id: 'wave',
    label: 'fixture',
    blurb: 'fixture',
    view: { from: 0, to: 4 },
    corners: [
      { x: 1, y: 2 },
      { x: 2, y: 2.2 }, // 只升了 0.2 —— 小,但**不是零**
      { x: 3, y: 1 },
    ],
    armK: 0.5,
  };

  it('落差 0.2 的一段算"升",不算"平"', () => {
    expect(stretches(TINY).map((s) => s.behaviour)).toEqual(['down', 'up', 'down', 'up']);
    expect(behaviourByStretches(TINY, 1.2, 1.8)).toBe('up');
    expect(behaviourByPairs(TINY, 1.2, 1.8)).toBe('up');
  });

  it('而且 valueAt 在那一段上真的在变 —— 不是被当成平台压成常数', () => {
    expect(valueAt(TINY, 1.9)).toBeGreaterThan(valueAt(TINY, 1.1) + 0.01);
  });
});

describe('⭐⭐ 跨过转折点必须是 mixed —— 只比两端会判错', () => {
  it('⭐ 存在"两端比较给出确定答案、而整段其实是 mixed"的窗口 —— 两个方向各一个', () => {
    // ⚠️ 第一版把窗口写死成 (2, 4),断言两端比较说"升" —— 结果那一段两端比较说的是"降"。
    //    坑本身是真的(只比两端一定会给出一个确定答案),但方向我猜错了。
    //    改成**搜出来**:两个方向的例子都必须存在,否则这条测试什么也没测到。
    const found: Record<string, [number, number] | null> = { rose: null, fell: null };
    for (let from = 1; from <= 7; from += 0.05) {
      for (let width = MIN_WIDTH; width <= 2; width += 0.05) {
        const to = from + width;
        if (crossingsInside(WAVE, from, to).length === 0) continue;
        const d = valueAt(WAVE, to) - valueAt(WAVE, from);
        if (d > EPS && !found.rose) found.rose = [from, to];
        if (d < -EPS && !found.fell) found.fell = [from, to];
      }
    }
    for (const key of ['rose', 'fell'] as const) {
      const win = found[key];
      expect(win, `没找到两端比较说"${key}"的跨点窗口`).not.toBeNull();
      const [from, to] = win!;
      // 两端比较会给出一个**确定**的答案 —— 而那个答案是错的
      expect(Math.abs(valueAt(WAVE, to) - valueAt(WAVE, from))).toBeGreaterThan(EPS);
      expect(behaviourByStretches(WAVE, from, to), `${from}→${to}`).toBe('mixed');
      expect(behaviourByPairs(WAVE, from, to), `${from}→${to}`).toBe('mixed');
    }
  });

  it('跨过极小值同样', () => {
    expect(behaviourByStretches(WAVE, 6, 8)).toBe('mixed');
    expect(behaviourByPairs(WAVE, 6, 8)).toBe('mixed');
  });

  it('恰好停在转折点上**不算**跨过去', () => {
    expect(behaviourByStretches(WAVE, 1, 3)).toBe('up');
    expect(behaviourByStretches(WAVE, 3, 7)).toBe('down');
    expect(crossingsInside(WAVE, 1, 3)).toHaveLength(0);
    expect(crossingsInside(WAVE, 3, 7)).toHaveLength(0);
  });

  it('平台的边界也会让区间变成 mixed(升 + 平)', () => {
    expect(behaviourByStretches(PLATEAU, 3, 4)).toBe('mixed');
    expect(behaviourByPairs(PLATEAU, 3, 4)).toBe('mixed');
    // 但那不是"转折点",不许说成极大/极小
    expect(crossingsInside(PLATEAU, 3, 4).map((c) => c.kind)).toEqual(['change']);
  });

  it('crossingKind 只把升↔降叫转折点', () => {
    expect(crossingKind('up', 'down')).toBe('max');
    expect(crossingKind('down', 'up')).toBe('min');
    expect(crossingKind('up', 'flat')).toBe('change');
    expect(crossingKind('flat', 'down')).toBe('change');
    expect(crossingKind('flat', 'up')).toBe('change');
  });
});

describe('⭐ 两条独立路径必须一致', () => {
  it('三条曲线、各种起点与宽度上都相等', () => {
    for (const curve of ALL) {
      for (const from of grid(curve)) {
        for (const width of [MIN_WIDTH, 0.8, 1.5, 2.5, 4]) {
          const to = from + width;
          if (to > curve.view.to + EPS) continue;
          expect(behaviourByPairs(curve, from, to), `${curve.id} [${from}, ${to}]`).toBe(
            behaviourByStretches(curve, from, to),
          );
        }
      }
    }
  });

  it('在转折点两侧一步之隔就换答案', () => {
    expect(behaviourByStretches(WAVE, 2.9, 2.99)).toBe('up');
    expect(behaviourByStretches(WAVE, 3.01, 3.1)).toBe('down');
    expect(behaviourByPairs(WAVE, 2.9, 2.99)).toBe('up');
    expect(behaviourByPairs(WAVE, 3.01, 3.1)).toBe('down');
  });

  it('整个视野的窗口:一定 mixed(每条曲线都至少有一个转折点)', () => {
    for (const curve of ALL) {
      expect(behaviourByStretches(curve, curve.view.from, curve.view.to)).toBe('mixed');
    }
  });
});

describe('把 mixed 的窗口切开', () => {
  it('切完的每一块都是单一走向,而且首尾接得上', () => {
    for (const curve of ALL) {
      for (const from of grid(curve)) {
        for (const width of [1.5, 3, 5]) {
          const to = from + width;
          if (to > curve.view.to + EPS) continue;
          const parts = splitWindow(curve, from, to);
          expect(parts.length).toBeGreaterThan(0);
          expect(parts[0]!.from).toBeCloseTo(from, 10);
          expect(parts[parts.length - 1]!.to).toBeCloseTo(to, 10);
          for (let i = 1; i < parts.length; i += 1) {
            expect(parts[i]!.from).toBeCloseTo(parts[i - 1]!.to, 10);
          }
          for (const part of parts) {
            const b = behaviourByStretches(curve, part.from, part.to);
            expect(b, `${curve.id} [${part.from}, ${part.to}]`).not.toBe('mixed');
            expect(part.behaviour).toBe(b);
          }
        }
      }
    }
  });

  it('单一走向的窗口切出来就是它自己', () => {
    expect(splitWindow(WAVE, 1, 3)).toEqual([{ from: 1, to: 3, behaviour: 'up' }]);
  });

  it('切块数 = 内部切换点数 + 1', () => {
    for (const curve of ALL) {
      for (const [from, to] of [[0, 10], [2, 5], [4, 9]] as const) {
        expect(splitWindow(curve, from, to)).toHaveLength(crossingsInside(curve, from, to).length + 1);
      }
    }
  });
});

describe('落在哪条区间里', () => {
  it('单一走向的窗口能找到所属区间,mixed 的找不到', () => {
    expect(containingInterval(WAVE, 1, 2.5)?.behaviour).toBe('up');
    expect(containingInterval(WAVE, 3.5, 6)?.behaviour).toBe('down');
    expect(containingInterval(WAVE, 2, 4)).toBeNull();
  });

  it('找到的区间确实包住窗口,而且走向一致', () => {
    for (const curve of ALL) {
      for (const from of grid(curve)) {
        const to = from + 1;
        if (to > curve.view.to + EPS) continue;
        const found = containingInterval(curve, from, to);
        const behaviour = behaviourByStretches(curve, from, to);
        if (behaviour === 'mixed') {
          expect(found, `${curve.id} [${from}, ${to}]`).toBeNull();
        } else {
          expect(found, `${curve.id} [${from}, ${to}]`).not.toBeNull();
          expect(found!.behaviour).toBe(behaviour);
          expect(from).toBeGreaterThanOrEqual(found!.from - EPS);
          expect(to).toBeLessThanOrEqual(found!.to + EPS);
        }
      }
    }
  });
});

describe('⭐ 扫描窗:范围、宽度、顺序不许丢', () => {
  it('无论传进来什么,出来的窗口都合法', () => {
    const raw = [-50, -1, 0, 0.03, 3, 9.97, 10, 40];
    for (const curve of ALL) {
      for (const a of raw) {
        for (const b of raw) {
          const win = clampWindow(curve, { from: a, to: b });
          expect(win.from, `${a}/${b}`).toBeLessThan(win.to);
          expect(win.to - win.from).toBeGreaterThanOrEqual(MIN_WIDTH - EPS);
          expect(win.from).toBeGreaterThanOrEqual(curve.view.from - EPS);
          expect(win.to).toBeLessThanOrEqual(curve.view.to + EPS);
          for (const v of [win.from, win.to]) expect(snapX(v)).toBeCloseTo(v, 9);
        }
      }
    }
  });

  it('平移不改变宽度(顶到边界之前)', () => {
    const start = clampWindow(WAVE, { from: 2, to: 4 });
    for (const by of [-1.3, -0.5, 0.5, 2.2]) {
      const moved = moveWindow(WAVE, start, by);
      expect(moved.to - moved.from).toBeCloseTo(start.to - start.from, 9);
    }
  });

  it('顶到边界就停住,不会跑出视野也不会缩宽度', () => {
    const win = moveWindow(WAVE, clampWindow(WAVE, { from: 2, to: 4 }), 99);
    expect(win.to).toBeCloseTo(WAVE.view.to, 9);
    expect(win.to - win.from).toBeCloseTo(2, 9);
  });

  it('⚠️ 拖端点不会把窗口拖没 —— 最小宽度顶着', () => {
    const win = clampWindow(WAVE, { from: 2, to: 4 });
    expect(moveLeftEdge(WAVE, win, 9).to - moveLeftEdge(WAVE, win, 9).from).toBeGreaterThanOrEqual(MIN_WIDTH - EPS);
    expect(moveRightEdge(WAVE, win, -9).to - moveRightEdge(WAVE, win, -9).from).toBeGreaterThanOrEqual(MIN_WIDTH - EPS);
    expect(moveLeftEdge(WAVE, win, 9).from).toBeLessThan(moveLeftEdge(WAVE, win, 9).to);
  });

  it('拖左端时右端不动,反之亦然', () => {
    const win = clampWindow(WAVE, { from: 2, to: 6 });
    expect(moveLeftEdge(WAVE, win, 3).to).toBeCloseTo(6, 9);
    expect(moveLeftEdge(WAVE, win, 3).from).toBeCloseTo(3, 9);
    expect(moveRightEdge(WAVE, win, 5).from).toBeCloseTo(2, 9);
    expect(moveRightEdge(WAVE, win, 5).to).toBeCloseTo(5, 9);
  });

  it('⚠️ 把一端拖过头时,**另一端必须钉住**,不能把整条带子推走', () => {
    // 变异测试抓到的洞:原来的断言只查了宽度和顺序,
    // 于是"拖左把手却把整个窗口往右推"这种实现照样全绿 ——
    // 而屏幕上看到的是:我在拖左边,右边跟着跑了。
    const win = clampWindow(WAVE, { from: 2, to: 4 });
    const pushedLeft = moveLeftEdge(WAVE, win, 9);
    expect(pushedLeft.to, '右端被推走了').toBeCloseTo(4, 9);
    expect(pushedLeft.from).toBeCloseTo(4 - MIN_WIDTH, 9);

    const pushedRight = moveRightEdge(WAVE, win, -9);
    expect(pushedRight.from, '左端被推走了').toBeCloseTo(2, 9);
    expect(pushedRight.to).toBeCloseTo(2 + MIN_WIDTH, 9);
  });

  it('吸附到**最近**的格点,不是往左取整', () => {
    expect(snapX(2.06)).toBeCloseTo(2.1, 10);
    expect(snapX(2.04)).toBeCloseTo(2.0, 10);
  });
});

describe('一次读数', () => {
  it('读数里的走向与两条路径一致,mixed 时才有切块', () => {
    for (const curve of ALL) {
      for (const from of grid(curve)) {
        const to = from + 2;
        if (to > curve.view.to + EPS) continue;
        const r = readWindow(curve, { from, to });
        expect(r.behaviour).toBe(behaviourByStretches(curve, r.from, r.to));
        expect(r.behaviour).toBe(behaviourByPairs(curve, r.from, r.to));
        expect(r.parts.length > 0).toBe(r.behaviour === 'mixed');
        expect(r.crossings.length > 0).toBe(r.behaviour === 'mixed');
        expect(Number.isFinite(r.yFrom) && Number.isFinite(r.yTo)).toBe(true);
      }
    }
  });

  it('读数会先把窗口收进合法范围', () => {
    const r = readWindow(WAVE, { from: -5, to: 99 });
    expect(r.from).toBeGreaterThanOrEqual(WAVE.view.from - EPS);
    expect(r.to).toBeLessThanOrEqual(WAVE.view.to + EPS);
  });
});

describe('显示', () => {
  it('区间记号里的无穷是真无穷', () => {
    expect(formatInterval({ from: Number.NEGATIVE_INFINITY, to: 3 })).toBe('(-∞, 3.0)');
    expect(formatInterval({ from: 6, to: Number.POSITIVE_INFINITY })).toBe('(6.0, ∞)');
    expect(formatInterval({ from: 1, to: 2 })).toBe('(1.0, 2.0)');
  });

  it('四种读数各有自己的箭头与说法,没有重复', () => {
    const arrows = Object.values(BEHAVIOUR_COPY).map((c) => c.arrow);
    expect(new Set(arrows).size).toBe(arrows.length);
    expect(BEHAVIOUR_COPY.up.label).toBe('INCREASING');
    expect(BEHAVIOUR_COPY.down.label).toBe('DECREASING');
    expect(BEHAVIOUR_COPY.flat.label).toBe('CONSTANT');
    expect(BEHAVIOUR_COPY.mixed.label).toContain('MIXED');
  });
});

describe('⚠️ 这一组是给测试自己的:四种读数都真的出现过', () => {
  it('扫过三条曲线,up / down / flat / mixed 一个不少', () => {
    const seen = new Set<string>();
    for (const curve of ALL) {
      for (const from of grid(curve, 0.25)) {
        for (const width of [MIN_WIDTH, 1, 3]) {
          const to = from + width;
          if (to > curve.view.to + EPS) continue;
          seen.add(behaviourByStretches(curve, from, to));
        }
      }
    }
    expect([...seen].sort()).toEqual(['down', 'flat', 'mixed', 'up']);
  });

  it('平台只在 plateau 那条曲线上出现', () => {
    for (const curve of ALL) {
      const hasFlat = stretches(curve).some((s) => s.behaviour === 'flat');
      expect(hasFlat, curve.id).toBe(curve.id === 'plateau');
    }
  });

  it('步长与最小宽度互相配得上', () => {
    expect(MIN_WIDTH).toBeGreaterThan(STEP);
    expect(Math.round(MIN_WIDTH / STEP) * STEP).toBeCloseTo(MIN_WIDTH, 10);
  });
});
