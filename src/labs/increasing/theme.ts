/**
 * LAB — 「Every Pair Must Work」的微文案
 *
 * 配色与状态词汇是**全站实验台共用**的,在 `../shared/theme.ts`。
 * 这里只放这一节自己的句子;分散在组件里的话,语气会随着写的先后漂,
 * 而这一节的说服力全靠这些短句的节奏。
 */
export { LAB, STATE, type StateKey } from '../shared/theme';

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
