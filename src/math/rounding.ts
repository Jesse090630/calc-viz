/**
 * MATH — 两个取整函数
 *
 *   ⌊x⌋ = **小于或等于 x 的最大整数**(向下)
 *   ⌈x⌉ = **大于或等于 x 的最小整数**(向上)
 *
 * ⚠️ 这一节只有一个真正的坑,而且是最经典的那个:**负数**。
 *   ⌊-1.3⌋ = **-2**,不是 -1。
 * 几乎所有"顺手"的写法都会在这里出错:
 *   `Math.trunc(-1.3)` = -1   ← 朝零截断
 *   `parseInt('-1.3')`  = -1
 *   `~~(-1.3)`          = -1
 *   `(-1.3) | 0`        = -1
 *   `Math.round(-1.3)`  = -1
 * 只有"向下"才对。这也正是学生要学的那件事。
 * 上取整同理:⌈-1.3⌉ = **-1**,而"朝零截断"在这里**碰巧对了** ——
 * 更阴险,因为它会让人以为截断就是上取整。⌈4.2⌉ = 5 才是它露馅的地方。
 *
 * ⚠️ 两个方向写在**同一个文件**里,不是两份。
 * 分成 floorFunction.ts / ceilingFunction.ts 迟早出现"一边改了另一边没改"。
 * 而且它们共用 DOMAIN / STEP / snapX / 刻度 —— 复制一份等于给自己埋两处真相。
 *
 * ⭐ 所以主路径**不调用 `Math.floor`**,而是把定义写出来:
 *   先朝零截断,再检查 —— 如果截断的结果比 x 大,说明越过头了,往下退一格。
 * 那个"往下退一格"的分支就是负数修正本身,在代码里看得见。
 * `Math.floor` 留给测试当**第二条独立验证路径**(与 logIntegral 不用 `Math.log` 同一条纪律)。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */

/** 数轴上要标出来的整数(提示词指定) */
export const TICKS: readonly number[] = [-3, -2, -1, 0, 1, 2, 3, 4, 5];

/** 可拖动的范围。比刻度略窄一点,免得手柄贴在画面边缘。 */
export const DOMAIN = { a: -3, b: 5 } as const;

/** 滑块步长:十分之一。⌊x⌋ 的教学不需要更细,而且十分位读起来干净。 */
export const STEP = 0.1;

/**
 * 把 x 吸附到**精确的十分位**。
 *
 * ⚠️ 不是为了好看,是为了正确。
 * 连续累加 0.1 会得到 2.9999999999999996 这种值,`⌊x⌋` 于是给出 **2**,
 * 而屏幕上明明写着 `x = 3.0` —— 一个看得见的矛盾,而且正好出现在
 * "整数处到底取哪个值"这个最关键的位置上。
 */
export function snapX(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const clamped = Math.min(DOMAIN.b, Math.max(DOMAIN.a, value));
  return Math.round(clamped / STEP) * STEP;
}

/**
 * ⌊x⌋ —— **按定义算,不调用 `Math.floor`**。
 *
 * 第一步朝零截断;第二步是这一节的全部内容:
 * 截断结果如果**大于** x,说明它跑到 x 右边去了,不满足 `n ≤ x`,必须往下退一格。
 * 对正数这个分支永远不触发;对负的非整数它每次都触发。
 */
export function floorByDefinition(x: number): number | null {
  if (!Number.isFinite(x)) return null;
  // 用 Math.trunc 而不是别的:朝零截断正是学生会顺手写出来的那一步,
  // 把它摆在这里,下一行的修正才有说服力。
  // (变异测试顺带确认了 Math.round 在这里也能给出正确结果 —— 那不是缺陷,
  //  只是另一种等价写法;真正不能少的是下面那一行。)
  const towardZero = Math.trunc(x);
  // ⚠️ 就是这一行把 -1 变成 -2。删掉它,正数全对、负数全错。
  const result = towardZero > x ? towardZero - 1 : towardZero;
  // -0 会让显示变成 "-0",而 ⌊0.5⌋ 应该写作 0
  return result === 0 ? 0 : result;
}

/**
 * ⌈x⌉ —— 同样**按定义算,不调用 `Math.ceil`**。
 *
 * 结构与 `floorByDefinition` 镜像:朝零截断之后,
 * 如果截断结果**小于** x,说明它落在 x 左边,不满足 `n ≥ x`,必须往上进一格。
 * 对负数这个分支永远不触发(截断本来就在 x 右边);对正的非整数它每次都触发。
 */
export function ceilByDefinition(x: number): number | null {
  if (!Number.isFinite(x)) return null;
  const towardZero = Math.trunc(x);
  // ⚠️ 就是这一行把 4 变成 5。删掉它,负数全对、正数全错 —— 正好和下取整反过来。
  const result = towardZero < x ? towardZero + 1 : towardZero;
  return result === 0 ? 0 : result;
}

/**
 * 第二条独立路径:**⌈x⌉ = −⌊−x⌋**。
 * 完全不碰截断逻辑,靠的是"把数轴翻过来,向上就变成向下"。
 * 测试里用它与 `ceilByDefinition` 互证。
 */
export function ceilByReflection(x: number): number | null {
  const down = floorByDefinition(-x);
  if (down === null) return null;
  const result = -down;
  return result === 0 ? 0 : result;
}

/** 取整方向 */
export type Direction = 'floor' | 'ceiling';

export const ROUND: Readonly<Record<Direction, {
  readonly id: Direction;
  readonly label: string;
  /** 结果的 TeX 括号 */
  readonly tex: (inner: string) => string;
  /** 纯文本括号,给读屏和测试用 */
  readonly brackets: (inner: string) => string;
  readonly at: (x: number) => number | null;
  /** 定义里那个不等号方向:⌊⌋ 是 ≤,⌈⌉ 是 ≥ */
  readonly relation: string;
  readonly verb: string;
  readonly arrow: string;
}>> = {
  floor: {
    id: 'floor',
    label: 'Floor',
    tex: (inner) => `\\lfloor ${inner} \\rfloor`,
    brackets: (inner) => `⌊${inner}⌋`,
    at: floorByDefinition,
    relation: '≤',
    verb: 'drops',
    arrow: '↓',
  },
  ceiling: {
    id: 'ceiling',
    label: 'Ceiling',
    tex: (inner) => `\\lceil ${inner} \\rceil`,
    brackets: (inner) => `⌈${inner}⌉`,
    at: ceilByDefinition,
    relation: '≥',
    verb: 'jumps',
    arrow: '↑',
  },
};

/**
 * 定义的两个条件,分开返回,好让界面逐条展示:
 *   ① n ≤ x        —— n 没有越过 x
 *   ② n + 1 > x    —— 再往上一个整数就越过了,所以 n 是**最大**的那个
 */
export interface RoundingReading {
  readonly direction: Direction;
  readonly x: number;
  /** 结果 */
  readonly n: number;
  /** 定义第一条:⌊⌋ 要 n ≤ x,⌈⌉ 要 n ≥ x */
  readonly satisfies: boolean;
  /** 定义第二条:再挪一格就不满足了,所以 n 是最靠边的那个 */
  readonly isTightest: boolean;
  /** 被否决的那个整数 —— 下取整是 n+1,上取整是 n−1 */
  readonly rejected: number;
  /** x 本身就是整数吗(此时结果就是 x) */
  readonly exact: boolean;
  /** 这一格的区间。下取整是 [n, n+1),上取整是 (n−1, n] */
  readonly stepFrom: number;
  readonly stepTo: number;
  /** 左端点属于本格吗?下取整是,上取整不是 —— 阶梯图的实心/空心就看它 */
  readonly closedOnLeft: boolean;
}

export function readRounding(x: number, direction: Direction): RoundingReading | null {
  const n = ROUND[direction].at(x);
  if (n === null) return null;
  const down = direction === 'floor';
  return {
    direction,
    x,
    n,
    satisfies: down ? n <= x : n >= x,
    // 往"不该去"的方向挪一格,就会违反上面那一条 —— 这正是"最大/最小"的含义
    isTightest: down ? n + 1 > x : n - 1 < x,
    rejected: down ? n + 1 : n - 1,
    exact: n === x,
    stepFrom: down ? n : n - 1,
    stepTo: down ? n + 1 : n,
    closedOnLeft: down,
  };
}

/** 阶梯图的每一格 */
export interface Step {
  readonly from: number;
  readonly to: number;
  readonly value: number;
  /** 左端点是否属于本格。下取整 true(实心在左),上取整 false(实心在右)。 */
  readonly closedOnLeft: boolean;
}

/**
 * 阶梯图数据。
 *
 * ⚠️ 两个方向的**开闭端点正好相反**,这是这一节最容易画错的地方:
 *   ⌊x⌋ = n 对应 x ∈ **[n, n+1)** —— 左实心、右空心
 *   ⌈x⌉ = n 对应 x ∈ **(n−1, n]** —— 左空心、右实心
 * 画反了图形看起来一模一样,但在整数处的取值全错。
 */
export function steps(direction: Direction, from = DOMAIN.a, to = DOMAIN.b): readonly Step[] {
  const out: Step[] = [];
  const start = floorByDefinition(from) ?? 0;
  for (let n = start; n < to; n += 1) {
    out.push({
      from: n,
      to: n + 1,
      // 下取整:这一格的高度是左端点 n;上取整:高度是右端点 n+1
      value: direction === 'floor' ? n : n + 1,
      closedOnLeft: direction === 'floor',
    });
  }
  return out;
}

/** 显示用。⚠️ 十分位一位小数,和滑块步长一致 —— 不一致会显示出滑块到不了的值。 */
export function showX(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const fixed = value.toFixed(1);
  return fixed === '-0.0' ? '0.0' : fixed;
}

/** 整数显示,不带小数点 */
export function showN(value: number): string {
  return Number.isFinite(value) ? String(value) : '—';
}
