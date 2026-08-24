/**
 * MATH — 在一段区间上,函数是**增、减,还是不变**?
 *
 * 这一节教的是"从左往右读图":x 变大时,输出上去了、下来了,还是没动。
 *
 * ⚠️⚠️ 最要紧的一条:**扫描窗跨过转折点时不许给出单一结论**。
 * 一个区间里既有上升又有下降,它既不是"递增区间"也不是"递减区间" ——
 * 硬给一个答案(比如按两端点比高低)正好教反:
 * 在 (2, 4) 上比较 f(2) 与 f(4) 可能得到"上升",而中间明明翻过了一个最大值。
 * 所以判定必须**看整段**,不能只看两端。这就是 `behaviourByPairs` 存在的理由。
 *
 * ⚠️ 曲线由**转折点**生成,不是先写个多项式再去找拐点:
 * 拐点在哪必须是**已知的精确值**,否则屏幕上写着"递增于 (−∞, 3)"就成了近似值。
 *   · 两个相邻转折点之间:余弦缓动 —— 两端斜率为零,严格单调,拼接处 C¹。
 *   · 最外侧两条臂:抛物线 —— 同样在转折点处斜率为零,而且**真的无界**,
 *     所以 `(−∞, 3)` 这个记号是诚实的,不是把有限端点写成无穷。
 *   · y 相等的两个相邻结点之间:常值段(平台)。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import { showNumber } from './format';

export const EPS = 1e-9;

/** 扫描窗端点的步长。 */
export const STEP = 0.1;

/** 扫描窗的最小宽度。太窄的话"这一段在干什么"就没有意义了。 */
export const MIN_WIDTH = 0.4;

/** 一段的走向。`mixed` 只会作为**读数**出现,单独一段不可能是 mixed。 */
export type Behaviour = 'up' | 'down' | 'flat';
export type Reading = Behaviour | 'mixed';

export interface Corner {
  readonly x: number;
  readonly y: number;
}

/** 一段:从 from 到 to,走向固定。最外两段的 from/to 是 ∓∞。 */
export interface Stretch {
  readonly from: number;
  readonly to: number;
  readonly behaviour: Behaviour;
}

export type CurveId = 'wave' | 'plateau' | 'challenge';

export interface Curve {
  readonly id: CurveId;
  readonly label: string;
  readonly blurb: string;
  /** 画面上显示与扫描允许的范围(有限);数学上函数在整条实轴上有定义。 */
  readonly view: { readonly from: number; readonly to: number };
  /** 拐点与平台端点,从左到右 */
  readonly corners: readonly Corner[];
  /** 两条臂的抛物线开口大小 */
  readonly armK: number;
}

const CORNERS: Readonly<Record<CurveId, readonly Corner[]>> = {
  // 升 → 极大 → 降 → 极小 → 升。提示词里点名的那条。
  wave: [
    { x: 3, y: 5 },
    { x: 7, y: 2 },
  ],
  // 降 → 极小 → 升 → **平台** → 降 → 极小 → 升。带一段真正的常值段。
  plateau: [
    { x: 1.5, y: 1 },
    { x: 3.5, y: 4.5 },
    { x: 6.5, y: 4.5 },
    { x: 8.5, y: 1.5 },
  ],
  // 挑战用:形状换过,极小 → 极大 → 极小,不能靠记忆蒙。
  challenge: [
    { x: 2, y: 1.5 },
    { x: 4.5, y: 6 },
    { x: 7, y: 2.5 },
  ],
};

export const CURVES: Readonly<Record<CurveId, Curve>> = {
  wave: {
    id: 'wave',
    label: 'The wave',
    blurb: 'Up, over the top, down, through the bottom, up again.',
    view: { from: 0, to: 10 },
    corners: CORNERS.wave,
    armK: 0.35,
  },
  plateau: {
    id: 'plateau',
    label: 'With a flat stretch',
    blurb: 'Same idea, but somewhere in the middle the graph stops changing.',
    view: { from: 0, to: 10 },
    corners: CORNERS.plateau,
    armK: 0.35,
  },
  challenge: {
    id: 'challenge',
    label: 'Challenge',
    blurb: 'A graph you have not seen. Find a stretch that only goes up.',
    view: { from: 0, to: 10 },
    corners: CORNERS.challenge,
    armK: 0.35,
  },
};

export const CURVE_ORDER: readonly CurveId[] = ['wave', 'plateau', 'challenge'];

/* ══ 曲线的形状 ════════════════════════════════════════════════════ */

function behaviourBetween(a: Corner, b: Corner): Behaviour {
  if (b.y - a.y > EPS) return 'up';
  if (a.y - b.y > EPS) return 'down';
  return 'flat';
}

/**
 * 两条臂的走向:**与相邻那一段相反**。
 * ⚠️ 相邻段是平台时方向就说不清了(平台的外侧既可以升也可以降),
 * 所以首尾两段不许是平台 —— 有测试钉着这一点。
 */
function armBehaviour(inner: Behaviour): Behaviour {
  return inner === 'up' ? 'down' : 'up';
}

/** 从左到右的全部段,含两条无界的臂。 */
export function stretches(curve: Curve): readonly Stretch[] {
  const cs = curve.corners;
  const out: Stretch[] = [];
  const first = behaviourBetween(cs[0]!, cs[1]!);
  out.push({ from: Number.NEGATIVE_INFINITY, to: cs[0]!.x, behaviour: armBehaviour(first) });
  for (let i = 1; i < cs.length; i += 1) {
    out.push({ from: cs[i - 1]!.x, to: cs[i]!.x, behaviour: behaviourBetween(cs[i - 1]!, cs[i]!) });
  }
  const last = behaviourBetween(cs[cs.length - 2]!, cs[cs.length - 1]!);
  out.push({ from: cs[cs.length - 1]!.x, to: Number.POSITIVE_INFINITY, behaviour: armBehaviour(last) });
  return out;
}

/** 余弦缓动:两端斜率为零,中间严格单调。 */
function ease(t: number): number {
  return (1 - Math.cos(Math.PI * t)) / 2;
}

/**
 * f(x)。**处处有定义**(两条臂把它延伸到整条实轴)。
 * ⚠️ 不返回 null:这一节没有"无定义"的概念,返回 null 只会让调用方多写死代码。
 */
export function valueAt(curve: Curve, x: number): number {
  if (!Number.isFinite(x)) return Number.NaN;
  const cs = curve.corners;
  const first = cs[0]!;
  const last = cs[cs.length - 1]!;
  if (x <= first.x) {
    // 左臂:抛物线。相邻段向下 → 这条臂是升的 → 左边更低 → y = y0 − k(x−x0)²
    const rising = armBehaviour(behaviourBetween(cs[0]!, cs[1]!)) === 'up';
    return first.y + (rising ? -1 : 1) * curve.armK * (x - first.x) ** 2;
  }
  if (x >= last.x) {
    const rising = armBehaviour(behaviourBetween(cs[cs.length - 2]!, cs[cs.length - 1]!)) === 'up';
    return last.y + (rising ? 1 : -1) * curve.armK * (x - last.x) ** 2;
  }
  for (let i = 1; i < cs.length; i += 1) {
    const a = cs[i - 1]!;
    const b = cs[i]!;
    if (x > b.x) continue;
    // ⚠️ 平台判定**复用 `behaviourBetween`**,不在这里另写一个容差。
    //    两处各写一份"什么算平",迟早对不上 —— 变异测试证明:把这里的容差
    //    从 EPS 改成 0.5,全部测试照样绿(因为现有曲线的落差都远大于 0.5)。
    //    共用一个判据之后,改哪一边都会被走向的那些断言抓到。
    if (behaviourBetween(a, b) === 'flat') return a.y;
    return a.y + (b.y - a.y) * ease((x - a.x) / (b.x - a.x));
  }
  return last.y;
}

/** 画线用的取样。⚠️ 拐点必须**原样落在取样点里**,否则尖角会被磨圆。 */
export function sampleCurve(
  curve: Curve,
  from: number = curve.view.from,
  to: number = curve.view.to,
  count = 320,
): readonly { x: number; y: number }[] {
  const xs: number[] = [];
  for (let i = 0; i <= count; i += 1) xs.push(from + ((to - from) * i) / count);
  for (const corner of curve.corners) {
    if (corner.x <= from || corner.x >= to) continue;
    const at = xs.findIndex((x) => x > corner.x);
    xs.splice(at < 0 ? xs.length : at, 0, corner.x);
  }
  return xs.map((x) => ({ x, y: valueAt(curve, x) }));
}

/* ══ 判定:两条独立路径 ════════════════════════════════════════════ */

/**
 * 路径 A —— **查这段窗口压到了哪几段**。纯符号,不求值。
 * 压到多种走向就是 mixed。
 */
export function behaviourByStretches(curve: Curve, from: number, to: number): Reading {
  const hit = new Set<Behaviour>();
  for (const s of stretches(curve)) {
    const lo = Math.max(from, s.from);
    const hi = Math.min(to, s.to);
    if (hi - lo > EPS) hit.add(s.behaviour);
  }
  if (hit.size === 0) return 'flat';
  if (hit.size > 1) return 'mixed';
  return [...hit][0]!;
}

/**
 * 路径 B —— **在窗口内取一串点,逐对比较**。纯数值,不看段的声明。
 *
 * ⚠️ 逐对,不是只比两端。只比两端的话,跨过一个极大值的区间会被判成"上升"或"下降" ——
 * 而那正是这一节要避免的错误答案。
 */
export function behaviourByPairs(curve: Curve, from: number, to: number, samples = 40): Reading {
  const ys: number[] = [];
  for (let i = 0; i <= samples; i += 1) ys.push(valueAt(curve, from + ((to - from) * i) / samples));
  // ⚠️ 「递增」要求**每一对**都严格上升,不是"有上升的、没有下降的"。
  //    第一版写成了后者,于是"先升后平"被判成递增 —— 而 f(3.6) = f(3.9) 明摆着,
  //    它是非递减,不是递增。两条路径当场打架,这个洞才露出来。
  let allUp = true;
  let allDown = true;
  let allFlat = true;
  for (let i = 0; i < ys.length; i += 1) {
    for (let j = i + 1; j < ys.length; j += 1) {
      const d = ys[j]! - ys[i]!;
      if (d > EPS) {
        allDown = false;
        allFlat = false;
      } else if (d < -EPS) {
        allUp = false;
        allFlat = false;
      } else {
        allUp = false;
        allDown = false;
      }
    }
  }
  if (allFlat) return 'flat';
  if (allUp) return 'up';
  if (allDown) return 'down';
  return 'mixed';
}

/* ══ 整条曲线的单调区间 ════════════════════════════════════════════ */

export type MonotoneInterval = Stretch;

/**
 * 屏幕上列出的那几条单调区间 —— 就是 `stretches` 本身。
 *
 * ⚠️ 这里原来有一段"把相邻同走向的段合并起来"的逻辑。变异测试把它整段停掉,
 * 全部测试照样绿 —— 因为**按构造相邻两段的走向一定不同**(拐点正是走向改变的地方)。
 * 永远走不到的防御代码只会让人以为保证来自那里,其实来自构造本身。
 * 删掉,改成把那条不变量直接测出来(见 `stretches` 的测试)。
 */
export function monotoneIntervals(curve: Curve): readonly MonotoneInterval[] {
  return stretches(curve);
}

/** 当前窗口整个落在哪一条区间里(落不进去就是 null,说明它跨界了)。 */
export function containingInterval(
  curve: Curve,
  from: number,
  to: number,
): MonotoneInterval | null {
  return monotoneIntervals(curve).find((i) => from >= i.from - EPS && to <= i.to + EPS) ?? null;
}

/* ══ 窗口里跨过了什么 ══════════════════════════════════════════════ */

/** `turning` = 真正的极大/极小(升↔降);`change` = 与平台接壤的那种边界。 */
export type CrossingKind = 'max' | 'min' | 'change';

export interface Crossing {
  readonly x: number;
  readonly y: number;
  readonly kind: CrossingKind;
}

export function crossingKind(before: Behaviour, after: Behaviour): CrossingKind {
  if (before === 'up' && after === 'down') return 'max';
  if (before === 'down' && after === 'up') return 'min';
  return 'change';
}

/** 曲线上所有的走向切换点。 */
export function allCrossings(curve: Curve): readonly Crossing[] {
  const list = stretches(curve);
  const out: Crossing[] = [];
  for (let i = 1; i < list.length; i += 1) {
    const x = list[i]!.from;
    out.push({ x, y: valueAt(curve, x), kind: crossingKind(list[i - 1]!.behaviour, list[i]!.behaviour) });
  }
  return out;
}

/** 落在窗口**内部**的切换点。端点上的不算 —— 那种窗口并没有跨过去。 */
export function crossingsInside(curve: Curve, from: number, to: number): readonly Crossing[] {
  return allCrossings(curve).filter((c) => c.x > from + EPS && c.x < to - EPS);
}

/**
 * 把窗口按切换点切成几块,每块给一个走向。
 * mixed 的时候用它来"把区间可视化地分开"。
 */
export function splitWindow(
  curve: Curve,
  from: number,
  to: number,
): readonly MonotoneInterval[] {
  const cuts = [from, ...crossingsInside(curve, from, to).map((c) => c.x), to];
  const out: MonotoneInterval[] = [];
  for (let i = 1; i < cuts.length; i += 1) {
    const a = cuts[i - 1]!;
    const b = cuts[i]!;
    if (b - a <= EPS) continue;
    const behaviour = behaviourByStretches(curve, a, b);
    // 切完之后每一块都必须是单一走向 —— 否则说明切点找漏了。
    out.push({ from: a, to: b, behaviour: behaviour === 'mixed' ? 'flat' : behaviour });
  }
  return out;
}

/* ══ 扫描窗 ════════════════════════════════════════════════════════ */

export interface Window {
  readonly from: number;
  readonly to: number;
}

export function snapX(value: number): number {
  return Math.round(value / STEP) * STEP;
}

/**
 * 把窗口收进合法范围:落在视野内、宽度不小于 `MIN_WIDTH`、`from < to`。
 *
 * ⚠️ 和别的实验台一样,**顺序与最小宽度不许在吸附里丢掉**。
 * 吸附是最容易把两端压成同一个值的一步。
 */
export function clampWindow(curve: Curve, win: Window): Window {
  const lo = curve.view.from;
  const hi = curve.view.to;
  const width = Math.min(Math.max(snapX(win.to - win.from), MIN_WIDTH), hi - lo);
  let from = snapX(Math.min(Math.max(win.from, lo), hi - width));
  let to = snapX(from + width);
  if (to > hi + EPS) {
    to = snapX(hi);
    from = snapX(to - width);
  }
  return { from, to };
}

/** 整体平移(拖那条带子),宽度不变。 */
export function moveWindow(curve: Curve, win: Window, by: number): Window {
  return clampWindow(curve, { from: win.from + by, to: win.to + by });
}

/**
 * 拖左端。**右端钉死**,宽度不小于 `MIN_WIDTH`。
 *
 * ⚠️ 往右拖过头时要把左端**挡在右端左边**,而不是顺手把整个窗口往右推。
 * 后者在屏幕上是:我在拖左边的把手,整条带子却跟着跑了 —— 和第三节那次瞬移同一类错。
 */
export function moveLeftEdge(curve: Curve, win: Window, next: number): Window {
  const to = snapX(Math.min(Math.max(win.to, curve.view.from + MIN_WIDTH), curve.view.to));
  const from = Math.min(snapX(next), snapX(to - MIN_WIDTH));
  return { ...clampWindow(curve, { from, to }), to };
}

/** 拖右端。左端钉死。 */
export function moveRightEdge(curve: Curve, win: Window, next: number): Window {
  const from = snapX(Math.max(Math.min(win.from, curve.view.to - MIN_WIDTH), curve.view.from));
  const to = Math.max(snapX(next), snapX(from + MIN_WIDTH));
  return { ...clampWindow(curve, { from, to }), from };
}

/* ══ 一次读数 ══════════════════════════════════════════════════════ */

export interface ScanReading {
  readonly from: number;
  readonly to: number;
  readonly yFrom: number;
  readonly yTo: number;
  readonly behaviour: Reading;
  readonly crossings: readonly Crossing[];
  readonly parts: readonly MonotoneInterval[];
}

export function readWindow(curve: Curve, win: Window): ScanReading {
  const { from, to } = clampWindow(curve, win);
  const behaviour = behaviourByStretches(curve, from, to);
  return {
    from,
    to,
    yFrom: valueAt(curve, from),
    yTo: valueAt(curve, to),
    behaviour,
    crossings: crossingsInside(curve, from, to),
    parts: behaviour === 'mixed' ? splitWindow(curve, from, to) : [],
  };
}

/* ══ 显示 ══════════════════════════════════════════════════════════ */

export const BEHAVIOUR_COPY: Readonly<
  Record<Reading, { readonly arrow: string; readonly label: string; readonly output: string }>
> = {
  up: { arrow: '↗', label: 'INCREASING', output: 'Output rises.' },
  down: { arrow: '↘', label: 'DECREASING', output: 'Output falls.' },
  flat: { arrow: '→', label: 'CONSTANT', output: 'Output stays the same.' },
  mixed: { arrow: '⚠', label: 'MIXED BEHAVIOUR', output: 'Output does both.' },
};

export const CROSSING_COPY: Readonly<Record<CrossingKind, string>> = {
  max: 'a local maximum',
  min: 'a local minimum',
  change: 'the edge of a flat stretch',
};

export function showX(x: number): string {
  return showNumber(x, 1);
}

/** `(-∞, 3)` / `(3, 6)` / `(6, ∞)` —— 无穷是真的无穷,不是把有限端点写成无穷。 */
export function formatInterval(interval: { from: number; to: number }): string {
  const left = interval.from === Number.NEGATIVE_INFINITY ? '-∞' : showX(interval.from);
  const right = interval.to === Number.POSITIVE_INFINITY ? '∞' : showX(interval.to);
  return `(${left}, ${right})`;
}
