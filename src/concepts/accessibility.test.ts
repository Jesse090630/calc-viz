import { describe, expect, it } from 'vitest';
import type { Chain } from '../engine/types';
import { DERIVATIVE_CHAIN } from './derivative/chain';
import { DISK_METHOD_CHAIN } from './disk-method/chain';
import { LIMITS_CHAIN } from './limits/chain';
import { RIEMANN_SUM_CHAIN } from './riemann-sum/chain';
import { SHELL_METHOD_CHAIN } from './shell-method/chain';
import { TRIG_RATES_CHAIN } from './trig-rates/chain';
import { UNIT_CIRCLE_CHAIN } from './unit-circle/chain';

const BUILT_IN_CHAINS: readonly Chain[] = [
  LIMITS_CHAIN,
  DERIVATIVE_CHAIN,
  RIEMANN_SUM_CHAIN,
  SHELL_METHOD_CHAIN,
  DISK_METHOD_CHAIN,
  UNIT_CIRCLE_CHAIN,
  TRIG_RATES_CHAIN,
];

describe('WebGL scene text equivalents', () => {
  it('covers all 55 built-in stages with a substantive one-sentence description', () => {
    const stages = BUILT_IN_CHAINS.flatMap((chain) => chain.stages);
    expect(stages).toHaveLength(55);

    for (const stage of stages) {
      expect(stage.altText, stage.id).toBeTypeOf('string');
      expect(stage.altText?.length, stage.id).toBeGreaterThan(55);
      expect(stage.altText, stage.id).toMatch(/\.$/);
    }
  });

  it('describes the visible scene rather than copying the narration', () => {
    for (const chain of BUILT_IN_CHAINS) {
      for (const stage of chain.stages) {
        expect(stage.altText, `${chain.id}/${stage.id}`).not.toBe(stage.narration);
      }
    }
  });
});
