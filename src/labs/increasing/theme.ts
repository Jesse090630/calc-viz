/**
 * LAB — 这一节的配色与文案
 *
 * 配色继承全站语义(`src/scene/theme.ts`):当前主角 = 琥珀,本步新引入 = 青,结果 = 绿。
 * 这里把它们映射到本节的角色上:
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

/**
 * 全部微文案集中在这里。
 * 分散在组件里的话,语气会随着写的先后漂,而这一节的说服力全靠这些短句的节奏。
 */
export const COPY = {
  title: 'Every Pair Must Work',
  subtitle: 'What does “increasing” actually mean?',
  pickTwo: 'Pick two inputs.',
  keepOrder: 'Keep x₁ < x₂.',
  nowCompare: 'Now compare their outputs.',
  pairWorks: 'This pair works.',
  pairFails: 'This pair breaks the rule.',
  largerLarger: 'The larger input produced the larger output.',
  notEnoughOne: 'One pair is not enough.',
  notEnoughTen: 'Ten pairs are not enough.',
  everyPair: 'The definition says EVERY pair.',
  forAll:
    'No matter which two inputs you choose in the interval, putting the larger input second must also produce the larger output.',
  sweepDone: 'On I = [0, 3], the ordering was preserved every time we looked.',
  stillNotProof:
    'Still not a proof. We checked a lot of pairs; the definition covers all of them, and there are infinitely many.',
  breakIt: 'Same function. Different interval.',
  findCounter: 'Find x₁ < x₂ where the outputs do NOT satisfy f(x₁) < f(x₂).',
  counterFound: 'Counterexample found.',
  oneIsEnough: 'One failed pair is enough.',
  asymmetry:
    'To disprove a statement about every pair, you only need one pair that breaks it. That asymmetry is why counterexamples are so powerful.',
  onAnInterval: 'A function does not have to behave the same way everywhere.',
} as const;
