import { describe, expect, it } from 'vitest';
import type { Chain } from '../engine/types';
import { createReducedMotionChain } from './reducedMotionChain';

const CHAIN: Chain = {
  id: 'motion-test',
  title: 'Motion test',
  subtitle: 'Motion test',
  defaultParams: { progress: 0 },
  stages: [
    {
      id: 'move',
      label: '1',
      title: 'Move',
      narration: 'Move to the final state.',
      show: ['shape'],
      camera: 'front',
      params: { other: 3 },
      autoplay: { param: 'progress', from: 0, to: 1, delayMs: 400, durationMs: 900 },
    },
  ],
};

describe('createReducedMotionChain', () => {
  it('removes autoplay and supplies its final value when motion is reduced', () => {
    let reduced = false;
    const chain = createReducedMotionChain(CHAIN, () => reduced);
    const stage = chain.stages[0]!;

    expect(stage.autoplay).toBe(CHAIN.stages[0]!.autoplay);
    expect(stage.params).toEqual({ other: 3 });

    reduced = true;
    expect(stage.autoplay).toBeUndefined();
    expect(stage.params).toEqual({ other: 3, progress: 1 });
  });

  it('does not mutate the source chain', () => {
    createReducedMotionChain(CHAIN, () => true);
    expect(CHAIN.stages[0]!.autoplay?.from).toBe(0);
    expect(CHAIN.stages[0]!.params).toEqual({ other: 3 });
  });
});
