/**
 * MATH CORE — 差商、割线与切线
 *
 * ⚠️ 本文件的存在理由是那个**恒等式**:对 f(x)=x²、定点 a=1,
 *      m(h) = ((1+h)² − 1)/h = (2h + h²)/h = 2 + h        (h ≠ 0)
 * 割线斜率**就是** 2 + h。拖 h 时公式里的 "+h" 与屏幕上的数字同步缩小,
 * 极限过程因此不再抽象。这是 derivative 链选这个例子的全部理由。
 *
 * h = 0 是 0/0,必须**抛错**而不是返回 NaN —— NaN 会一路灌进场景变成看不见的错。
 */
import type { CurveSpec } from './types';

/** 差商允许的最小 |h|。滑块拖到 0 附近时用 clampH 推开,避免 0/0。 */
export const MIN_H = 0.02;

/**
 * 把 h 推离 0,保号。h = 0 时取 +MIN_H(正方向是默认的"从右边逼近")。
 * 放在 math 层而不是组件里:这是差商定义域的事实,不是 UI 细节。
 */
export function clampH(h: number): number {
  if (!Number.isFinite(h)) return MIN_H;
  if (Math.abs(h) >= MIN_H) return h;
  return h < 0 ? -MIN_H : MIN_H;
}

/** 割线斜率 (f(a+h) − f(a)) / h。h = 0 抛错。 */
export function secantSlope(curve: CurveSpec, a: number, h: number): number {
  if (h === 0) throw new Error('secantSlope: h must not be 0 (that is 0/0, not a slope)');
  if (!Number.isFinite(h)) throw new Error(`secantSlope: h must be finite, got ${h}`);
  return (curve.f(a + h) - curve.f(a)) / h;
}

export interface SecantData {
  /** 定点 P */
  readonly p: readonly [number, number];
  /** 动点 Q */
  readonly q: readonly [number, number];
  /** 水平位移 Δx = h */
  readonly dx: number;
  /** 竖直位移 Δy = f(a+h) − f(a) */
  readonly dy: number;
  readonly slope: number;
}

/** 割线的完整几何数据,供场景直接使用(组件里不许再算)。 */
export function secant(curve: CurveSpec, a: number, h: number): SecantData {
  const slope = secantSlope(curve, a, h); // h=0 会在这里抛
  const y1 = curve.f(a);
  const y2 = curve.f(a + h);
  return { p: [a, y1], q: [a + h, y2], dx: h, dy: y2 - y1, slope };
}

/** 切线:斜率取解析导数,不用差商近似。 */
export function tangent(curve: CurveSpec, a: number): SecantData & { readonly slope: number } {
  const y = curve.f(a);
  return { p: [a, y], q: [a, y], dx: 0, dy: 0, slope: curve.df(a) };
}

/** 过 (x0,y0) 斜率 m 的直线在 x 处的取值。画线用。 */
export const lineY = (x0: number, y0: number, m: number, x: number): number => y0 + m * (x - x0);
