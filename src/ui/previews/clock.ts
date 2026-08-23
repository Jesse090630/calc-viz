/**
 * 首页预览用的**单一** rAF 时钟。
 *
 * ⚠️ 四张卡各自开一个 requestAnimationFrame 循环是很容易顺手写出来的写法,
 * 但那意味着首页常驻四个循环、每帧四次 setState。这里只跑**一个**,
 * 时间值传给四个预览,各自根据 t 算自己的位置 —— 一个循环,一次渲染。
 *
 * 纯函数 + 一个 hook,不 import 任何绘图库。
 */
import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../../accessibility/usePrefersReducedMotion';

/** 预览循环一圈的时长(毫秒)。慢一点,首页不该抢注意力。 */
export const LOOP_MS = 5200;

/**
 * 返回 0 → 1 循环的相位。
 *
 * ⚠️ `prefers-reduced-motion` 时**完全不启动 rAF**,并固定返回一个
 * 有代表性的静止相位。不是"动得慢一点" —— 用户要的是不动。
 */
export function usePreviewClock(): { phase: number; animated: boolean } {
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState(STILL_PHASE);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (reduced) {
      setPhase(STILL_PHASE);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      setPhase(((now - start) % LOOP_MS) / LOOP_MS);
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [reduced]);

  return { phase, animated: !reduced };
}

/** 静止时停在哪一相位 —— 挑一个四张卡都好看的位置 */
export const STILL_PHASE = 0.28;

/** 三角波:0 → 1 → 0,用来做"来回"运动,端点处不跳变。 */
export function pingPong(phase: number): number {
  const t = phase % 1;
  return t < 0.5 ? t * 2 : 2 - t * 2;
}

/** 平滑一点的缓动,避免线性运动看起来死板 */
export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * 带**停顿**的往返:在两端各停留一会儿。
 * 周期性那张卡需要它 —— 副本滑到位之后要停住让人看清"对齐了"。
 */
export function holdAtEnds(phase: number, holdFraction = 0.3): number {
  const t = phase % 1;
  const move = (1 - holdFraction * 2) / 2;
  if (t < move) return easeInOut(t / move);
  if (t < move + holdFraction) return 1;
  if (t < move * 2 + holdFraction) return 1 - easeInOut((t - move - holdFraction) / move);
  return 0;
}
