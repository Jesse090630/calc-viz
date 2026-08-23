/**
 * MATH — 什么才算一个函数
 *
 *   函数:定义域里的**每一个输入,恰好对应一个输出**。
 *
 * ⚠️ 这一节全部的重量压在一个**不对称**上,而学生几乎总是记反:
 *
 *   一个输入 → 两个输出   ✗ 不是函数
 *   两个输入 → 一个输出   ✓ 仍然是函数
 *
 * 所以这个模块里每一条判定都成对出现:证明前者被拒、且证明后者被接受。
 * 只测前者的话,一个"任何重复都拒绝"的错误实现照样全绿。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */

/* ── Part 1:输入机器 ─────────────────────────────────────────── */

/** 机器里那条规则。提示词指定 f(x) = 2x + 1。 */
export const MACHINE = {
  tex: 'f(x) = 2x + 1',
  label: '2x + 1',
  at: (x: number): number => 2 * x + 1,
} as const;

/** 机器的输入范围。整数档,读数干净:2 → 5、3 → 7、4 → 9。 */
export const MACHINE_DOMAIN = { a: -3, b: 6 } as const;

export function machineInputs(): readonly number[] {
  const out: number[] = [];
  for (let x = MACHINE_DOMAIN.a; x <= MACHINE_DOMAIN.b; x += 1) out.push(x);
  return out;
}

/* ── Part 2:映射图 ──────────────────────────────────────────── */

export interface Pair {
  readonly input: number;
  readonly output: number;
}

export interface Relation {
  readonly id: string;
  readonly label: string;
  readonly pairs: readonly Pair[];
  /** 期望结论。测试会用两条独立路径核对它,不是随手写上的。 */
  readonly expected: boolean;
  /** 一句话说明为什么 */
  readonly note: string;
}

export const RELATIONS: readonly Relation[] = [
  {
    id: 'plain',
    label: 'One each',
    pairs: [
      { input: 1, output: 4 },
      { input: 2, output: 5 },
      { input: 3, output: 6 },
    ],
    expected: true,
    note: 'Every input appears once. Nothing to argue about.',
  },
  {
    id: 'split',
    label: 'Input 1 twice',
    pairs: [
      { input: 1, output: 4 },
      { input: 1, output: 7 },
      { input: 2, output: 5 },
    ],
    expected: false,
    note: 'Input 1 leaves with two different outputs. That is the one thing a function may not do.',
  },
  {
    id: 'shared',
    label: 'Shared output',
    pairs: [
      { input: 1, output: 5 },
      { input: 2, output: 5 },
      { input: 3, output: 6 },
    ],
    // ⚠️ 这一条是这一节真正的教学点:学生看到重复的 5 就想喊"不是函数"。
    //    它必须判为**是**函数,否则整节课的落点就反了。
    expected: true,
    note: 'Two inputs land on the same output. Still a function — the rule only restricts inputs.',
  },
];

/* ── 判定:两条独立路径 ─────────────────────────────────────── */

/**
 * 路径 A —— **按输入分组**。
 * 把每个输入见过的输出收集起来,只要有一个输入收集到两个不同的输出,就不是函数。
 * 这是定义的直接翻译。
 */
export function isFunctionByGrouping(pairs: readonly Pair[]): boolean {
  const seen = new Map<number, number>();
  for (const p of pairs) {
    const previous = seen.get(p.input);
    if (previous !== undefined && previous !== p.output) return false;
    seen.set(p.input, p.output);
  }
  return true;
}

/**
 * 路径 B —— **数个数**,完全不分组。
 *
 * 依据:去重之后,
 *   不同的「输入」个数 === 不同的「(输入,输出) 对」个数   ⟺   是函数。
 * 因为一个输入配两个不同输出时,对数会比输入数多。
 * 这条路径既不遍历比较、也不记忆上一次的值,和路径 A 的推理毫无重叠。
 */
export function isFunctionByCounting(pairs: readonly Pair[]): boolean {
  const inputs = new Set(pairs.map((p) => p.input));
  const distinctPairs = new Set(pairs.map((p) => `${p.input}→${p.output}`));
  return inputs.size === distinctPairs.size;
}

/**
 * 出问题的那个输入 —— 界面靠它把两条箭头标红。
 * 没有问题时返回 null。
 */
export function offendingInput(pairs: readonly Pair[]): number | null {
  const seen = new Map<number, number>();
  for (const p of pairs) {
    const previous = seen.get(p.input);
    if (previous !== undefined && previous !== p.output) return p.input;
    seen.set(p.input, p.output);
  }
  return null;
}

/** 那个输入身上挂着的所有输出(用来写"1 → 4 和 1 → 7") */
export function outputsOf(pairs: readonly Pair[], input: number): readonly number[] {
  return [...new Set(pairs.filter((p) => p.input === input).map((p) => p.output))];
}

/**
 * 有没有"两个输入共用一个输出"。
 * ⚠️ 它**不影响**是不是函数 —— 存在这个函数只是为了让界面能明说
 * "这里确实有共享,但那不是问题"。把它和 `isFunction` 混为一谈正是要破除的误解。
 */
export function hasSharedOutput(pairs: readonly Pair[]): boolean {
  const byOutput = new Map<number, Set<number>>();
  for (const p of pairs) {
    const set = byOutput.get(p.output) ?? new Set<number>();
    set.add(p.input);
    byOutput.set(p.output, set);
  }
  return [...byOutput.values()].some((inputs) => inputs.size > 1);
}

/* ── Part 3:垂线测试 ────────────────────────────────────────── */

export interface Curve {
  readonly id: string;
  readonly tex: string;
  readonly label: string;
  /**
   * 这条曲线在给定 x 处的所有 y 值(已去重)。
   * **返回数组的长度就是垂线的交点数** —— 界面直接用它。
   */
  readonly yAt: (x: number) => readonly number[];
  readonly isFunction: boolean;
  readonly note: string;
}

/** 判定两个 y 是否算同一个交点。抛物线顶点处两支重合,靠它合并。 */
const SAME_Y = 1e-9;

function dedupe(values: readonly number[]): readonly number[] {
  const out: number[] = [];
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    if (!out.some((u) => Math.abs(u - v) <= SAME_Y)) out.push(v);
  }
  return out;
}

export const CURVES: readonly Curve[] = [
  {
    id: 'parabola',
    tex: 'y = x^2',
    label: 'y = x²',
    yAt: (x) => (Number.isFinite(x) ? [x * x] : []),
    isFunction: true,
    note: 'Every vertical line meets it once. One input, one output.',
  },
  {
    id: 'sideways',
    tex: 'x = y^2',
    label: 'x = y²',
    /**
     * ⚠️ x = 0 处两支**重合**,交点是 **1 个**,不是 2 个。
     * 直接返回 [+√x, −√x] 会在顶点报 2 —— 差一个点,但那个点正好是
     * "从 0 个变成 2 个"的分界,讲不清楚整节课就散了。`dedupe` 负责合并。
     */
    yAt: (x) => {
      // ⚠️ x < 0 这一句是显式的,但**不是**唯一防线:`Math.sqrt(-1)` 给 NaN,
      //    `dedupe` 也会把它滤掉。变异测试证实了这点(删掉这行测试照样全绿)。
      //    留着是为了让"左边没有交点"这件事在代码里直说,而不是靠 NaN 的副作用。
      if (!Number.isFinite(x) || x < 0) return [];
      const root = Math.sqrt(x);
      return dedupe([root, -root]);
    },
    isFunction: false,
    note: 'To the right of the y-axis every vertical line meets it twice. One input, two outputs.',
  },
];

/**
 * 交点数的**第二条独立路径**:把它看成关于 y 的方程有几个实根。
 *   y = x²  → 恒 1 个(y 被 x 唯一确定)
 *   x = y²  → y² − x = 0,x > 0 有 2 根,x = 0 有 1 根(重根),x < 0 无实根
 * 完全不调用 `yAt`,也不做去重 —— 靠的是根的个数,与枚举分支毫无重叠。
 */
export function intersectionCountByRoots(curveId: string, x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (curveId === 'parabola') return 1;
  if (curveId === 'sideways') {
    if (x < 0) return 0;
    if (x === 0) return 1; // 重根
    return 2;
  }
  return 0;
}

/** 曲线折线点。侧躺抛物线要分两支画,所以按分支返回。 */
export function curveBranches(
  curve: Curve,
  from: number,
  to: number,
  count = 200,
): readonly (readonly { x: number; y: number }[])[] {
  const n = Math.max(2, Math.floor(count));
  if (curve.id === 'parabola') {
    return [
      Array.from({ length: n + 1 }, (_, i) => {
        const x = from + ((to - from) * i) / n;
        return { x, y: x * x };
      }),
    ];
  }
  // x = y²:上下两支,都从 x = 0 起
  const start = Math.max(0, from);
  const upper: { x: number; y: number }[] = [];
  const lower: { x: number; y: number }[] = [];
  for (let i = 0; i <= n; i += 1) {
    const x = start + ((to - start) * i) / n;
    if (x < 0) continue;
    const root = Math.sqrt(x);
    upper.push({ x, y: root });
    lower.push({ x, y: -root });
  }
  return [upper, lower];
}

/** 显示用 */
export function showValue(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const fixed = value.toFixed(2);
  return fixed === '-0.00' ? '0.00' : fixed;
}

export function showInt(value: number): string {
  return Number.isFinite(value) ? String(value) : '—';
}
