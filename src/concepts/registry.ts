/**
 * 概念元数据登记表 —— 首页卡片与 "Recommended next" 的唯一数据源。
 *
 * ⚠️ 本文件**刻意不 import 任何 chain 或 Scene**。
 * 原因:首页只需要标题、步数、track 这些标量。以前 `CARDS` 里写
 * `LIMITS_CHAIN.stages.length`,看起来只是取一个数字,实际把七条链、
 * 它们的全部数学模块、以及 Three.js 一起拖进了首页 chunk。
 * 首屏因此要下 1.5 MB —— 一个只想看看这站长什么样的人,先被迫下载整个 3D 引擎。
 *
 * 代价是 `steps` 变成了手写常量,可能与真实链脱节。
 * 这个风险由 `registry.test.ts` 兜底:它会 import 真链并逐条断言步数一致。
 * 测试可以随便 import,反正不进打包。
 */

export type ConceptTrack = 'Foundations' | 'Integration' | '3D Volume' | 'Trigonometry';

export interface ConceptMeta {
  readonly id: string;
  readonly title: string;
  /** 卡片正面写学生会说出口的困惑,不是章节名 */
  readonly question: string;
  /** ⚠️ 手写常量,由 registry.test.ts 对着真链校验 */
  readonly steps: number;
  readonly ready: boolean;
  readonly track: ConceptTrack;
  /** 学完这条之后推荐去哪 —— 按依赖顺序,不是完成顺序 */
  readonly next: string;
}

export const CONCEPTS: readonly ConceptMeta[] = [
  {
    id: 'limits',
    title: 'Left and Right Limits',
    question: 'If the function has no value there, what is the limit even describing?',
    steps: 7,
    ready: true,
    track: 'Foundations',
    next: 'derivative',
  },
  {
    id: 'derivative',
    title: 'Secant → Tangent',
    question: 'What does it actually mean for two points to “become” one?',
    steps: 8,
    ready: true,
    track: 'Foundations',
    next: 'riemann-sum',
  },
  {
    id: 'riemann-sum',
    title: 'Riemann Sums → the Integral',
    question: 'Why does adding up rectangles turn into an integral sign?',
    steps: 8,
    ready: true,
    track: 'Integration',
    next: 'log-integral',
  },
  {
    id: 'log-integral',
    title: 'Why ∫dx/x Is a Logarithm',
    question: 'Every other power gives a power. Why does this one give a logarithm?',
    steps: 8,
    ready: true,
    track: 'Integration',
    next: 'shell-method',
  },
  {
    id: 'shell-method',
    title: 'The Shell Method',
    question: 'Why is there a 2πx in the integral? Where does that come from?',
    steps: 9,
    ready: true,
    track: '3D Volume',
    next: 'disk-method',
  },
  {
    id: 'disk-method',
    title: 'The Disk Method',
    question: 'How am I supposed to know which method to use?',
    steps: 8,
    ready: true,
    track: '3D Volume',
    next: 'unit-circle',
  },
  {
    id: 'unit-circle',
    title: 'The Unit Circle and sin / cos',
    question: 'Why does going around a circle produce a wave?',
    steps: 7,
    ready: true,
    track: 'Trigonometry',
    next: 'trig-rates',
  },
  {
    id: 'trig-rates',
    // 与 chain.ts 的 title 逐字一致 —— registry.test.ts 会盯着。
    // 首次写这份登记表时我照 README 抄了个简写标题,测试立刻抓到不一致。
    title: 'Why sin and cos Differentiate into Each Other',
    question: 'Why do sin and cos keep turning into each other?',
    steps: 8,
    ready: true,
    track: 'Trigonometry',
    next: 'limits',
  },
];

export function conceptById(id: string): ConceptMeta {
  const found = CONCEPTS.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown concept id: ${id}`);
  return found;
}

export function recommendedAfter(id: string): ConceptMeta {
  return conceptById(conceptById(id).next);
}
