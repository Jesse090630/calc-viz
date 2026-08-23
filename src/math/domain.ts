/**
 * MATH — 定义域
 *
 *   定义域 = **函数能接受的那些输入**。
 *
 * ⚠️ 这一节最危险的地方不是数学,是 JavaScript 的两个"假值":
 *     `Math.sqrt(-2)` → **NaN**
 *     `1 / 0`         → **Infinity**
 * 两个都不是实数,但**都不会报错**。放任它们传下去,屏幕上会出现
 * "f(-2) = NaN" 或者一个飞到无穷远的点 —— 看起来像"有值",而这一节要教的
 * 恰恰是"这里没有值"。所以 `evaluate` 一律返回 **null**,由界面负责说"未定义"。
 *
 * ⚠️ 端点是学生真正会错的地方,而且两类函数**方向相反**:
 *     √x    在 x = 0 处**有**值(√0 = 0)→ 端点**属于**定义域,闭
 *     1/x   在 x = 0 处**没有**值      → 端点**不属于**定义域,开
 * 图上就是实心 vs 空心。写反了区间看起来一样,但边界处全错。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */

/** 可拖动范围与档位。0 与 2 必须精确可选 —— 它们正是两个函数的边界。 */
export const DOMAIN_RANGE = { a: -4, b: 6 } as const;
export const STEP = 0.1;

/**
 * 把 x 吸附到精确的十分位。
 * ⚠️ 不吸附的话滑块永远停不到**正好** 0 或 2,
 * 而"边界到底算不算"是这一节唯一的难点 —— 摸不到边界就讲不了。
 */
export function snapX(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const clamped = Math.min(DOMAIN_RANGE.b, Math.max(DOMAIN_RANGE.a, value));
  return Math.round(clamped / STEP) * STEP;
}

/** 一段允许的区间。端点可开可闭;±Infinity 表示无界。 */
export interface Interval {
  readonly from: number;
  readonly to: number;
  readonly closedFrom: boolean;
  readonly closedTo: boolean;
}

export interface DomainFunction {
  readonly id: string;
  readonly tex: string;
  readonly label: string;
  /**
   * 求值。**未定义处返回 null**,绝不返回 NaN 或 ±Infinity。
   * 这是整个模块最重要的一条约定。
   */
  readonly at: (x: number) => number | null;
  /** 条件的自然写法,比如 `x \ge 0` */
  readonly conditionTex: string;
  /** 区间记号,比如 `[0, \infty)` */
  readonly intervalTex: string;
  /**
   * 路径 A:**声明**的允许区间。
   * 与下面的数值探测互为独立验证 —— 一个是符号结构,一个是真的算一遍。
   */
  readonly allowed: readonly Interval[];
  /** 被挡住的那个 x(如果有单点空洞),界面用它画那个空心点 */
  readonly hole: number | null;
  /** 学生要自己推出来的那一步 */
  readonly reasonTex: string;
  readonly reason: string;
}

export const FUNCTIONS: readonly DomainFunction[] = [
  {
    id: 'sqrt',
    tex: 'f(x) = \\sqrt{x}',
    label: '√x',
    // ⚠️ x < 0 时 Math.sqrt 给 NaN。在这里挡住,不让它流出去。
    at: (x) => (Number.isFinite(x) && x >= 0 ? Math.sqrt(x) : null),
    conditionTex: 'x \\ge 0',
    intervalTex: '[0,\\ \\infty)',
    allowed: [{ from: 0, to: Infinity, closedFrom: true, closedTo: false }],
    hole: null,
    reasonTex: '\\sqrt{\\text{negative}}',
    reason: 'A square root needs something that is not negative.',
  },
  {
    id: 'reciprocal',
    tex: 'f(x) = \\dfrac{1}{x}',
    label: '1/x',
    // ⚠️ x = 0 时 1/0 给 Infinity。同样挡住 —— 无穷大不是"很大的值",是没有值。
    at: (x) => (Number.isFinite(x) && x !== 0 ? 1 / x : null),
    conditionTex: 'x \\ne 0',
    intervalTex: '(-\\infty,\\ 0) \\cup (0,\\ \\infty)',
    allowed: [
      { from: -Infinity, to: 0, closedFrom: false, closedTo: false },
      { from: 0, to: Infinity, closedFrom: false, closedTo: false },
    ],
    hole: 0,
    reasonTex: '\\dfrac{1}{0}',
    reason: 'Dividing by zero is not defined. One single input is missing.',
  },
  {
    id: 'shifted',
    tex: 'f(x) = \\sqrt{x - 2}',
    label: '√(x−2)',
    at: (x) => (Number.isFinite(x) && x - 2 >= 0 ? Math.sqrt(x - 2) : null),
    conditionTex: 'x - 2 \\ge 0 \\;\\Longrightarrow\\; x \\ge 2',
    intervalTex: '[2,\\ \\infty)',
    allowed: [{ from: 2, to: Infinity, closedFrom: true, closedTo: false }],
    hole: null,
    reasonTex: 'x - 2 \\ge 0',
    reason: 'The thing under the root must not be negative — so x − 2 ≥ 0, which means x ≥ 2.',
  },
];

/* ── 两条独立路径 ─────────────────────────────────────────────── */

/**
 * 路径 A —— 查**声明的区间**。纯符号判断,一次都不调用 `at`。
 */
export function isAllowedByIntervals(fn: DomainFunction, x: number): boolean {
  if (!Number.isFinite(x)) return false;
  return fn.allowed.some((i) => {
    const aboveLow = i.closedFrom ? x >= i.from : x > i.from;
    const belowHigh = i.closedTo ? x <= i.to : x < i.to;
    return aboveLow && belowHigh;
  });
}

/**
 * 路径 B —— **真的算一遍**,看能不能得到实数。
 * 完全不看区间表,只信 `at` 的返回值。
 */
export function isAllowedByProbe(fn: DomainFunction, x: number): boolean {
  const y = fn.at(x);
  return y !== null && Number.isFinite(y);
}

/** 界面用的一次读数 */
export interface DomainReading {
  readonly x: number;
  /** 未定义时为 null */
  readonly y: number | null;
  readonly allowed: boolean;
  /** 正好踩在被挖掉的那个点上 */
  readonly onHole: boolean;
  /** 正好踩在闭端点上 —— 这是"边界算不算"的教学时刻 */
  readonly onClosedEdge: boolean;
}

export function readDomain(fn: DomainFunction, x: number): DomainReading | null {
  if (!Number.isFinite(x)) return null;
  const y = fn.at(x);
  const allowed = y !== null && Number.isFinite(y);
  const onClosedEdge = fn.allowed.some((i) => i.closedFrom && x === i.from);
  return {
    x,
    y: allowed ? y : null,
    allowed,
    onHole: fn.hole !== null && x === fn.hole,
    onClosedEdge,
  };
}

/**
 * 把允许区间裁到画面窗口里,给"发光的那一段"用。
 * 无界的一端直接顶到窗口边缘。
 */
export function visibleAllowed(
  fn: DomainFunction,
  // ⚠️ 必须显式标 `number`。`DOMAIN_RANGE` 是 `as const`,
  //    直接用它当默认值会把参数窄化成字面量类型 `-4` / `6`,传别的数字就编译不过。
  from: number = DOMAIN_RANGE.a,
  to: number = DOMAIN_RANGE.b,
): readonly Interval[] {
  return fn.allowed
    .map((i) => ({
      from: Math.max(i.from, from),
      to: Math.min(i.to, to),
      // 被裁掉的那一端不再是原来的端点,不该画成实心
      closedFrom: i.closedFrom && i.from >= from,
      closedTo: i.closedTo && i.to <= to,
    }))
    .filter((i) => i.to > i.from);
}

/**
 * 曲线折线点。**未定义处返回 null,让调用方断线**,不要连过去 ——
 * 1/x 在 0 两侧连起来会画出一条穿过原点的假线段,正好把这一节要教的洞抹掉。
 */
export function sampleCurve(
  fn: DomainFunction,
  from: number = DOMAIN_RANGE.a,
  to: number = DOMAIN_RANGE.b,
  count = 400,
): readonly { x: number; y: number | null }[] {
  const n = Math.max(2, Math.floor(count));
  const xs: number[] = Array.from({ length: n + 1 }, (_, i) => from + ((to - from) * i) / n);

  /*
    ⚠️ 必须**显式**把那个洞塞进取样点里。
    等距网格未必踩得到它 —— 比如 [-3, 3] 取 601 个点,x = 0 落在第 300.5 个位置,
    根本不会被采到,于是曲线上没有任何一处是 null,两侧被连成一条**穿过渐近线的假线**。
    (第一版就是这样,测试找不到断点才暴露出来。)
    靠"点跑得太远会被裁掉"来断线是碰运气,不是保证。
  */
  if (fn.hole !== null && fn.hole > from && fn.hole < to) {
    const at = xs.findIndex((x) => x > fn.hole!);
    xs.splice(at < 0 ? xs.length : at, 0, fn.hole);
  }

  return xs.map((x) => {
    const y = fn.at(x);
    return { x, y: y !== null && Number.isFinite(y) ? y : null };
  });
}

/** 显示用 */
export function showX(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const fixed = value.toFixed(1);
  return fixed === '-0.0' ? '0.0' : fixed;
}

export function showY(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'undefined';
  const fixed = value.toFixed(2);
  return fixed === '-0.00' ? '0.00' : fixed;
}
