import { describe, expect, it } from 'vitest';
import { validateChain } from '../../engine/validate';
import { compileExpressionCurve } from '../../math/expression';
import { makeCustomDiskChain } from './customChain';

describe('makeCustomDiskChain', () => {
  it('r=2−x,[0,2] 生成 8 步合法链，手算体积 8π/3', () => {
    const parsed = compileExpressionCurve({ expression: '2-x', a: 0, b: 2 });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const chain = makeCustomDiskChain(parsed.curve);
    expect(chain.stages).toHaveLength(8);
    expect(validateChain(chain)).toEqual([]);
    const text = chain.stages.flatMap((stage) => stage.formula ?? []).map((line) =>
      typeof line.tex === 'function' ? line.tex({ ...chain.defaultParams, n: 4 }) : line.tex,
    ).join(' ');
    expect(text).toContain((8 * Math.PI / 3).toFixed(6));
    expect(text).toContain('8.246681');
  });
});
