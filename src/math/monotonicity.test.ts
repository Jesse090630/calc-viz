/**
 * `monotonicity.ts` 的测试。
 *
 * 重点不在"函数能跑",在三件容易悄悄错掉的事:
 * ① `<` 与 `≤` 的边界 —— 平坦段是这一整节的教学核心,差一个等号就全反了;
 * ② 两条独立判定路径必须给出同一个结论;
 * ③ 命名与语义:`holds-on-grid` 不是"证明"。
 */
import { describe, it, expect } from 'vitest';
import {
  FUNCTIONS,
  RELATIONS,
  RELATION_ORDER,
  clampToInterval,
  evaluatePair,
  findClearestCounterexample,
  intervalContains,
  monotoneBreakpoints,
  orderPair,
  pairFromSequence,
  pairSatisfies,
  samplePoints,
  showNumber,
  suggestCounterexample,
  sweepSequence,
  verdictByAdjacent,
  verdictByAllPairs,
  type Interval,
} from './monotonicity';

const ON_0_3: Interval = { a: 0, b: 3 };
const ON_NEG2_2: Interval = { a: -2, b: 2 };

describe('orderPair 保证 x₁ < x₂', () => {
  it('顺序颠倒时会交换', () => {
    expect(orderPair(2.1, 0.8)).toEqual({ x1: 0.8, x2: 2.1 });
  });

  it('本来就有序时原样返回', () => {
    expect(orderPair(0.8, 2.1)).toEqual({ x1: 0.8, x2: 2.1 });
  });

  it('两个数相等不是合法的一对,返回 null 而不是 NaN', () => {
    expect(orderPair(1.5, 1.5)).toBeNull();
  });

  it('非有限值返回 null', () => {
    expect(orderPair(Number.NaN, 1)).toBeNull();
    expect(orderPair(1, Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe('⭐ 提示词里钉死的那对数字', () => {
  // x₁ = 0.80, x₂ = 2.10 → f 值 0.64 与 4.41。手算:0.8² = 0.64,2.1² = 4.41。
  it('f(0.8) = 0.64 且 f(2.1) = 4.41', () => {
    const pair = orderPair(0.8, 2.1)!;
    const evaluated = evaluatePair(FUNCTIONS.square!, pair)!;
    expect(evaluated.y1).toBeCloseTo(0.64, 10);
    expect(evaluated.y2).toBeCloseTo(4.41, 10);
    expect(showNumber(evaluated.y1)).toBe('0.64');
    expect(showNumber(evaluated.y2)).toBe('4.41');
  });

  it('这一对满足严格递增', () => {
    const evaluated = evaluatePair(FUNCTIONS.square!, orderPair(0.8, 2.1)!)!;
    expect(pairSatisfies(RELATIONS['strictly-increasing'], evaluated)).toBe(true);
  });

  // 提示词里的反例:x₁ = -2, x₂ = -1 → f 值 4 与 1,「4 < 1」为假。
  it('(-2, -1) 是 x² 在 [-2,2] 上的反例', () => {
    const evaluated = evaluatePair(FUNCTIONS.square!, orderPair(-2, -1)!)!;
    expect(evaluated.y1).toBe(4);
    expect(evaluated.y2).toBe(1);
    expect(pairSatisfies(RELATIONS['strictly-increasing'], evaluated)).toBe(false);
  });
});

describe('⭐ < 与 ≤ 的边界 —— 平坦段', () => {
  // 这一组是整个模块最容易写错的地方。
  // flatThenUp 在 x ≤ 1.5 上恒为 1,所以取两个都在平坦段里的点:
  const flatPair = orderPair(0.4, 1.2)!;

  it('平坦段上两个输出【精确】相等,不是浮点近似', () => {
    const evaluated = evaluatePair(FUNCTIONS.flatThenUp!, flatPair)!;
    expect(evaluated.y1).toBe(evaluated.y2); // 严格 === ,不是 toBeCloseTo
  });

  it('平坦段【不】满足严格递增', () => {
    const evaluated = evaluatePair(FUNCTIONS.flatThenUp!, flatPair)!;
    expect(pairSatisfies(RELATIONS['strictly-increasing'], evaluated)).toBe(false);
  });

  it('平坦段【满足】非递减 —— 差别只在那个等号', () => {
    const evaluated = evaluatePair(FUNCTIONS.flatThenUp!, flatPair)!;
    expect(pairSatisfies(RELATIONS.nondecreasing, evaluated)).toBe(true);
  });

  it('先降后平:非递增成立,严格递减不成立', () => {
    const onFlat = evaluatePair(FUNCTIONS.downThenFlat!, orderPair(2.0, 2.8)!)!;
    expect(onFlat.y1).toBe(onFlat.y2);
    expect(pairSatisfies(RELATIONS.nonincreasing, onFlat)).toBe(true);
    expect(pairSatisfies(RELATIONS['strictly-decreasing'], onFlat)).toBe(false);
  });

  it('常函数满足 constant / 非递减 / 非递增,但不满足任何严格关系', () => {
    const evaluated = evaluatePair(FUNCTIONS.level!, orderPair(-1, 2.5)!)!;
    expect(pairSatisfies(RELATIONS.constant, evaluated)).toBe(true);
    expect(pairSatisfies(RELATIONS.nondecreasing, evaluated)).toBe(true);
    expect(pairSatisfies(RELATIONS.nonincreasing, evaluated)).toBe(true);
    expect(pairSatisfies(RELATIONS['strictly-increasing'], evaluated)).toBe(false);
    expect(pairSatisfies(RELATIONS['strictly-decreasing'], evaluated)).toBe(false);
  });
});

describe('⭐ 两条独立判定路径必须一致', () => {
  // 路径 A 枚举所有 C(n,2) 对(定义本身);
  // 路径 B 只比较相邻对(靠传递性)。推理方式不同,结论必须相同。
  const intervals: Interval[] = [ON_0_3, ON_NEG2_2, { a: -3, b: -0.5 }, { a: 0.2, b: 2.9 }];

  for (const fnId of Object.keys(FUNCTIONS)) {
    for (const relationId of RELATION_ORDER) {
      it(`${fnId} × ${relationId}:全对枚举与相邻比较结论相同`, () => {
        for (const interval of intervals) {
          const all = verdictByAllPairs(FUNCTIONS[fnId]!, RELATIONS[relationId], interval, 40);
          const adjacent = verdictByAdjacent(FUNCTIONS[fnId]!, RELATIONS[relationId], interval, 40);
          expect(adjacent.status, `${fnId} / ${relationId} / [${interval.a},${interval.b}]`).toBe(all.status);
        }
      });
    }
  }

  it('全对枚举确实比相邻比较查了多得多的对(否则说明它退化了)', () => {
    const all = verdictByAllPairs(FUNCTIONS.square!, RELATIONS['strictly-increasing'], ON_0_3, 40);
    const adjacent = verdictByAdjacent(FUNCTIONS.square!, RELATIONS['strictly-increasing'], ON_0_3, 40);
    expect(all.pairsChecked).toBe((40 * 39) / 2);
    expect(adjacent.pairsChecked).toBe(39);
  });
});

describe('判定结果本身', () => {
  it('x² 在 [0,3] 上没找到反例', () => {
    const verdict = verdictByAllPairs(FUNCTIONS.square!, RELATIONS['strictly-increasing'], ON_0_3, 40);
    expect(verdict.status).toBe('holds-on-grid');
    expect(verdict.counterexample).toBeNull();
  });

  it('x² 在 [-2,2] 上被证否', () => {
    const verdict = verdictByAllPairs(FUNCTIONS.square!, RELATIONS['strictly-increasing'], ON_NEG2_2, 40);
    expect(verdict.status).toBe('refuted');
    expect(verdict.counterexample).not.toBeNull();
  });

  it('⚠️ 状态名不许出现 proved / proven —— 有限抽样不是证明', () => {
    const verdict = verdictByAllPairs(FUNCTIONS.square!, RELATIONS['strictly-increasing'], ON_0_3, 20);
    expect(verdict.status).toBe('holds-on-grid');
    expect(String(verdict.status)).not.toMatch(/prov(ed|en)/i);
  });

  it('-x 在任意区间上严格递减、且不严格递增', () => {
    expect(verdictByAllPairs(FUNCTIONS.negated!, RELATIONS['strictly-decreasing'], ON_NEG2_2, 30).status)
      .toBe('holds-on-grid');
    expect(verdictByAllPairs(FUNCTIONS.negated!, RELATIONS['strictly-increasing'], ON_NEG2_2, 30).status)
      .toBe('refuted');
  });

  it('先平后升:非递减成立,严格递增被证否', () => {
    expect(verdictByAllPairs(FUNCTIONS.flatThenUp!, RELATIONS.nondecreasing, ON_0_3, 30).status)
      .toBe('holds-on-grid');
    expect(verdictByAllPairs(FUNCTIONS.flatThenUp!, RELATIONS['strictly-increasing'], ON_0_3, 30).status)
      .toBe('refuted');
  });

  it('先降后平:非递增成立,严格递减被证否', () => {
    expect(verdictByAllPairs(FUNCTIONS.downThenFlat!, RELATIONS.nonincreasing, ON_0_3, 30).status)
      .toBe('holds-on-grid');
    expect(verdictByAllPairs(FUNCTIONS.downThenFlat!, RELATIONS['strictly-decreasing'], ON_0_3, 30).status)
      .toBe('refuted');
  });
});

describe('反例要挑得看得见', () => {
  it('给出的反例两点不重合,且输出落差明显', () => {
    const found = findClearestCounterexample(
      FUNCTIONS.square!,
      RELATIONS['strictly-increasing'],
      ON_NEG2_2,
      40,
    )!;
    expect(found).not.toBeNull();
    expect(found.x2 - found.x1).toBeGreaterThan(0.5); // 屏幕上分得开
    expect(Math.abs(found.y1 - found.y2)).toBeGreaterThan(1); // 落差一眼可见
    expect(pairSatisfies(RELATIONS['strictly-increasing'], found)).toBe(false);
  });

  it('x² 在 [-2,2] 上最清楚的反例应当起自左端点', () => {
    const found = findClearestCounterexample(
      FUNCTIONS.square!,
      RELATIONS['strictly-increasing'],
      ON_NEG2_2,
      40,
    )!;
    expect(found.x1).toBeCloseTo(-2, 6);
    expect(found.y1).toBeCloseTo(4, 6);
  });

  it('没有反例时返回 null', () => {
    expect(
      findClearestCounterexample(FUNCTIONS.square!, RELATIONS['strictly-increasing'], ON_0_3, 30),
    ).toBeNull();
  });
});

describe('⭐ 给学生看的那个反例(浏览器实测改出来的)', () => {
  // 「落差最大」会把 x₂ 推到顶点上(4 vs 0.0026),两个毛病:
  // 点黏在 x 轴上、而且占用了后面「分成两段」那一幕的主角位置。
  const suggested = () =>
    suggestCounterexample(FUNCTIONS.square!, RELATIONS['strictly-increasing'], ON_NEG2_2, 400)!;

  it('给出的正是 (-2, -1),输出 4 与 1', () => {
    const found = suggested();
    expect(found.x1).toBe(-2);
    expect(found.x2).toBe(-1);
    expect(found.y1).toBe(4);
    expect(found.y2).toBe(1);
  });

  it('⚠️ 屏幕上读出来是整齐的数,不是 0.99', () => {
    // 分界点是网格估出来的,中点会落在 -0.9975,直接显示就是 `f(-0.99) = 0.99`。
    // 这一幕的全部作用是一眼看懂,所以要snap到整数 —— 但只在仍然是反例的前提下。
    const found = suggested();
    expect(showNumber(found.x2)).toBe('-1.00');
    expect(showNumber(found.y2)).toBe('1.00');
  });

  it('⚠️ snap 过的对必须仍然是货真价实的反例', () => {
    // 为了好看去动反例,动出一个不是反例的对,等于把教学事故写进代码。
    expect(pairSatisfies(RELATIONS['strictly-increasing'], suggested())).toBe(false);
    expect(suggested().y1).toBeGreaterThan(suggested().y2); // 输出确实是降的
  });

  it('它确实是个反例 —— 好看不能以不正确为代价', () => {
    expect(pairSatisfies(RELATIONS['strictly-increasing'], suggested())).toBe(false);
  });

  it('⚠️ 第二个点不许贴在顶点上', () => {
    // 顶点在 0。贴上去就等于提前剧透「分成两段」那一幕。
    expect(Math.abs(suggested().x2)).toBeGreaterThan(0.5);
  });

  it('⚠️ 两个输出都要离 x 轴足够远,否则屏幕上读不出来', () => {
    const found = suggested();
    expect(Math.min(found.y1, found.y2)).toBeGreaterThan(0.5);
  });

  it('两点横向分得开', () => {
    const found = suggested();
    expect(found.x2 - found.x1).toBeGreaterThan(0.8);
  });

  it('本来就没有反例时返回 null', () => {
    expect(
      suggestCounterexample(FUNCTIONS.square!, RELATIONS['strictly-increasing'], ON_0_3, 200),
    ).toBeNull();
  });

  it('换个函数也能挑出真反例:先平后升 × 严格递增', () => {
    const found = suggestCounterexample(
      FUNCTIONS.flatThenUp!,
      RELATIONS['strictly-increasing'],
      ON_0_3,
      400,
    )!;
    expect(found).not.toBeNull();
    expect(pairSatisfies(RELATIONS['strictly-increasing'], found)).toBe(false);
    expect(found.y1).toBe(found.y2); // 平坦段:输出相等,严格递增因此不成立
  });
});

describe('扫描序列', () => {
  it('每一对都满足 x₁ < x₂ 且落在区间内', () => {
    for (const pair of sweepSequence(ON_0_3, 200)) {
      expect(pair.x1).toBeLessThan(pair.x2);
      expect(intervalContains(ON_0_3, pair.x1)).toBe(true);
      expect(intervalContains(ON_0_3, pair.x2)).toBe(true);
    }
  });

  it('数量正确且可复现', () => {
    const first = sweepSequence(ON_0_3, 50);
    const second = sweepSequence(ON_0_3, 50);
    expect(first).toHaveLength(50);
    expect(first).toEqual(second);
  });

  it('铺得开:前 60 对里 x₁ 落在区间的每一个五等分段上都有', () => {
    const buckets = new Set<number>();
    for (const pair of sweepSequence(ON_0_3, 60)) {
      buckets.add(Math.min(4, Math.floor(((pair.x1 - 0) / 3) * 5)));
    }
    expect(buckets.size).toBe(5);
  });

  it('pairFromSequence 对相同下标给出相同结果', () => {
    expect(pairFromSequence(7, ON_0_3)).toEqual(pairFromSequence(7, ON_0_3));
  });
});

describe('取样与工具函数', () => {
  it('samplePoints 端点精确落在区间两端', () => {
    const pts = samplePoints(FUNCTIONS.square!, ON_0_3, 30);
    expect(pts[0]!.x).toBeCloseTo(0, 12);
    expect(pts[pts.length - 1]!.x).toBeCloseTo(3, 12);
    expect(pts).toHaveLength(31);
  });

  it('x² 的单调分界点在 0', () => {
    const gridPoints = 600;
    const step = 6 / (gridPoints - 1); // ≈ 0.01002
    const breaks = monotoneBreakpoints(FUNCTIONS.square!, { a: -3, b: 3 }, gridPoints);
    expect(breaks).toHaveLength(1);
    // ⚠️ 容差绑在**网格步长**上,不是随手写个小数。
    // 顶点落在两个采样点之间,取中点最多就差一个步长 —— 要求比这更准是要求它猜。
    // (把容差写死成 0.005 而步长是 0.01002,测试当场红,那是测试错了不是实现错了。)
    expect(Math.abs(breaks[0]!)).toBeLessThanOrEqual(step);
  });

  it('网格加密时分界点向 0 收敛(说明它在测真东西,不是碰巧落在附近)', () => {
    const coarse = Math.abs(monotoneBreakpoints(FUNCTIONS.square!, { a: -3, b: 3 }, 60)[0]!);
    const fine = Math.abs(monotoneBreakpoints(FUNCTIONS.square!, { a: -3, b: 3 }, 6000)[0]!);
    expect(fine).toBeLessThan(coarse);
    expect(fine).toBeLessThan(0.002);
  });

  it('单调函数没有分界点', () => {
    expect(monotoneBreakpoints(FUNCTIONS.identity!, { a: -3, b: 3 }, 200)).toHaveLength(0);
  });

  // ⚠️ 这两条是变异测试逼出来的:去掉实现里"平坦段跳过"那一行,原本的测试全绿。
  // 因为当时只用 x² 试过,而 x² 根本没有平坦段 —— 测试覆盖不到出问题的那条路径。
  // 平坦段既不上升也不下降,把它当成任意一个方向,都会在平坦段与斜坡的交界处
  // 报出一个**根本不存在的转折**。
  it('先平后升【没有】分界点 —— 平坦不是一个方向', () => {
    expect(monotoneBreakpoints(FUNCTIONS.flatThenUp!, { a: 0, b: 3 }, 400)).toHaveLength(0);
  });

  it('先降后平【没有】分界点', () => {
    expect(monotoneBreakpoints(FUNCTIONS.downThenFlat!, { a: 0, b: 3 }, 400)).toHaveLength(0);
  });

  it('常函数没有分界点', () => {
    expect(monotoneBreakpoints(FUNCTIONS.level!, { a: -3, b: 3 }, 200)).toHaveLength(0);
  });

  it('clampToInterval 把点推回区间', () => {
    expect(clampToInterval(-5, ON_0_3)).toBe(0);
    expect(clampToInterval(9, ON_0_3)).toBe(3);
    expect(clampToInterval(1.4, ON_0_3)).toBe(1.4);
  });

  it('showNumber 不产生 -0.00', () => {
    expect(showNumber(-0.0001)).toBe('0.00');
    expect(showNumber(4.41)).toBe('4.41');
    expect(showNumber(Number.NaN)).toBe('—');
  });
});

describe('⚠️ 遍历滑块整个行程,任何位置都不许出现 NaN', () => {
  // NaN 不会让任何东西崩,它只会变成屏幕上一个看不见的错 —— 这是最危险的一类。
  it('x² 在 [-2,2] 上每一格都给出有限的输出', () => {
    for (let i = 0; i <= 400; i += 1) {
      const x = -2 + (4 * i) / 400;
      const y = FUNCTIONS.square!.at(x);
      expect(y === null || Number.isFinite(y)).toBe(true);
    }
  });

  it('分段函数在断点两侧都有定义', () => {
    for (const fnId of ['flatThenUp', 'downThenFlat']) {
      for (const x of [1.4999, 1.5, 1.5001]) {
        const y = FUNCTIONS[fnId]!.at(x);
        expect(Number.isFinite(y!)).toBe(true);
      }
    }
  });
});

describe('关系表自洽', () => {
  it('RELATION_ORDER 覆盖了 RELATIONS 的全部键', () => {
    expect([...RELATION_ORDER].sort()).toEqual(Object.keys(RELATIONS).sort());
  });

  it('只有非严格关系允许平坦段', () => {
    const flat = RELATION_ORDER.filter((id) => RELATIONS[id].allowsFlat);
    expect(flat.sort()).toEqual(['constant', 'nondecreasing', 'nonincreasing']);
  });

  it('allowsFlat 与 holds(y,y) 的实际行为一致', () => {
    // 声明的元数据和真正的判定函数分头维护,迟早会漂 —— 这里把它们钉在一起。
    for (const id of RELATION_ORDER) {
      expect(RELATIONS[id].holds(1.7, 1.7), `${id} 的 allowsFlat 与实现不符`).toBe(
        RELATIONS[id].allowsFlat,
      );
    }
  });

  it('每个关系的 tex 都以 x₁ < x₂ 为前件', () => {
    for (const id of RELATION_ORDER) {
      expect(RELATIONS[id].tex.startsWith('x_1 < x_2')).toBe(true);
    }
  });
});
