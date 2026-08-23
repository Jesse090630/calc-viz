/**
 * MATH — 取整函数 ⌊x⌋
 *
 *   ⌊x⌋ = **小于或等于 x 的最大整数**
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
 * 定义的两个条件,分开返回,好让界面逐条展示:
 *   ① n ≤ x        —— n 没有越过 x
 *   ② n + 1 > x    —— 再往上一个整数就越过了,所以 n 是**最大**的那个
 */
export interface FloorReading {
  readonly x: number;
  readonly n: number;
  /** n ≤ x */
  readonly doesNotPass: boolean;
  /** n + 1 > x —— 没有更大的整数还能满足条件 */
  readonly isGreatest: boolean;
  /** x 本身就是整数吗(此时 ⌊x⌋ = x) */
  readonly exact: boolean;
  /** 这一格的区间 [n, n+1) */
  readonly stepFrom: number;
  readonly stepTo: number;
}

export function readFloor(x: number): FloorReading | null {
  const n = floorByDefinition(x);
  if (n === null) return null;
  return {
    x,
    n,
    doesNotPass: n <= x,
    isGreatest: n + 1 > x,
    exact: n === x,
    stepFrom: n,
    stepTo: n + 1,
  };
}

/**
 * 「上面那个整数」—— 用来解释负数为什么不能取它。
 * 对 x = -1.3 就是 -1:它**大于** x,所以违反 `n ≤ x`。
 */
export function integerAbove(x: number): number | null {
  const n = floorByDefinition(x);
  return n === null ? null : n + 1;
}

/** 阶梯图的每一格 */
export interface Step {
  readonly from: number;
  readonly to: number;
  readonly value: number;
}

/**
 * 阶梯图数据。每格是 `[n, n+1)`:
 * **左端闭**(实心圆,x = n 时取到 n),**右端开**(空心圆,x = n+1 时已经跳到下一格)。
 */
export function steps(from = DOMAIN.a, to = DOMAIN.b): readonly Step[] {
  const out: Step[] = [];
  const start = floorByDefinition(from) ?? 0;
  for (let n = start; n < to; n += 1) {
    out.push({ from: n, to: n + 1, value: n });
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
