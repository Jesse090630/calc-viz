/**
 * MATH CORE — 基础几何量
 *
 * 看起来微不足道,但必须放在这里:CLAUDE.md 禁止 2 规定组件和 chain 数据里
 * 不许出现裸算式。`2 * Math.PI * r` 写在别处就是违规。
 * 而且这个量在 Shell Method 里是主角("那个 2πx 就是圆周长"),更该有名字。
 */

/** 半径为 r 的圆的周长 */
export const circumference = (radius: number): number => 2 * Math.PI * radius;

/** 半径为 r 的圆的面积 */
export const circleArea = (radius: number): number => Math.PI * radius * radius;
