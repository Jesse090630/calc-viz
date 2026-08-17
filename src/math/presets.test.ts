import { describe, expect, it } from 'vitest';
import { compileExpressionCurve } from './expression';
import { EXPRESSION_PRESETS } from './presets';
import { diskVolumeExact, shellVolumeExact } from './solids';

const EXPECTED: Readonly<Record<string, number>> = {
  'riemann-cap': 16 / 3,
  'riemann-rise': 8 / 3,
  'riemann-sine': 2,
  'riemann-root': 16 / 3,
  'shell-cap': 8 * Math.PI,
  'shell-cone': (8 * Math.PI) / 3,
  'shell-cylinder': 8 * Math.PI,
  'disk-bowl': 8 * Math.PI,
  'disk-cone': (8 * Math.PI) / 3,
  'disk-cylinder': 12 * Math.PI,
};

describe('EXPRESSION_PRESETS', () => {
  it('所有 id 唯一且每种方法至少有三个入口', () => {
    const all = Object.values(EXPRESSION_PRESETS).flat();
    expect(new Set(all.map((preset) => preset.id)).size).toBe(all.length);
    for (const presets of Object.values(EXPRESSION_PRESETS)) expect(presets.length).toBeGreaterThanOrEqual(3);
  });

  it('每个预设都能通过对应边界校验，且数值路径与手算值一致', () => {
    for (const [method, presets] of Object.entries(EXPRESSION_PRESETS)) {
      for (const preset of presets) {
        const parsed = compileExpressionCurve(
          preset,
          method === 'shell' ? { requireNonNegativeDomain: true } : {},
        );
        expect(parsed.ok, preset.id).toBe(true);
        if (!parsed.ok) continue;
        const actual = method === 'shell'
          ? shellVolumeExact(parsed.curve)
          : method === 'disk'
            ? diskVolumeExact(parsed.curve)
            : parsed.integral;
        expect(actual, preset.id).toBeCloseTo(EXPECTED[preset.id]!, 9);
      }
    }
  });
});
