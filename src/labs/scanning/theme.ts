/**
 * LAB — 「Scan the Curve」自己的配色与时钟。
 *
 * ⚠️ 走向的配色**不能沿用别处的"对 / 错"语义**:
 * 递减不是错误,它只是另一个方向。所以红色只留给 **mixed** ——
 * 那才是真正"这个问题现在没有答案"的状态。
 *   ↗ 递增 = 绿   ↘ 递减 = 琥珀   → 不变 = 青   ⚠ 混合 = 红
 */
import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../../accessibility/usePrefersReducedMotion';
import { LAB } from '../shared/theme';
import type { Reading } from '../../math/scanning';

export { LAB, STATE } from '../shared/theme';

export const BEHAVIOUR_COLOR: Readonly<Record<Reading, string>> = {
  up: LAB.pass,
  down: LAB.x2,
  flat: LAB.x1,
  mixed: LAB.fail,
};

/** 小圆点走完一趟的时长(毫秒)。两端各停一会儿,好让人看清起点和终点。 */
export const SWEEP_MS = 2600;
const HOLD = 0.16;

/**
 * 0 → 1 的行进相位。
 *
 * ⚠️ `prefers-reduced-motion` 时**完全不启动 rAF**,并停在起点 ——
 * 不是"动得慢一点",用户要的是不动。
 * 停在起点而不是中点:静止时那个点应该待在"从左往右"的**左边**,
 * 这一节讲的就是从左读到右。
 */
export function useSweep(): { t: number; animated: boolean } {
  const reduced = usePrefersReducedMotion();
  const [t, setT] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (reduced) {
      setT(0);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const p = ((now - start) % SWEEP_MS) / SWEEP_MS;
      // 两端各停 HOLD,中间匀速走完
      const moving = (p - HOLD) / (1 - HOLD * 2);
      setT(Math.min(1, Math.max(0, moving)));
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [reduced]);

  return { t, animated: !reduced };
}
