/**
 * LAB — 数学坐标 ↔ SVG 坐标
 *
 * 纯函数,不 import 任何东西。放在这里而不是 `src/math/` 是因为它讲的是**画面**,
 * 不是数学;但它必须可单测,所以也不放进组件。
 *
 * ⚠️ SVG 的 y 轴朝下,数学的 y 轴朝上。翻转只在这一个文件里发生。
 * 任何组件里再出现一次 `height - y` 都是重复实现,迟早两处不一致。
 */

export interface Viewport {
  /** SVG 画布尺寸 */
  readonly width: number;
  readonly height: number;
  /** 数学窗口 */
  readonly xMin: number;
  readonly xMax: number;
  readonly yMin: number;
  readonly yMax: number;
  /** 画布内边距,留给刻度标签 */
  readonly padLeft: number;
  readonly padRight: number;
  readonly padTop: number;
  readonly padBottom: number;
}

export const VIEWPORT: Viewport = {
  width: 640,
  height: 460,
  xMin: -2.6,
  xMax: 3.6,
  yMin: -1.1,
  yMax: 9.8,
  padLeft: 46,
  padRight: 22,
  padTop: 20,
  padBottom: 38,
};

export function plotWidth(v: Viewport): number {
  return v.width - v.padLeft - v.padRight;
}

export function plotHeight(v: Viewport): number {
  return v.height - v.padTop - v.padBottom;
}

/** 数学 x → SVG x */
export function toSvgX(v: Viewport, x: number): number {
  return v.padLeft + ((x - v.xMin) / (v.xMax - v.xMin)) * plotWidth(v);
}

/** 数学 y → SVG y(这里翻转) */
export function toSvgY(v: Viewport, y: number): number {
  return v.padTop + (1 - (y - v.yMin) / (v.yMax - v.yMin)) * plotHeight(v);
}

/** SVG x → 数学 x。拖拽时用,必须是 `toSvgX` 的严格逆。 */
export function fromSvgX(v: Viewport, px: number): number {
  return v.xMin + ((px - v.padLeft) / plotWidth(v)) * (v.xMax - v.xMin);
}

/** 一条折线的 SVG path。null 表示无定义 —— 在那里**断开**,不要连过去。 */
export function polylinePath(
  v: Viewport,
  points: readonly { x: number; y: number | null }[],
): string {
  let path = '';
  let penDown = false;
  for (const point of points) {
    if (point.y === null) {
      penDown = false;
      continue;
    }
    const px = toSvgX(v, point.x);
    const py = toSvgY(v, point.y);
    // 画到框外很远的地方会让浏览器算超长路径;裁掉但保持连续性
    if (py < v.padTop - plotHeight(v) || py > v.padTop + plotHeight(v) * 2) {
      penDown = false;
      continue;
    }
    path += `${penDown ? 'L' : 'M'}${px.toFixed(2)} ${py.toFixed(2)} `;
    penDown = true;
  }
  return path.trim();
}

/** 刻度位置:整数优先,避免出现 0.30000000000000004 这种标签 */
export function ticks(min: number, max: number, step = 1): readonly number[] {
  const out: number[] = [];
  const start = Math.ceil(min / step) * step;
  for (let t = start; t <= max + 1e-9; t += step) {
    out.push(Math.round(t / step) * step);
  }
  return out;
}
