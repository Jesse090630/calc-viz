import { describe, expect, it } from 'vitest';
import { readPrefersReducedMotion, REDUCED_MOTION_QUERY } from './usePrefersReducedMotion';

describe('prefers-reduced-motion reader', () => {
  it('returns false when matchMedia is unavailable', () => {
    expect(readPrefersReducedMotion(undefined)).toBe(false);
  });

  it('uses the exact reduce media query and returns its match', () => {
    const seen: string[] = [];
    const matchMedia = (query: string) => {
      seen.push(query);
      return { matches: true };
    };
    expect(readPrefersReducedMotion(matchMedia)).toBe(true);
    expect(seen).toEqual([REDUCED_MOTION_QUERY]);
  });
});
