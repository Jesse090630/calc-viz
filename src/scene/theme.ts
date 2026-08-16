/**
 * 全站配色语义。颜色在这个项目里是**词汇**,不是装饰 ——
 * "红色 = 半径"必须在每一个概念里都成立,否则用户要重新学一遍看图。
 */
export const COLOR = {
  /** 半径 / x 方向的量 */
  radius: '#ef4444',
  /** 高度 / 函数值 */
  height: '#3b82f6',
  /** 厚度 / Δx */
  thickness: '#94a3b8',
  /** 当前主角对象 */
  hero: '#f59e0b',
  /** 本步新引入的量(如周长) */
  introduce: '#22d3ee',
  /** 结果 / 精确值 */
  result: '#22c55e',

  // ── 结构性颜色(不承载数学语义) ──
  axis: '#5b6c99',
  axisDepth: '#3d4d78',
  curve: '#38bdf8',
  region: '#2563eb',
  background: '#0b1020',
} as const;
