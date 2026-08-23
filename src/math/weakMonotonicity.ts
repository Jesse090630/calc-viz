/**
 * MATH — **弱单调**:非递减与非递增,一个模块两个方向。
 *
 *   非递减 nondecreasing:`x₁ < x₂ ⟹ f(x₁) ≤ f(x₂)` —— 可升可平,不可降
 *   非递增 nonincreasing:`x₁ < x₂ ⟹ f(x₁) ≥ f(x₂)` —— 可降可平,不可升
 *
 * ⚠️ 两节课**共用这一个模块**,不是复制一份改符号。
 * (第五、六节的教训:上取整那一节如果复制下取整,两边的容差、端点、格点
 *  会各自漂移,最后同一个概念在两页上给出不同的答案。)
 * 方向只在一处定义 —— 下面的 `DIRECTION`。谁被禁止、和哪个严格版本对照、
 * 三格面板按什么顺序排,全从那里读,组件里一个都不许写死。
 *
 * ⚠️ 这里的图是**连续分段线性**的 —— 不是为了省事,是因为
 * 「哪一段平、哪一段升」必须在数据里**明确写出来**,而不是靠采样去猜。
 * 用 sin/多项式的话,"平坦"只能靠导数近似判断,屏幕上说"这里是平的"就成了近似值,
 * 而这两节要教的恰恰是"输出**相等**"这件确定的事。
 *
 * ⚠️⚠️ 一个反直觉但必须守住的区分(第一版差点写错):
 *   **「两端输出相等」不等于「中间这一段是平的」。**
 *   在合格的图上两者等价 —— 往一个方向走出去一步就再也回不来了。
 *   但在**有反向段的图**上,先上后下(或先下后上)完全可以回到同一高度:
 *   dip 图上 f(3.5) = f(5.5) = 2.5,bump 图上 f(2) = f(5) = 3,中间都不平。
 *   所以 `spanIsFlat` **单独按段的斜率算**,绝不从 `y1 === y2` 反推。
 *   反推的版本会指着一段起伏说"这里是平的" —— 一句看得见的假话。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import { showNumber } from './format';
import type { Interval, RelationId } from './monotonicity';

/** 比较用的容差。斜率是 0 / ±1,格点是十分位,真正的零一定精确到远小于这个数。 */
export const EPS = 1e-9;

/** 拖动与滑块的步长。钉住的那些值(2、4、5、6)都必须踩得到。 */
export const STEP = 0.1;

/** 折线的一个拐点 */
export interface Knot {
  readonly x: number;
  readonly y: number;
}

/** 一段直线 */
export interface Segment {
  readonly from: number;
  readonly to: number;
  readonly yFrom: number;
  readonly yTo: number;
}

export type GraphId = 'steps' | 'dip' | 'fallingSteps' | 'bump';
export type Direction = 'nondecreasing' | 'nonincreasing';
export type Shape = 'up' | 'flat' | 'down';

export interface PiecewiseGraph {
  readonly id: GraphId;
  /** 这张图属于哪一节课 */
  readonly direction: Direction;
  /** 这张图本来就该合格吗 —— 判定路径必须**独立算出**同样的结论,不许读这个字段 */
  readonly shouldHold: boolean;
  readonly label: string;
  /** 界面上那句话 */
  readonly blurb: string;
  readonly domain: Interval;
  readonly segments: readonly Segment[];
}

/**
 * ⚠️ **同一节课的两张图首尾完全一样**:
 *   非递减:都从 (0, 1) 走到 (8, 5);非递增:都从 (0, 5) 走到 (8, 1)。
 * 唯一的差别是不合格的那张中间反了一次向。
 * 这是刻意的 —— 学生一眼能看出"起点终点都一样,还是有一张不合格",
 * 于是注意力被逼到"中间发生了什么",而不是"两张图长得不一样"。
 *
 * 斜率一律取 0 与 ±1,读数好看,浮点也干净。
 */
const KNOTS: Readonly<Record<GraphId, readonly Knot[]>> = {
  // 平 → 升 → 平 → 升。斜率 0, 1, 0, 1。
  steps: [
    { x: 0, y: 1 },
    { x: 2, y: 1 },
    { x: 4, y: 3 },
    { x: 6, y: 3 },
    { x: 8, y: 5 },
  ],
  // 平 → 升 → **降** → 升。那一段下坡宽 1、深 1,是唯一的破绽。
  dip: [
    { x: 0, y: 1 },
    { x: 2, y: 1 },
    { x: 4, y: 3 },
    { x: 5, y: 2 },
    { x: 8, y: 5 },
  ],
  // 降 → 平 → 降。斜率 −1, 0, −1。
  fallingSteps: [
    { x: 0, y: 5 },
    { x: 2, y: 3 },
    { x: 6, y: 3 },
    { x: 8, y: 1 },
  ],
  // 降 → **升** → 平 → 降。那一段上坡宽 1、高 1,是唯一的破绽。
  bump: [
    { x: 0, y: 5 },
    { x: 3, y: 2 },
    { x: 4, y: 3 },
    { x: 6, y: 3 },
    { x: 8, y: 1 },
  ],
};

function segmentsFrom(knots: readonly Knot[]): readonly Segment[] {
  const out: Segment[] = [];
  for (let i = 1; i < knots.length; i += 1) {
    const a = knots[i - 1]!;
    const b = knots[i]!;
    out.push({ from: a.x, to: b.x, yFrom: a.y, yTo: b.y });
  }
  return out;
}

function domainOf(knots: readonly Knot[]): Interval {
  return { a: knots[0]!.x, b: knots[knots.length - 1]!.x };
}

function graph(
  id: GraphId,
  direction: Direction,
  shouldHold: boolean,
  label: string,
  blurb: string,
): PiecewiseGraph {
  return {
    id,
    direction,
    shouldHold,
    label,
    blurb,
    domain: domainOf(KNOTS[id]),
    segments: segmentsFrom(KNOTS[id]),
  };
}

export const GRAPHS: Readonly<Record<GraphId, PiecewiseGraph>> = {
  steps: graph('steps', 'nondecreasing', true, 'Up or flat', 'Two flat stretches and two climbs. Nothing ever comes back down.'),
  dip: graph('dip', 'nondecreasing', false, 'One section goes down', 'Same start, same finish — but somewhere in the middle the output falls.'),
  fallingSteps: graph('fallingSteps', 'nonincreasing', true, 'Down or flat', 'Two descents with a flat stretch between them. Nothing ever climbs back up.'),
  bump: graph('bump', 'nonincreasing', false, 'One section goes up', 'Same start, same finish — but somewhere in the middle the output rises.'),
};

/**
 * 方向:这两节课的**唯一**差别都锁在这里。
 *
 * ⚠️ 组件里不许出现 `direction === 'nondecreasing' ? '↘' : '↗'` 这类判断。
 * 一旦散出去,"哪个箭头是被禁止的"就有了第二处定义,改一处忘一处就会在
 * 一节课上说反 —— 而说反的那句话恰好是这节课的全部内容。
 */
export const DIRECTION: Readonly<
  Record<
    Direction,
    {
      readonly id: Direction;
      /** 弱版本(≤ / ≥)在 `monotonicity.ts` 的 RELATIONS 里的键 */
      readonly weak: RelationId;
      /** 对照用的严格版本(< / >) */
      readonly strict: RelationId;
      /** 被禁止的那种走向 */
      readonly forbidden: Shape;
      /** 严格版本要求的那种走向(平坦不算) */
      readonly required: Shape;
      readonly title: string;
      readonly lede: string;
      /** 三格面板从左到右的顺序:允许的先出场,被禁止的收尾 */
      readonly cells: readonly Shape[];
      readonly goodGraph: GraphId;
      readonly brokenGraph: GraphId;
      /** 反例找到之后那一行 */
      readonly brokenHeadline: string;
      /** 还没找到时的提示 */
      readonly hunt: string;
      readonly mentalModel: string;
    }
  >
> = {
  nondecreasing: {
    id: 'nondecreasing',
    weak: 'nondecreasing',
    strict: 'strictly-increasing',
    forbidden: 'down',
    required: 'up',
    title: 'Nondecreasing Functions',
    lede: 'Up or flat. Never down. Drag the two inputs and watch which symbol survives.',
    cells: ['up', 'flat', 'down'],
    goodGraph: 'steps',
    brokenGraph: 'dip',
    brokenHeadline: 'The output went down. NOT nondecreasing.',
    hunt: 'where the output actually falls',
    mentalModel: 'Up is fine. Flat is fine. Down is the only thing the definition forbids.',
  },
  nonincreasing: {
    id: 'nonincreasing',
    weak: 'nonincreasing',
    strict: 'strictly-decreasing',
    forbidden: 'up',
    required: 'down',
    title: 'Nonincreasing Functions',
    lede: 'Down or flat. Never up. Drag the two inputs and watch which symbol survives.',
    cells: ['down', 'flat', 'up'],
    goodGraph: 'fallingSteps',
    brokenGraph: 'bump',
    brokenHeadline: 'The output increased. NOT nonincreasing.',
    hunt: 'where the output actually rises',
    mentalModel: 'Down is fine. Flat is fine. Up is the only thing the definition forbids.',
  },
};

export const DIRECTION_ORDER: readonly Direction[] = ['nondecreasing', 'nonincreasing'];

/** 某一节课里的两张图,合格的在前。 */
export function graphsFor(direction: Direction): readonly PiecewiseGraph[] {
  return [GRAPHS[DIRECTION[direction].goodGraph], GRAPHS[DIRECTION[direction].brokenGraph]];
}

/** 这种走向在这个方向下允许吗。平坦**永远**允许 —— 那正是弱版本的意义。 */
export function isAllowed(direction: Direction, shape: Shape): boolean {
  return shape !== DIRECTION[direction].forbidden;
}

/** 严格版本(< / >)要求的走向:平坦不满足。 */
export function satisfiesStrict(direction: Direction, shape: Shape): boolean {
  return shape === DIRECTION[direction].required;
}

export function slopeOf(segment: Segment): number {
  return (segment.yTo - segment.yFrom) / (segment.to - segment.from);
}

/** 把值吸附到步长格点上,免得"钉住的 x = 4"永远差 0.03 到不了。 */
export function snapX(value: number): number {
  return Math.round(value / STEP) * STEP;
}

export interface PairOnGrid {
  readonly x1: number;
  readonly x2: number;
}

/**
 * 把拖出来的一对吸附到格点上,**顺序和最小间隔都不许在吸附里丢掉**。
 *
 * ⚠️ 吸附正是最容易把缝隙压成零的一步:x₁ = 1.96、x₂ = 2.01 各自吸到 2.0,
 * 两个点当场重合。第三节吃过这个亏 —— 重合会让上层回退,屏幕上两点瞬移到区间两端,
 * 用户看到的是"我在往右拖,点却跳去了最左边"。
 * 所以这里不做"事后补救",而是**保证吸附之后仍然差至少一格**。
 */
export function snapPair(graph: PiecewiseGraph, pair: PairOnGrid): PairOnGrid {
  const { a, b } = graph.domain;
  const clamp = (v: number) => Math.min(b, Math.max(a, v));
  const x1 = snapX(clamp(pair.x1));
  const x2 = snapX(clamp(pair.x2));
  if (x2 - x1 >= STEP - EPS) return { x1, x2 };
  // 挤在一起了(或者顺序反了):先试着把 x₂ 往右推一格,右边没地方了就把这一对靠右端放。
  if (x1 + STEP <= b + EPS) return { x1, x2: snapX(x1 + STEP) };
  return { x1: snapX(b - STEP), x2: snapX(b) };
}

/* ══ 求值:两条独立路径 ══════════════════════════════════════════════ */

/**
 * 路径 A —— **在所在的那一段里线性插值**。
 * 找到包含 x 的那一段,按比例取值。只看一段,不关心左边发生过什么。
 */
export function valueBySegment(graph: PiecewiseGraph, x: number): number | null {
  if (!Number.isFinite(x)) return null;
  if (x < graph.domain.a - EPS || x > graph.domain.b + EPS) return null;
  for (const segment of graph.segments) {
    if (x < segment.from - EPS || x > segment.to + EPS) continue;
    const t = (x - segment.from) / (segment.to - segment.from);
    return segment.yFrom + t * (segment.yTo - segment.yFrom);
  }
  return null;
}

/**
 * 路径 B —— **从左端点开始把涨跌累加起来**。
 * f(x) = f(a) + Σ 斜率ᵢ × ([a, x] 与第 i 段重叠的长度)。
 *
 * 这是"把导数积回去",和路径 A 的"在一段里插值"是两种不同的想法:
 * A 只需要一段,B 需要走过前面所有段。写错任何一段的斜率,B 会错而 A 不会。
 */
export function valueByAccumulatedRise(graph: PiecewiseGraph, x: number): number | null {
  if (!Number.isFinite(x)) return null;
  if (x < graph.domain.a - EPS || x > graph.domain.b + EPS) return null;
  let y = graph.segments[0]!.yFrom;
  for (const segment of graph.segments) {
    const overlap = Math.min(x, segment.to) - segment.from;
    if (overlap <= 0) break;
    y += slopeOf(segment) * overlap;
  }
  return y;
}

/* ══ 一对输入的关系:两条独立路径 ════════════════════════════════════ */

/** 路径 A —— 直接比两端的输出。 */
export function shapeByOutputs(y1: number, y2: number): Shape {
  if (y2 - y1 > EPS) return 'up';
  if (y1 - y2 > EPS) return 'down';
  return 'flat';
}

/**
 * 路径 B —— **净涨跌**:把 [x₁, x₂] 上每一段的 斜率 × 重叠长度 加起来。
 * 全程不调用 `valueBySegment`,所以它和路径 A 没有共享推理。
 */
export function netRise(graph: PiecewiseGraph, x1: number, x2: number): number {
  let sum = 0;
  for (const segment of graph.segments) {
    const lo = Math.max(x1, segment.from);
    const hi = Math.min(x2, segment.to);
    if (hi > lo) sum += slopeOf(segment) * (hi - lo);
  }
  return sum;
}

export function shapeByNetRise(graph: PiecewiseGraph, x1: number, x2: number): Shape {
  return shapeByOutputs(0, netRise(graph, x1, x2));
}

/**
 * ⚠️ [x₁, x₂] 之间**全程是平的**吗?
 * 按段的斜率算,不看两端的输出 —— 见文件头那条警告:
 * 先上后下也能回到同一高度,那时输出相等但中间根本不平。
 */
export function spanIsFlat(graph: PiecewiseGraph, x1: number, x2: number): boolean {
  if (x2 - x1 <= EPS) return true;
  for (const segment of graph.segments) {
    const lo = Math.max(x1, segment.from);
    const hi = Math.min(x2, segment.to);
    if (hi - lo > EPS && Math.abs(slopeOf(segment)) > EPS) return false;
  }
  return true;
}

export interface PairReading {
  readonly x1: number;
  readonly x2: number;
  readonly y1: number;
  readonly y2: number;
  /** 输出是升、平还是降 */
  readonly shape: Shape;
  /** 弱版本(`≤` 或 `≥`)成立吗 —— 平坦在两个方向下都成立 */
  readonly satisfiesWeak: boolean;
  /** 严格版本(`<` 或 `>`)成立吗 —— 平坦在两个方向下都**不**成立 */
  readonly satisfiesStrict: boolean;
  /** 中间那一整段是不是平的(与"两端相等"是两回事) */
  readonly flatBetween: boolean;
}

/**
 * ⚠️ 判定用的是 `graph.direction`,不是调用方传进来的方向。
 * 图和方向绑定在一起,读错方向就会在 bump 图上按"不许下降"去判 —— 结论全反。
 */
export function readPair(graph: PiecewiseGraph, x1: number, x2: number): PairReading | null {
  const y1 = valueBySegment(graph, x1);
  const y2 = valueBySegment(graph, x2);
  if (y1 === null || y2 === null) return null;
  const shape = shapeByOutputs(y1, y2);
  return {
    x1,
    x2,
    y1,
    y2,
    shape,
    satisfiesWeak: isAllowed(graph.direction, shape),
    satisfiesStrict: satisfiesStrict(graph.direction, shape),
    flatBetween: spanIsFlat(graph, x1, x2),
  };
}

/* ══ 整张图的判定:两条独立路径 ══════════════════════════════════════ */

/**
 * ⚠️ 措辞按第三节立下的规矩:有限次抽样**不能**证明一个 ∀ 命题,
 * 所以成立时只敢说 `holds-on-grid`。
 * 但**一个反例足以证否**,所以 `refuted` 是真的证明。
 */
export type VerdictStatus = 'holds-on-grid' | 'refuted';

export interface Verdict {
  readonly status: VerdictStatus;
  readonly checked: number;
  readonly counterexample: { readonly x1: number; readonly x2: number } | null;
}

/** 判定路径 A —— 在格点上**逐对**检查。慢,但它就是定义本身。 */
export function verdictByAllPairs(graph: PiecewiseGraph, step = 0.25): Verdict {
  const xs: number[] = [];
  for (let x = graph.domain.a; x <= graph.domain.b + EPS; x += step) xs.push(x);
  let checked = 0;
  for (let i = 0; i < xs.length; i += 1) {
    for (let j = i + 1; j < xs.length; j += 1) {
      checked += 1;
      const y1 = valueBySegment(graph, xs[i]!);
      const y2 = valueBySegment(graph, xs[j]!);
      if (y1 === null || y2 === null) continue;
      if (!isAllowed(graph.direction, shapeByOutputs(y1, y2))) {
        return { status: 'refuted', checked, counterexample: { x1: xs[i]!, x2: xs[j]! } };
      }
    }
  }
  return { status: 'holds-on-grid', checked, counterexample: null };
}

/**
 * 判定路径 B —— **有没有哪一段朝着被禁止的方向走**。
 * 纯符号,不取样、不求值。对连续分段线性函数,这与 A 等价,
 * 但推理完全不同:A 数的是点对,B 看的是段。
 */
export function verdictBySlopes(graph: PiecewiseGraph): Verdict {
  for (const segment of graph.segments) {
    if (shapeOfSegment(segment) === DIRECTION[graph.direction].forbidden) {
      return {
        status: 'refuted',
        checked: graph.segments.length,
        counterexample: { x1: segment.from, x2: segment.to },
      };
    }
  }
  return { status: 'holds-on-grid', checked: graph.segments.length, counterexample: null };
}

/**
 * 给「你能破坏这条规则吗」用的提示:**朝禁止方向走得最狠的那一段**的两个端点。
 *
 * ⚠️ 返回前**先自己验一遍它真的失败**。
 * (第三节吃过一次亏:算出来的反例落在抛物线顶点上,数值上成立、屏幕上两点几乎重合,
 *  等于给了一个看不出所以然的"答案"。没验证就交出去的提示,迟早是错的。)
 * 同时吸附到格点上 —— 提示的值必须是滑块真的停得住的值。
 */
export function suggestCounterexample(
  graph: PiecewiseGraph,
): { readonly x1: number; readonly x2: number } | null {
  const forbidden = DIRECTION[graph.direction].forbidden;
  let worst: Segment | null = null;
  for (const segment of graph.segments) {
    if (shapeOfSegment(segment) !== forbidden) continue;
    // "最狠"= 朝禁止方向的斜率绝对值最大
    if (worst === null || Math.abs(slopeOf(segment)) > Math.abs(slopeOf(worst))) worst = segment;
  }
  if (worst === null) return null;
  const x1 = snapX(worst.from);
  const x2 = snapX(worst.to);
  const reading = readPair(graph, x1, x2);
  // 验不过就不给 —— 宁可不提示,也不给一个假的
  if (reading === null || reading.shape !== forbidden) return null;
  return { x1, x2 };
}

/**
 * 一段是升、平还是降。
 * ⚠️ 放在这里而不是组件里:一旦组件自己写 `slope > 0 ? '↗' : ...`,
 * 就出现了第二套"什么算平"的判据,而它和 `spanIsFlat` 用的容差迟早对不上。
 */
export function shapeOfSegment(segment: Segment): Shape {
  const slope = slopeOf(segment);
  if (slope > EPS) return 'up';
  if (slope < -EPS) return 'down';
  return 'flat';
}

/**
 * 折线经过的那几个高度(去重、升序)。
 * y 轴刻度用它,而不是等距刻度 —— 这条函数只在 1、3、5 这几个高度上待着,
 * 标一堆 2、4 反而把"平台在哪"这件事藏起来了。
 */
export function cornerHeights(graph: PiecewiseGraph): readonly number[] {
  const seen: number[] = [];
  for (const segment of graph.segments) {
    for (const y of [segment.yFrom, segment.yTo]) {
      if (!seen.some((v) => Math.abs(v - y) <= EPS)) seen.push(y);
    }
  }
  return [...seen].sort((a, b) => a - b);
}

/** 从左到右每一段的走向,给图例用。 */
export function sectionShapes(graph: PiecewiseGraph): readonly Shape[] {
  return graph.segments.map(shapeOfSegment);
}

/** 平坦段,给画面上"这几段是平的"用。 */
export function flatSegments(graph: PiecewiseGraph): readonly Segment[] {
  return graph.segments.filter((s) => shapeOfSegment(s) === 'flat');
}

/**
 * **朝禁止方向走的那些段**,给不合格的图上标红用。
 * ⚠️ 不叫 `fallingSegments` 了:非递增那一节里犯规的是**上坡**。
 * 名字写死一个方向,另一节课就得再写一个几乎一样的函数,然后两边慢慢漂开。
 */
export function offendingSegments(graph: PiecewiseGraph): readonly Segment[] {
  const forbidden = DIRECTION[graph.direction].forbidden;
  return graph.segments.filter((s) => shapeOfSegment(s) === forbidden);
}

/** 折线本身,交给 `polylinePath` 画。拐点必须原样在列表里,不能只靠等距取样。 */
export function polyline(graph: PiecewiseGraph): readonly { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [
    { x: graph.segments[0]!.from, y: graph.segments[0]!.yFrom },
  ];
  for (const segment of graph.segments) points.push({ x: segment.to, y: segment.yTo });
  return points;
}

/* ══ 显示 ══════════════════════════════════════════════════════════ */

/**
 * ⚠️ `SHAPE_COPY` 里**没有 `allowed` 字段**,也没有"不允许"那句话。
 * 升在一节课里合法、在另一节课里犯规 —— 允不允许是**方向**的属性,不是走向的属性。
 * 原来这里写着 `up: { allowed: true }`,照搬到非递增那节就会指着一段上坡说"允许"。
 * 允不允许一律问 `isAllowed(direction, shape)`。
 */
export const SHAPE_COPY: Readonly<
  Record<
    Shape,
    { readonly arrow: string; readonly short: string; readonly word: string; readonly sentence: string }
  >
> = {
  up: { arrow: '↗', short: 'up', word: 'went up', sentence: 'The output rose.' },
  flat: { arrow: '→', short: 'flat', word: 'stayed level', sentence: 'The outputs are equal.' },
  down: { arrow: '↘', short: 'down', word: 'went down', sentence: 'The output fell.' },
};

/** 当前这一对该说的那句话。允不允许由方向决定。 */
export function shapeNote(direction: Direction, shape: Shape): string {
  if (shape === 'flat') return 'Equal outputs are allowed.';
  return `${SHAPE_COPY[shape].sentence} ${isAllowed(direction, shape) ? 'Allowed.' : 'Not allowed.'}`;
}

/** 代入那一行中间的符号:`1.0 = 1.0` / `1.0 < 3.0` / `3.0 > 2.0`。 */
export function comparisonSymbol(shape: Shape): string {
  return shape === 'flat' ? '=' : shape === 'up' ? '<' : '>';
}

export function showX(x: number): string {
  return showNumber(x, 1);
}

export function showY(y: number): string {
  return showNumber(y, 1);
}
