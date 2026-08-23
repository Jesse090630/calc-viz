/**
 * LAB — 拖动时维持 x₁ < x₂
 *
 * 单独成文件是因为它**必须可单测**。这段逻辑写在组件里的第一版有个真 bug,
 * 只有真的用鼠标把手柄拖到区间尽头才会撞上:
 *
 *   x₁ 被拖到右端点 → 推着 x₂ 也到右端点 → 两者相等 →
 *   `orderPair` 判定"相等不是合法的一对"返回 null →
 *   上层回退到区间两端 → **屏幕上的两个点当场跳到 [0,3] 两头**。
 *
 * 用户看到的是:我明明在往右拖,点却瞬移到了最左边。
 * 而这一节从头到尾在讲的就是"保持 x₁ < x₂",在这里让顺序悄悄崩掉最糟糕。
 *
 * 修法不是在回退分支里打补丁,而是**让相等这件事根本不可能发生**:
 * 两点之间永远留一条最小缝隙,被推的那个先到边界,推的那个就停在缝隙外。
 */
import type { Interval } from '../../math/monotonicity';

/** 两点之间的最小间隔。够小不碍事,够大到屏幕上还看得出是两个点。 */
export const MIN_GAP = 0.05;

export interface PairState {
  readonly x1: number;
  readonly x2: number;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

/** 区间窄到放不下一条缝隙 —— 唯一还算合理的答案就是两个端点。 */
function tooNarrow(interval: Interval): boolean {
  return interval.b - interval.a < MIN_GAP;
}

/** 移动 x₁。必要时把 x₂ 顶开,但绝不让它们相等或交叉。 */
export function moveX1(current: PairState, next: number, interval: Interval): PairState {
  if (!Number.isFinite(next)) return current;
  if (tooNarrow(interval)) return { x1: interval.a, x2: interval.b };
  // x₁ 最远只能到"右端点再往左一条缝隙"—— 否则 x₂ 无处可去。
  // ⚠️ 有了这一步,`x1 + MIN_GAP ≤ interval.b` 是**恒真**的,
  //    所以下面不需要再对 x₂ 做一次区间裁剪。
  //    (原来那里确实写了一次,变异测试证明它永远不会触发 —— 测不到的防御代码
  //     只会让人以为保证来自那里,其实来自上面这行。删掉比留着诚实。)
  const x1 = clamp(next, interval.a, interval.b - MIN_GAP);
  const x2 = current.x2 >= x1 + MIN_GAP ? current.x2 : x1 + MIN_GAP;
  return { x1, x2 };
}

/** 移动 x₂。对称。 */
export function moveX2(current: PairState, next: number, interval: Interval): PairState {
  if (!Number.isFinite(next)) return current;
  if (tooNarrow(interval)) return { x1: interval.a, x2: interval.b };
  const x2 = clamp(next, interval.a + MIN_GAP, interval.b);
  const x1 = current.x1 <= x2 - MIN_GAP ? current.x1 : x2 - MIN_GAP;
  return { x1, x2 };
}

/** 换区间时把这一对搬进新区间,顺序照样保住。 */
export function fitToInterval(current: PairState, interval: Interval): PairState {
  const span = interval.b - interval.a;
  if (span <= MIN_GAP) return { x1: interval.a, x2: interval.b };
  const x1 = clamp(current.x1, interval.a, interval.b - MIN_GAP);
  const x2 = clamp(Math.max(current.x2, x1 + MIN_GAP), interval.a + MIN_GAP, interval.b);
  return x2 - x1 >= MIN_GAP ? { x1, x2 } : { x1: clamp(x2 - MIN_GAP, interval.a, interval.b), x2 };
}
