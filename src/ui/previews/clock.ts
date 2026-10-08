/**
 * 首页预览用的**单一** rAF 时钟。
 *
 * ⚠️ 四张卡各自开一个 requestAnimationFrame 循环是很容易顺手写出来的写法,
 * 但那意味着首页常驻四个循环、每帧四次 setState。这里只跑**一个**,
 * 时间值传给四个预览,各自根据 t 算自己的位置 —— 一个循环,一次渲染。
 *
 * 纯函数 + 一个 hook,不 import 任何绘图库。
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePrefersReducedMotion } from '../../accessibility/usePrefersReducedMotion';

/** 预览循环一圈的时长(毫秒)。慢一点,首页不该抢注意力。 */
export const LOOP_MS = 5200;

/* ══ 冻结开关 ═════════════════════════════════════════════════════
 *
 * ⭐⭐⭐ 这个开关是为了修一个真实故障:**首页上点 ∫ Formula deck,十秒打不开。**
 *
 *   `texCache.ts` 开头记过同一个病:弹窗第一次渲染要跑两百多次 KaTeX,
 *   那是一次**低优先级**的 Suspense 渲染;而首页的预览时钟每一帧都在
 *   `setPhase`,持续产生**高优先级**更新,React 于是把那次长渲染一次次从头重启。
 *   它不是崩了,是**被饿死了**。
 *
 * ⚠️ 当时的修法(把 TeX 预渲染搬到模块求值期)管用了一阵,
 *   但这一季首页从几张动画卡涨到了**九张**,rAF 的压力又把它压回去了。
 *   —— 治标的修法会随着内容增长失效,这次治根:**弹窗开着的时候,把时钟停掉。**
 *   首页的卡片在弹窗后面,本来也看不见;停掉它们没有任何损失。
 */
let frozen = false;
const listeners = new Set<() => void>();

/** 弹窗打开/关闭时调用。⚠️ 要在**渲染之前**调到,否则救不了这一次渲染。 */
export function setPreviewsFrozen(next: boolean): void {
  if (next === frozen) return;
  frozen = next;
  for (const fn of listeners) fn();
}

export function previewsFrozen(): boolean {
  return frozen;
}

function subscribeFrozen(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** 测试用:把开关恢复原状。 */
export function resetPreviewsFrozen(): void {
  frozen = false;
  listeners.clear();
}

/**
 * 返回 0 → 1 循环的相位。
 *
 * ⚠️ `prefers-reduced-motion` 时**完全不启动 rAF**,并固定返回一个
 * 有代表性的静止相位。不是"动得慢一点" —— 用户要的是不动。
 */
export function usePreviewClock(): { phase: number; animated: boolean } {
  const reduced = usePrefersReducedMotion();
  const halted = useSyncExternalStore(subscribeFrozen, previewsFrozen, () => false);
  const [phase, setPhase] = useState(STILL_PHASE);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    // ⚠️ 冻结时**一帧都不要调度**。只是"少调度几帧"是不够的 ——
    //   饿死那次长渲染只需要偶尔来一个高优先级更新。
    if (reduced || halted) {
      if (reduced) setPhase(STILL_PHASE);
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
  }, [reduced, halted]);

  return { phase, animated: !reduced && !halted };
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
