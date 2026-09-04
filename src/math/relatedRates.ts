/**
 * MATH — 相关变化率:把关系式**对 t 求导**。
 *
 * ⭐⭐ 这一课的论点和隐函数求导是同一句话,只是自变量换成了 t:
 *
 *   关系式里的每一个量**都是时间的函数**,所以对 t 求导时,
 *   每一项都会挂上一个 `d/dt` —— 和 `#/implicit` 里每个 y 项挂上 `dy/dx` 一模一样。
 *   「相关变化率」不是新技术,是**链式法则,自变量是 t**。
 *
 *   梯子:`x² + y² = L²`  →  `2x·(dx/dt) + 2y·(dy/dt) = 0`  →  `dy/dt = −(x/y)·(dx/dt)`
 *
 * ⚠️⚠️ 梯子那个例子里藏着一个**著名的**、而且值得摆出来的失效:
 *   梯脚滑到墙根时 `y → 0`,公式给出 `dy/dt → −∞` —— 顶端"无限快"地落下。
 *   那不是算错,是**模型本身在这里不再成立**(真实的梯子早就离开墙面了)。
 *   本模块在 `y = 0` 处返回 `null`,并把这句话说出来:
 *   **一个模型给出无穷大,通常是模型的边界到了,不是世界的边界到了。**
 *
 * ⭐ 两条互不相干的路径算同一个变化率:
 *   ① `rateExact`   —— 对关系式求导得到的闭形式;
 *   ② `rateNumeric` —— 直接对被追踪的那个量做**时间上的**中心差商,完全不碰关系式。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import { showNumber } from './format';

/* ══ 情景 ══════════════════════════════════════════════════════════ */

export interface Scenario {
  readonly id: string;
  readonly label: string;
  /** 关系式 */
  readonly relationTex: string;
  /** 对 t 求导之后 */
  readonly differentiatedTex: string;
  /** 解出来的那个率 */
  readonly solvedTex: string;

  /** 被给定的那个率(常数),以及它的名字 */
  readonly givenRate: number;
  readonly givenLabel: string;
  /** 要求的那个率的名字 */
  readonly wantedLabel: string;

  /** 时间 t 时,驱动量的值 */
  readonly driverAt: (t: number) => number;
  /** 时间 t 时,被追踪量的值。⚠️ 模型失效处返回 null。 */
  readonly trackedAt: (t: number) => number | null;
  readonly driverLabel: string;
  readonly trackedLabel: string;

  /** ⭐ 路径 ①:由关系式求导得到的闭形式。失效处返回 null。 */
  readonly rateExact: (t: number) => number | null;

  readonly tRange: readonly [number, number];
  readonly startT: number;
  /** 模型在哪个 t 失效(没有则 null) */
  readonly breaksAt: number | null;
  readonly breakNote: string;
  /**
   * ⭐ **闭形式反解**:给一个界 B,直接算出第一个让 |率| > B 的 t。
   * 不会失效的情景没有这个字段。
   *
   * ⚠️ 第一版用**均匀扫描**找这个 t,结果扫不到 —— 靠近失效点时率按 `1/√δ`
   * 发散,均匀取样在最后一格里就已经错过了几个数量级(20000 步只够到 |率| ≈ 67)。
   * 这正是这个项目一直在批的那个毛病:**用取样堆砌代替构造**。
   * 现在按公式反解,任意界都够得着。
   */
  readonly timeForRate?: (bound: number) => number | null;
}

const L = 5;          // 梯子长度
// 气球初始体积:(4/3)π·1³,即 r₀ **恰好**是 1。
// ⚠️ 别写成 4.18879 —— 那样 r₀ = 0.99999…,课文说"从半径 1 开始"就成了近似的谎。
const V0 = (4 / 3) * Math.PI;

export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'ladder',
    label: 'A ladder slides down a wall',
    relationTex: 'x^2 + y^2 = 5^2',
    differentiatedTex: '2x\\frac{dx}{dt} + 2y\\frac{dy}{dt} = 0',
    solvedTex: '\\frac{dy}{dt} = -\\frac{x}{y}\\cdot\\frac{dx}{dt}',
    givenRate: 0.6,
    givenLabel: 'dx/dt',
    wantedLabel: 'dy/dt',
    driverAt: (t) => 1 + 0.6 * t,
    trackedAt: (t) => {
      const x = 1 + 0.6 * t;
      const inside = L * L - x * x;
      return inside <= 0 ? null : Math.sqrt(inside);
    },
    driverLabel: 'x (foot from wall)',
    trackedLabel: 'y (top up the wall)',
    rateExact: (t) => {
      const x = 1 + 0.6 * t;
      const inside = L * L - x * x;
      if (inside <= 0) return null;
      const y = Math.sqrt(inside);
      return -(x / y) * 0.6;
    },
    // ⚠️ 上界必须**越过** breaksAt(≈6.667),否则滑块永远到不了失效点,
    //    那段「模型的边界到了」的画面就成了死界面 —— 和链式法则那次同一个错。
    tRange: [0, 7.5],
    startT: 3,
    // x 到 5 时 y = 0 —— 也就是 t = (5−1)/0.6
    breaksAt: (L - 1) / 0.6,
    /**
     * |dy/dt| = (x/y)·v,y = √(L²−x²)。
     * |dy/dt| > B  ⟺  x·v > B√(L²−x²)  ⟺  x > B·L/√(v² + B²)。
     * 再由 x = 1 + v·t 反解出 t。
     */
    timeForRate: (bound: number) => {
      if (!Number.isFinite(bound) || bound <= 0) return null;
      const v = 0.6;
      const x = (bound * L) / Math.sqrt(v * v + bound * bound);
      if (x <= 1 || x >= L) return null;
      return (x - 1) / v;
    },
    breakNote:
      'As the foot reaches the wall the formula sends the top down infinitely fast. That is not a calculation error — it is the model running out. A real ladder leaves the wall before this. When a model reports infinity, the usual reason is that the model stopped applying, not that the world did something infinite.',
  },
  {
    id: 'balloon',
    label: 'A balloon inflates at a steady rate',
    relationTex: 'V = \\tfrac{4}{3}\\pi r^3',
    differentiatedTex: '\\frac{dV}{dt} = 4\\pi r^2\\frac{dr}{dt}',
    solvedTex: '\\frac{dr}{dt} = \\frac{1}{4\\pi r^2}\\cdot\\frac{dV}{dt}',
    givenRate: 3,
    givenLabel: 'dV/dt',
    wantedLabel: 'dr/dt',
    driverAt: (t) => V0 + 3 * t,
    trackedAt: (t) => Math.cbrt((3 * (V0 + 3 * t)) / (4 * Math.PI)),
    driverLabel: 'V (volume)',
    trackedLabel: 'r (radius)',
    rateExact: (t) => {
      const r = Math.cbrt((3 * (V0 + 3 * t)) / (4 * Math.PI));
      if (r === 0) return null;
      return 3 / (4 * Math.PI * r * r);
    },
    tRange: [0, 10],
    startT: 2,
    breaksAt: null,
    breakNote: '',
  },
  {
    id: 'circle',
    label: 'A ripple spreads outward',
    relationTex: 'A = \\pi r^2',
    differentiatedTex: '\\frac{dA}{dt} = 2\\pi r\\frac{dr}{dt}',
    solvedTex: '\\frac{dA}{dt} = 2\\pi r\\cdot\\frac{dr}{dt}',
    givenRate: 0.4,
    givenLabel: 'dr/dt',
    wantedLabel: 'dA/dt',
    driverAt: (t) => 1 + 0.4 * t,
    trackedAt: (t) => Math.PI * (1 + 0.4 * t) ** 2,
    driverLabel: 'r (radius)',
    trackedLabel: 'A (area)',
    rateExact: (t) => 2 * Math.PI * (1 + 0.4 * t) * 0.4,
    tRange: [0, 10],
    startT: 3,
    breaksAt: null,
    breakNote: '',
  },
] as const;

export function scenarioOf(id: string): Scenario {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0]!;
}

/* ══ 两条独立路径 ══════════════════════════════════════════════════ */

/**
 * 路径 ② —— **直接对被追踪量做时间上的中心差商**,完全不碰关系式。
 * 所以 ① 与 ② 一致,是对"把关系式对 t 求导"这件事的真实检验。
 *
 * ⚠️ 差商会踩出模型的有效区间时返回 null,不瞎猜。
 */
export function rateNumeric(s: Scenario, t: number, h = 1e-5): number | null {
  const before = s.trackedAt(t - h);
  const after = s.trackedAt(t + h);
  if (before === null || after === null) return null;
  const value = (after - before) / (2 * h);
  return Number.isFinite(value) ? value : null;
}

/** 两条路径在这个 t 上是否吻合。 */
export function pathsAgree(s: Scenario, t: number, tol = 1e-3): boolean {
  const a = s.rateExact(t);
  const b = rateNumeric(s, t);
  if (a === null || b === null) return false;
  return Math.abs(a - b) <= tol * Math.max(1, Math.abs(a));
}

/* ══ 模型在哪儿失效 ═══════════════════════════════════════════════ */

/** 这个 t 还在模型的有效范围内吗。 */
export function isValid(s: Scenario, t: number): boolean {
  return s.trackedAt(t) !== null && s.rateExact(t) !== null;
}

/**
 * ⭐ 越靠近失效点,那个率越大 —— 而且**要多大有多大**。
 * 给一个界,返回第一个让 |率| 超过它的 t;做不到就 null。
 * ⚠️ 用**构造**回答"发散"这件事,不是"看着像"。
 */
export function timeExceeding(s: Scenario, bound: number): number | null {
  if (s.breaksAt === null || s.timeForRate === undefined) return null;
  /**
   * ⚠️ 反解出来的 t 恰好让 |率| **等于** bound,不是大于。
   * 第一版靠一个 `1e-6` 的挪动去越过它 —— 那个数字是凭空来的,
   * 而且"到底越过了没有"要看浮点脸色(变异测试正是从这里溜过去的)。
   *
   * 现在换个说法:**直接去解一个更高的界**。要 |率| > bound,
   * 就解 |率| = bound·(1 + MARGIN) 的那个时刻 —— 它必然满足要求,
   * 而且"为什么满足"是一句话能说清的,不是一个魔数。
   */
  const MARGIN = 1e-3;
  const t = s.timeForRate(bound * (1 + MARGIN));
  if (t === null || t >= s.breaksAt) return null;
  const r = s.rateExact(t);
  return r !== null && Math.abs(r) > bound ? t : null;
}

/* ══ 逐项:每个量都是 t 的函数 ════════════════════════════════════ */

export interface Term {
  readonly beforeTex: string;
  readonly afterTex: string;
  /** 这一项挂上了 d/dt 吗 */
  readonly carriesRate: boolean;
  readonly why: string;
}

/**
 * ⭐⭐ 这一课的支点,和隐函数求导那一课同构:
 * **每一个随时间变的量,求导时都挂上自己的变化率**;常数不挂。
 */
export function terms(s: Scenario): readonly Term[] {
  if (s.id === 'balloon') {
    return [
      { beforeTex: 'V', afterTex: '\\frac{dV}{dt}', carriesRate: true,
        why: 'V changes with time, so differentiating it leaves its own rate behind.' },
      { beforeTex: '\\tfrac{4}{3}\\pi r^3', afterTex: '4\\pi r^2\\frac{dr}{dt}', carriesRate: true,
        why: 'r changes with time too, so the chain rule attaches dr/dt to the outside derivative.' },
    ];
  }
  if (s.id === 'circle') {
    return [
      { beforeTex: 'A', afterTex: '\\frac{dA}{dt}', carriesRate: true,
        why: 'A changes with time, so differentiating it leaves its own rate behind.' },
      { beforeTex: '\\pi r^2', afterTex: '2\\pi r\\frac{dr}{dt}', carriesRate: true,
        why: 'r changes with time too, so the chain rule attaches dr/dt to the outside derivative.' },
    ];
  }
  return [
    { beforeTex: 'x^2', afterTex: '2x\\frac{dx}{dt}', carriesRate: true,
      why: 'x changes with time, so the chain rule attaches its rate dx/dt.' },
    { beforeTex: 'y^2', afterTex: '2y\\frac{dy}{dt}', carriesRate: true,
      why: 'y changes with time as well, so it attaches dy/dt.' },
    { beforeTex: '5^2', afterTex: '0', carriesRate: false,
      why: 'The ladder length never changes, so its derivative is zero. This is the only term without a rate.' },
  ];
}

/** ⭐ 不带变化率的项 = 常数项。界面上要能指着说"只有它不动"。 */
export function constantTerms(s: Scenario): number {
  return terms(s).filter((t) => !t.carriesRate).length;
}

/* ══ 取值与显示 ═══════════════════════════════════════════════════ */

export function clampT(s: Scenario, t: number): number {
  if (!Number.isFinite(t)) return s.startT;
  /**
   * ⚠️⚠️ 这里**不能**四舍五入。
   * 第一版抄了 `clampX` 的 `Math.round(t * 1000) / 1000`,在别处没问题,
   * 但这一课有意思的地方**只有 1e-4 宽** —— 率超过 1000 的那一刻在 t ≈ 6.66666,
   * 三位小数一round 就变成 6.667,**越过了失效点 6.66667**。
   * 于是「跳到率超过 1000」这个按钮跳过去,屏幕上显示的是「模型的边界到了」——
   * 按钮承诺一个巨大的数字,给出的却是失效画面。
   * 取整是显示的事,`show()` 已经管了;这里保留精度。
   */
  return Math.min(Math.max(t, s.tRange[0]), s.tRange[1]);
}

/**
 * ⭐⭐ 还剩多少时间到失效点。
 *
 * ⚠️ 加这个不是为了好看,是为了消掉屏幕上的一处**自相矛盾**:
 *   「跳到率超过 1000」会把 t 送到 6.66666,读数四舍五入显示 6.67,
 *   而旁边写着「模型在 t = 6.667 失效」—— 照字面读,现在已经过界了,
 *   可各项数值又都好端端的。两块内容互相打架。
 *
 * ⭐ 而这个量本身就是这一课要讲的东西:**率大约正比于 1/剩余时间**。
 *   把巨大的率和微小的间隙并排放着,爆炸就不神秘了 —— 它是被除出来的。
 */
export function timeLeft(s: Scenario, t: number): number | null {
  if (s.breaksAt === null) return null;
  const gap = s.breaksAt - t;
  return gap > 0 ? gap : null;
}

export function show(value: number | null, places = 4): string {
  return value === null || !Number.isFinite(value) ? 'undefined' : showNumber(value, places);
}

export const HEADLINE = 'Differentiate the Relation With Respect to Time';
export const MAIN_IDEA =
  'Every quantity that moves is a function of t, so every such term leaves its own rate behind.';

export const KINSHIP_NOTE =
  'This is the same move as implicit differentiation. There the variable was x and the leftover factor was dy/dx; here the variable is t and the leftover factors are the rates.';
