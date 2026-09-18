/**
 * 坐标轴刻度。
 *
 * ⚠️⚠️ 起因是个真缺陷:欧拉法那一课里 `y′ = −20(y − 1)` 的横轴是 `[0, 0.4]`,
 *   而原来的刻度函数只吐**整数** —— 那一段里一个非零整数都没有,
 *   于是那张图的横轴上一个数字也没有。步长 h 和横轴跨度的关系是那一屏的全部内容,
 *   而读者根本无从判断横轴有多长。
 *
 * ⚠️ 第二版把步距按"跨度 ÷ 想要的个数,再向上取到 1/2/5"来定,还是不行:
 *   `[0, 1.4]` 上它取到 0.5,去掉 0 之后只剩两个数字。
 *   **向上取整会系统性地把刻度取少。** 所以现在改成:
 *   把 1/2/5 × 10^k 都试一遍,**按真实吐出来的个数**挑最接近目标的那个。
 */

/** 候选步距:`1 / 2 / 5` 乘十的幂,覆盖这个跨度上下各两个数量级。 */
export function candidateSteps(span: number): number[] {
  if (!(span > 0) || !Number.isFinite(span)) return [1];
  const k = Math.floor(Math.log10(span));
  const out: number[] = [];
  for (let e = k - 2; e <= k + 1; e += 1) {
    for (const m of [1, 2, 5]) out.push(m * 10 ** e);
  }
  return out;
}

function countIn(lo: number, hi: number, step: number, skipZero: boolean): number {
  const start = Math.ceil(lo / step);
  const end = Math.floor(hi / step);
  let n = end - start + 1;
  if (skipZero && start <= 0 && end >= 0) n -= 1;
  return Math.max(0, n);
}

/**
 * `[lo, hi]` 里的刻度值。
 * `skipZero` 给横轴用 —— 那里 0 处就是纵轴本身,再标一个只会打架。
 */
export function niceTicks(lo: number, hi: number, skipZero = false, want = 6): number[] {
  const span = hi - lo;
  if (!(span > 0) || !Number.isFinite(span)) return [];
  // ⭐ 按实际个数挑,不按公式算。个数一样时取**大**的那个步距(数字更少更干净)。
  let best = 1;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const s of candidateSteps(span)) {
    const score = Math.abs(countIn(lo, hi, s, skipZero) - want);
    if (score < bestScore || (score === bestScore && s > best)) {
      best = s;
      bestScore = score;
    }
  }
  const out: number[] = [];
  for (let i = Math.ceil(lo / best); i <= Math.floor(hi / best); i += 1) {
    // ⚠️ 用 `i * best` 而不是反复累加:0.1 累加十次不是 1。
    const v = i * best;
    if (v === 0 && skipZero) continue;
    // 浮点毛刺(0.30000000000000004)会原样显示出来,清掉。
    out.push(Number(v.toFixed(10)));
  }
  return out;
}
