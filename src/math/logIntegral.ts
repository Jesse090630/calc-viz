/**
 * MATH CORE — 为什么 ∫dx/x 偏偏是 ln
 *
 * ⚠️ **本文件的主计算路径绝对不许调用 `Math.log`。**
 * 整条链要推导的结论就是"那块面积是一个对数";用 `Math.log` 去算它,
 * 等于把结论当前提,推导就变成了循环论证。
 * 所有面积一律走 `adaptiveSimpson` 数值积分。
 * `Math.log` 只允许出现在 **测试** 里,作为第二条独立验证路径。
 *
 * ── 这条链的三个支点 ─────────────────────────────────────────────────
 * ① 幂法则 `∫xⁿdx = x^(n+1)/(n+1)` 在 n = −1 处**不是给出另一个答案**,
 *    而是分母为 0、公式坏掉了。把 n 当变量看,它是一个 **0/0 的可去间断**
 *    —— 和 limits 链第 1 步是同一个故事。
 * ② 真正的几何理由:横向拉伸 b 倍、纵向压缩 1/b 倍时,`1/x` 的图像**回到自己**。
 *    所以 `[1,2]` 与 `[2,4]` 下的面积**完全相等**(后者更宽更矮)。
 * ③ 面积因此把乘法变成加法:`A(bc) = A(b) + A(c)`。只有对数会这样。
 *    底数由 `A(t) = 1` 定出,那个 t 就是 e。
 */
import { adaptiveSimpson } from './quadrature';
import type { Interval } from './types';

/** `1/x` 在 0 处有极点,整条链只在这一侧工作 */
export const POSITIVE_DOMAIN: Interval = [1e-9, Number.POSITIVE_INFINITY];

/**
 * 幂法则给出的定积分 `∫₁^b xⁿ dx = (b^(n+1) − 1)/(n+1)`。
 *
 * ⚠️ `n = −1` 时分子分母同时为 0,返回 **`null`** 而不是 NaN。
 * 沿用 `limits.ts` 立下的约定:无定义必须是一个调用方**被迫处理**的值。
 * NaN 会一路传下去,把"这里没有值"悄悄变成屏幕上一个看不见的错数字。
 */
export function powerAntiderivativeAt(n: number, b: number): number | null {
  if (!Number.isFinite(n) || !Number.isFinite(b) || b <= 0) return null;
  const p = n + 1;
  const value = (Math.pow(b, p) - 1) / p; // n = −1 时这里就是 0/0
  return Number.isFinite(value) ? value : null;
}

/**
 * `A(t) = ∫₁ᵗ dx/x`,用自适应 Simpson 算。
 *
 * t < 1 时把区间反过来再取负,避免把反向积分交给递归去处理。
 * t ≤ 0 返回 null(积分路径会穿过极点)。
 */
export function areaUnderReciprocal(t: number): number | null {
  if (!Number.isFinite(t) || t <= 0) return null;
  if (t === 1) return 0;
  const reciprocal = (x: number): number => 1 / x;
  return t > 1
    ? adaptiveSimpson(reciprocal, 1, t)
    : -adaptiveSimpson(reciprocal, t, 1);
}

/**
 * 乘法变加法的**残差**:`A(b·c) − (A(b) + A(c))`。
 * 这条链的第 6 步靠它 —— 残差应该是纯浮点噪声。
 */
export function multiplicativeDefect(b: number, c: number): number | null {
  const abc = areaUnderReciprocal(b * c);
  const ab = areaUnderReciprocal(b);
  const ac = areaUnderReciprocal(c);
  if (abc === null || ab === null || ac === null) return null;
  return abc - (ab + ac);
}

/**
 * 「横拉 b 倍、纵压 1/b 倍」这个映射本身。
 *
 * 它是整条链的支点:`1/x` 是唯一在这个变换下**回到自己**的幂函数。
 * 代换证明:`x = bu` ⇒ `∫_b^{bc} dx/x = ∫₁^c b·du/(bu) = ∫₁^c du/u`。
 */
export function stretchSquash(
  point: readonly [number, number],
  b: number,
): readonly [number, number] {
  return [point[0] * b, point[1] / b];
}

/** 把 `y = 1/x` 上的一点按 b 变换之后,是否仍落在曲线上 */
export function staysOnReciprocal(x: number, b: number, tol = 1e-12): boolean {
  const [x2, y2] = stretchSquash([x, 1 / x], b);
  return Math.abs(y2 - 1 / x2) <= tol;
}

/**
 * 满足 `A(t) = 1` 的那个 t —— 也就是 e。
 *
 * ⚠️ 用二分法从 `areaUnderReciprocal` 里**找**出来,不是写 `Math.E`。
 * 这条链的第 7 步要说的就是"底数不是选出来的,是被面积定出来的";
 * 直接引用常数就把这句话变成了空话。
 */
export function baseWhereAreaIsOne(tol = 1e-12, maxIterations = 200): number {
  let lo = 2;
  let hi = 3;
  for (let i = 0; i < maxIterations && hi - lo > tol; i++) {
    const mid = (lo + hi) / 2;
    const area = areaUnderReciprocal(mid);
    if (area === null) throw new Error(`areaUnderReciprocal(${mid}) is undefined`);
    if (area < 1) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** 第 2 步表格里的一行 */
export interface PowerRow {
  readonly n: number;
  /** `∫₁² xⁿ dx`,n = −1 时为 null */
  readonly value: number | null;
}

/** 第 2 步用的档位。刻意逼近 −1 但不落在上面,最后一档才是 −1。 */
export const POWER_STEPS: readonly number[] = [-0.5, -0.9, -0.99, -0.999, -0.9999, -1];

export function powerTable(b = 2): readonly PowerRow[] {
  return POWER_STEPS.map((n) => ({ n, value: powerAntiderivativeAt(n, b) }));
}
