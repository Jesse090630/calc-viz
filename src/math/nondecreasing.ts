/**
 * MATH — 非递减(nondecreasing):`x₁ < x₂ ⟹ f(x₁) ≤ f(x₂)`
 *
 * 这一节和第三节(严格递增)只差一个符号,但那个符号是全部内容:
 * **`≤` 允许平坦段,`<` 不允许。** 函数可以往上走,可以走平,就是不能往下走。
 *
 * ⚠️ 这里的图是**连续分段线性**的 —— 不是为了省事,是因为
 * 「哪一段平、哪一段升」必须在数据里**明确写出来**,而不是靠采样去猜。
 * 用 sin/多项式的话,"平坦"只能靠导数近似判断,屏幕上说"这里是平的"就成了近似值,
 * 而这一节要教的恰恰是"输出**相等**"这件确定的事。
 *
 * ⚠️⚠️ 一个反直觉但必须守住的区分(第一版差点写错):
 *   **「两端输出相等」不等于「中间这一段是平的」。**
 *   在非递减的图上两者等价 —— 中间只要往上走一点就再也回不来了。
 *   但在**有下坡的图**上,先上后下完全可以回到同一高度:
 *   dip 图上 f(3.5) = f(5.5) = 2.5,而中间既有上坡也有下坡。
 *   所以 `spanIsFlat` **单独按段的斜率算**,绝不从 `y1 === y2` 反推。
 *   反推的版本在 dip 图上会指着一段起伏说"这里是平的" —— 一句看得见的假话。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import { showNumber } from './format';
import type { Interval } from './monotonicity';

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

export type GraphId = 'steps' | 'dip';

export interface PiecewiseGraph {
  readonly id: GraphId;
  readonly label: string;
  /** 界面上那句话 */
  readonly blurb: string;
  readonly domain: Interval;
  readonly segments: readonly Segment[];
}

export type Shape = 'up' | 'flat' | 'down';

/**
 * ⚠️ 两张图**首尾完全一样**:都从 (0, 1) 走到 (8, 5)。
 * 唯一的差别是 dip 图中间下来了一次。
 * 这是刻意的 —— 学生一眼能看出"起点终点都一样,还是有一张不合格",
 * 于是注意力被逼到"中间发生了什么",而不是"两张图长得不一样"。
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

export const GRAPHS: Readonly<Record<GraphId, PiecewiseGraph>> = {
  steps: {
    id: 'steps',
    label: 'Up or flat',
    blurb: 'Two flat stretches and two climbs. Nothing ever comes back down.',
    domain: domainOf(KNOTS.steps),
    segments: segmentsFrom(KNOTS.steps),
  },
  dip: {
    id: 'dip',
    label: 'One section goes down',
    blurb: 'Same start, same finish — but somewhere in the middle the output falls.',
    domain: domainOf(KNOTS.dip),
    segments: segmentsFrom(KNOTS.dip),
  },
};

export const GRAPH_ORDER: readonly GraphId[] = ['steps', 'dip'];

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
  /** `f(x₁) ≤ f(x₂)` 成立吗 —— 升和平都算成立 */
  readonly satisfiesNondecreasing: boolean;
  /** `f(x₁) < f(x₂)` 成立吗 —— 只有升才算 */
  readonly satisfiesStrict: boolean;
  /** 中间那一整段是不是平的(与"两端相等"是两回事) */
  readonly flatBetween: boolean;
}

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
    satisfiesNondecreasing: shape !== 'down',
    satisfiesStrict: shape === 'up',
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
      if (shapeByOutputs(y1, y2) === 'down') {
        return { status: 'refuted', checked, counterexample: { x1: xs[i]!, x2: xs[j]! } };
      }
    }
  }
  return { status: 'holds-on-grid', checked, counterexample: null };
}

/**
 * 判定路径 B —— **每一段的斜率都 ≥ 0 吗**。
 * 纯符号,不取样、不求值。对连续分段线性函数,这与 A 等价,
 * 但推理完全不同:A 数的是点对,B 看的是段。
 */
export function verdictBySlopes(graph: PiecewiseGraph): Verdict {
  for (const segment of graph.segments) {
    if (slopeOf(segment) < -EPS) {
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
 * 给「你能破坏这条规则吗」用的提示:**下坡最厉害的那一段**的两个端点。
 *
 * ⚠️ 返回前**先自己验一遍它真的失败**。
 * (第三节吃过一次亏:算出来的反例落在抛物线顶点上,数值上成立、屏幕上两点几乎重合,
 *  等于给了一个看不出所以然的"答案"。没验证就交出去的提示,迟早是错的。)
 * 同时吸附到格点上 —— 提示的值必须是滑块真的停得住的值。
 */
export function suggestCounterexample(
  graph: PiecewiseGraph,
): { readonly x1: number; readonly x2: number } | null {
  let worst: Segment | null = null;
  for (const segment of graph.segments) {
    if (slopeOf(segment) >= -EPS) continue;
    if (worst === null || slopeOf(segment) < slopeOf(worst)) worst = segment;
  }
  if (worst === null) return null;
  const x1 = snapX(worst.from);
  const x2 = snapX(worst.to);
  const reading = readPair(graph, x1, x2);
  // 验不过就不给 —— 宁可不提示,也不给一个假的
  if (reading === null || reading.shape !== 'down') return null;
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

/** 下坡段,给 dip 图上标红用。 */
export function fallingSegments(graph: PiecewiseGraph): readonly Segment[] {
  return graph.segments.filter((s) => shapeOfSegment(s) === 'down');
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

export const SHAPE_COPY: Readonly<
  Record<Shape, { readonly arrow: string; readonly word: string; readonly allowed: boolean; readonly note: string }>
> = {
  up: { arrow: '↗', word: 'went up', allowed: true, note: 'The output rose. Allowed.' },
  flat: { arrow: '→', word: 'stayed level', allowed: true, note: 'Equal outputs are allowed.' },
  down: { arrow: '↘', word: 'went down', allowed: false, note: 'The output went down. Not allowed.' },
};

export function showX(x: number): string {
  return showNumber(x, 1);
}

export function showY(y: number): string {
  return showNumber(y, 1);
}

/** 代入后的那一行,例如 `1.0 ≤ 3.0`。符号由关系决定,不在组件里拼。 */
export function substitutedTex(reading: PairReading, symbol: string): string {
  return `${showY(reading.y1)} ${symbol === '≤' ? '\\le' : '<'} ${showY(reading.y2)}`;
}
