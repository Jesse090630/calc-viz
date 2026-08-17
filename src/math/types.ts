/**
 * MATH CORE — 类型定义
 *
 * ⚠️ 本目录(src/math/)下的所有文件禁止 import 任何渲染库(react / three / @react-three/*)。
 *    这条规则由 src/math/architecture.test.ts 自动检查,不是靠自觉。
 *    理由:数学正确性必须能用 `npm test` 单独验证,不能依赖"打开网页看一眼"。
 */

/** 闭区间 [a, b] */
export type Interval = readonly [number, number];

/** 黎曼和的取样规则。本项目默认一律用 'mid' —— 原因见 solids.ts 顶部注释。 */
export type RiemannRule = 'left' | 'right' | 'mid';

/**
 * 一条可视化用的曲线。
 *
 * v1 只使用精选曲线(手工写好解析导数与原函数,可 100% 验证)。
 * v2 若接入函数解析器,只需产出符合本接口的对象,上层无需改动 —— 这是预留的扩展点。
 */
export interface CurveSpec {
  /** 稳定 id,用于 chain 数据引用 */
  readonly id: string;
  /** 人类可读标签,如 "y = 4 − x²" */
  readonly label: string;
  /** KaTeX 源码,如 "f(x) = 4 - x^2" */
  readonly tex: string;

  /** 函数本身 */
  readonly f: (x: number) => number;
  /** 解析导数 f'(x) */
  readonly df: (x: number) => number;
  /** f 的一个原函数 F,满足 F' = f (常数项取 F(0)=0 或就近取值) */
  readonly F?: (x: number) => number;
  /** x·f(x) 的一个原函数,满足 (xF)' = x·f(x)。Shell Method 需要它求解析解。 */
  readonly xF?: (x: number) => number;
  /** f(x)² 的一个原函数,满足 (sqF)' = f(x)²。Disk / Washer Method 需要它。 */
  readonly sqF?: (x: number) => number;

  /** 本项目中使用该曲线的合法区间(必填,不允许省略) */
  readonly domain: Interval;
}

/** 单个壳的几何量。半径一律取该壳的【中点】。 */
export interface ShellSlice {
  /** 该壳的中点半径 */
  readonly x: number;
  /** 厚度 Δx */
  readonly dx: number;
  /** 高度 f(x) */
  readonly h: number;
}

/** 单个圆盘的几何量。同样一律取中点。 */
export interface DiskSlice {
  /** 沿旋转轴方向的中点坐标(绕 y 轴旋转时即 y) */
  readonly t: number;
  /** 厚度 Δt */
  readonly dt: number;
  /** 该处的半径 */
  readonly r: number;
}
