/**
 * ENGINE — 自动补间
 *
 * 把 Stage.autoplay 这份声明变成实际的逐帧动画。
 * 直接用 requestAnimationFrame 而不是引动画库 —— 需求只有"一个数从 A 到 B",不值得加依赖。
 */
import { useEffect } from 'react';
import type { Autoplay } from './types';

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

/**
 * @param autoplay  当前步的补间声明(没有就传 undefined)
 * @param setParam  写回参数的函数
 * @param stageKey  步号或 stage id;变化时重启补间
 */
export function useAutoplay(
  autoplay: Autoplay | undefined,
  setParam: (key: string, value: number) => void,
  stageKey: string | number,
): void {
  useEffect(() => {
    if (!autoplay) return;
    const { param, from, to, delayMs, durationMs } = autoplay;

    let raf = 0;
    const start = performance.now() + delayMs;

    const frame = (now: number) => {
      const t = (now - start) / durationMs;
      if (t < 0) {
        raf = requestAnimationFrame(frame); // 还在延迟里(留给相机)
        return;
      }
      const k = Math.min(1, t);
      setParam(param, from + (to - from) * easeOutCubic(k));
      if (k < 1) raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // stageKey 变化 = 换步了,重启补间
  }, [autoplay, setParam, stageKey]);
}
