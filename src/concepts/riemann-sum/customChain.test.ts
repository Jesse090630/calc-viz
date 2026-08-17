import { describe, expect, it } from 'vitest';
import { validateChain } from '../../engine/validate';
import { compileExpressionCurve } from '../../math/expression';
import { makeCustomRiemannChain } from './customChain';

describe('makeCustomRiemannChain', () => {
  it('生成的 8 步链通过全部数据约束', () => {
    const parsed = compileExpressionCurve({ expression: 'x^2', a: 0, b: 2 });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const chain = makeCustomRiemannChain(parsed.curve, parsed.integral);
    expect(chain.stages).toHaveLength(8);
    expect(validateChain(chain)).toEqual([]);
  });

  it('屏幕数字来自 math core：x²,[0,2] 时 M4=2.625000，积分=2.666667', () => {
    const parsed = compileExpressionCurve({ expression: 'x^2', a: 0, b: 2 });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const chain = makeCustomRiemannChain(parsed.curve, parsed.integral);
    const stage = chain.stages[3]!;
    const lines = (stage.formula ?? []).map((line) =>
      typeof line.tex === 'function' ? line.tex({ n: 4, morph: 0 }) : line.tex,
    );
    expect(lines[0]).toContain('2.625000');
    expect(lines[1]).toContain('2.666667');
  });

  it('n=1 大 Δx 边界仍使用中点法', () => {
    const parsed = compileExpressionCurve({ expression: 'x^2', a: 0, b: 2 });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const chain = makeCustomRiemannChain(parsed.curve, parsed.integral);
    const stage = chain.stages[4]!;
    const line = stage.formula?.[0]?.tex;
    expect(typeof line).toBe('function');
    if (typeof line === 'function') expect(line({ n: 1 })).toContain('2.000000');
  });
});
