/**
 * LAB — 各节实验台共用的配色与状态词汇
 *
 * 配色继承全站语义(`src/scene/theme.ts`):当前主角 = 琥珀,本步新引入 = 青,结果 = 绿。
 * 映射到实验台里的角色:
 *   x₁ = 青(先出现的那个) · x₂ = 琥珀(主角,用户主要拖的) · 成立 = 绿 · 失败 = 红
 *
 * ⚠️ 无障碍:颜色**不是唯一信道**。每个状态同时带一个符号(✓ / ×)和一句文字。
 * 下面的 `STATE` 把三者绑在一起,组件不许只取颜色不取符号。
 */
import { COLOR } from '../../scene/theme';

export const LAB = {
  x1: COLOR.introduce, // #22d3ee 青
  x2: COLOR.hero, // #f59e0b 琥珀
  curve: COLOR.curve,
  pass: COLOR.result, // #22c55e 绿
  fail: COLOR.radius, // #ef4444 红
  axis: COLOR.axis,
  muted: COLOR.thickness,
  interval: '#1d4ed8',
} as const;

/** 判定状态。symbol 与 text 是给不靠颜色的人用的,不许省。 */
export const STATE = {
  pass: { color: LAB.pass, symbol: '✓', text: 'true' },
  fail: { color: LAB.fail, symbol: '×', text: 'false' },
  idle: { color: LAB.muted, symbol: '·', text: 'waiting' },
} as const;

export type StateKey = keyof typeof STATE;
