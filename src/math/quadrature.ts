/**
 * MATH CORE — 数值积分
 *
 * 用途:当某条曲线没有闭式原函数时,提供"事实上的精确值"作为基准;
 *      同时用来【交叉验证】解析解 —— 两条独立路径算出同一个数,才算验证过。
 */

/** 复合 Simpson 法。n 必须为偶数(内部会自动向上取偶)。 */
export function simpson(g: (x: number) => number, a: number, b: number, n = 1000): number {
  const m = n % 2 === 0 ? n : n + 1;
  const h = (b - a) / m;
  let s = g(a) + g(b);
  for (let i = 1; i < m; i++) {
    s += g(a + i * h) * (i % 2 === 0 ? 2 : 4);
  }
  return (s * h) / 3;
}

/**
 * 自适应 Simpson 法。对本项目用到的所有光滑函数,精度可达 ~1e-12。
 * 递归到区间误差估计小于 tol 为止。
 */
export function adaptiveSimpson(
  g: (x: number) => number,
  a: number,
  b: number,
  tol = 1e-12,
  maxDepth = 50,
): number {
  const simp = (lo: number, hi: number, flo: number, fmid: number, fhi: number): number =>
    ((hi - lo) / 6) * (flo + 4 * fmid + fhi);

  const fa = g(a);
  const fb = g(b);
  const fm = g((a + b) / 2);
  const whole = simp(a, b, fa, fm, fb);

  const recurse = (
    lo: number,
    hi: number,
    flo: number,
    fmid: number,
    fhi: number,
    prev: number,
    eps: number,
    depth: number,
  ): number => {
    const mid = (lo + hi) / 2;
    const lmid = (lo + mid) / 2;
    const rmid = (mid + hi) / 2;
    const flm = g(lmid);
    const frm = g(rmid);
    const left = simp(lo, mid, flo, flm, fmid);
    const right = simp(mid, hi, fmid, frm, fhi);
    const delta = left + right - prev;
    if (depth <= 0 || Math.abs(delta) <= 15 * eps) return left + right + delta / 15;
    return (
      recurse(lo, mid, flo, flm, fmid, left, eps / 2, depth - 1) +
      recurse(mid, hi, fmid, frm, fhi, right, eps / 2, depth - 1)
    );
  };

  return recurse(a, b, fa, fm, fb, whole, tol, maxDepth);
}

/** 中心差分数值导数。仅用于测试里核对解析导数,不在产品路径上使用。 */
export function numericDerivative(g: (x: number) => number, x: number, h = 1e-5): number {
  return (g(x + h) - g(x - h)) / (2 * h);
}
