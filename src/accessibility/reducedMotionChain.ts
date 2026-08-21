import type { Chain, Stage } from '../engine/types';
import { readPrefersReducedMotion } from './usePrefersReducedMotion';

/**
 * Presents autoplay stages as already complete when reduced motion is active.
 * The engine receives no autoplay declaration, so it schedules no tween.
 */
export function createReducedMotionChain(
  chain: Chain,
  isReducedMotion: () => boolean = readPrefersReducedMotion,
): Chain {
  return {
    ...chain,
    stages: chain.stages.map((stage): Stage => {
      const autoplay = stage.autoplay;
      if (!autoplay) return stage;
      return new Proxy(stage, {
        get(target, property, receiver) {
          if (property === 'autoplay' && isReducedMotion()) return undefined;
          if (property === 'params' && isReducedMotion()) {
            return { ...stage.params, [autoplay.param]: autoplay.to };
          }
          return Reflect.get(target, property, receiver);
        },
      });
    }),
  };
}
