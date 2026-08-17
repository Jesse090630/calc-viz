import { describe, expect, it, vi } from 'vitest';
import {
  INPUT_DEBOUNCE_MS,
  compileExpression,
  compileExpressionCurve,
  createDebouncedTask,
  fitCurveForDisplay,
  sampleExpressionSegments,
} from './expression';
import { numericDerivative } from './quadrature';

describe('compileExpression', () => {
  it('mathjs 编译 f 与解析导数，两条独立路径在手算点上一致', () => {
    const result = compileExpression('4 - x^2');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.f(0)).toBe(4);
    expect(result.value.f(2)).toBe(0);
    expect(result.value.df(1.25)).toBeCloseTo(-2.5, 12);
    expect(result.value.df(1.25)).toBeCloseTo(
      numericDerivative((x) => 4 - x * x, 1.25),
      8,
    );
  });

  it('解析失败给友好错误，不返回 NaN', () => {
    const result = compileExpression('4 - * x');
    expect(result).toMatchObject({ ok: false, error: { code: 'parse' } });
    if (!result.ok) expect(result.error.message).toMatch(/check the expression/i);
  });

  it('拒绝 x 之外的自由变量和赋值语法', () => {
    expect(compileExpression('x + y')).toMatchObject({
      ok: false,
      error: { code: 'unsupported' },
    });
    expect(compileExpression('x = 2')).toMatchObject({
      ok: false,
      error: { code: 'unsupported' },
    });
  });
});

describe('compileExpressionCurve', () => {
  it('手算:4−x² 在 [0,2] 的值域为 [0,4]，数值积分为 16/3', () => {
    const result = compileExpressionCurve({ expression: '4 - x^2', a: 0, b: 2 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.range.min).toBeCloseTo(0, 12);
    expect(result.range.max).toBeCloseTo(4, 12);
    expect(result.integral).toBeCloseTo(16 / 3, 10);
    expect(result.curve.F).toBeUndefined();
    expect(result.curve.xF).toBeUndefined();
    expect(result.curve.sqF).toBeUndefined();
  });

  it('定义域外返回 domain 错误；独立采样会跳过并断开曲线', () => {
    const compiled = compileExpression('sqrt(x)');
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) return;
    expect(compiled.value.f(-0.25)).toBeNull();
    expect(compileExpressionCurve({ expression: 'sqrt(x)', a: -1, b: 1 })).toMatchObject({
      ok: false,
      error: { code: 'domain' },
    });

    const segments = sampleExpressionSegments(compiled.value.f, [-1, 1], 8);
    expect(segments).toHaveLength(1);
    expect(segments[0]?.[0]?.x).toBe(0);
    expect(segments[0]?.at(-1)?.x).toBe(1);
  });

  it('区间内部奇点会把曲线断成两段，绝不跨过奇点连线', () => {
    const compiled = compileExpression('1/x');
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) return;
    const segments = sampleExpressionSegments(compiled.value.f, [-1, 1], 8);
    expect(segments).toHaveLength(2);
    expect(segments[0]?.at(-1)?.x).toBe(-0.25);
    expect(segments[1]?.[0]?.x).toBe(0.25);
  });

  it('区间内负值明确拒绝，避免把有向面积画成普通面积', () => {
    expect(compileExpressionCurve({ expression: 'x - 1', a: 0, b: 2 })).toMatchObject({
      ok: false,
      error: { code: 'negative' },
    });
  });

  it('端点奇点 1/x 在 [0,1] 明确拒绝并解释可能发散', () => {
    const result = compileExpressionCurve({ expression: '1/x', a: 0, b: 1 });
    expect(result).toMatchObject({ ok: false, error: { code: 'divergent' } });
    if (!result.ok) expect(result.error.message).toMatch(/endpoint|diverge/i);
  });

  it('a ≥ b 明确拒绝', () => {
    for (const [a, b] of [[2, 2], [3, -1]] as const) {
      expect(compileExpressionCurve({ expression: 'x^2', a, b })).toMatchObject({
        ok: false,
        error: { code: 'interval' },
      });
    }
  });

  it('极端值保留真实数学结果，同时标记可视化需要裁切', () => {
    const result = compileExpressionCurve({ expression: '1000*x', a: 0, b: 1 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.integral).toBeCloseTo(500, 10);
    expect(result.range.max).toBeCloseTo(1000, 10);
    expect(result.range.clamped).toBe(true);
    expect(result.range.displayMax).toBe(8);
  });
});

describe('createDebouncedTask', () => {
  it('连续输入只执行最后一次编译', () => {
    vi.useFakeTimers();
    const calls: string[] = [];
    const task = createDebouncedTask((value: string) => calls.push(value), INPUT_DEBOUNCE_MS);

    task.schedule('x');
    vi.advanceTimersByTime(INPUT_DEBOUNCE_MS - 1);
    task.schedule('x^');
    task.schedule('x^2');
    vi.advanceTimersByTime(INPUT_DEBOUNCE_MS);

    expect(calls).toEqual(['x^2']);
    task.cancel();
    vi.useRealTimers();
  });
});

describe('fitCurveForDisplay', () => {
  it('把任意 x 区间映到 [0,2]，极端 y 值裁到 8 后再缩进 4 单位高视口', () => {
    const result = compileExpressionCurve({ expression: '1000*x', a: 0, b: 1 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const fitted = fitCurveForDisplay(result.curve, result.range);

    expect(fitted.interval).toEqual([0, 2]);
    expect(fitted.curve.f(0)).toBe(0);
    expect(fitted.curve.f(1)).toBe(4);
    expect(fitted.curve.f(2)).toBe(4);
    expect(fitted.yScale).toBe(2);
  });

  it('普通 4−x² 曲线不缩放 y，端点形状保持不变', () => {
    const result = compileExpressionCurve({ expression: '4-x^2', a: 0, b: 2 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const fitted = fitCurveForDisplay(result.curve, result.range);
    expect(fitted.curve.f(0)).toBeCloseTo(4, 12);
    expect(fitted.curve.f(2)).toBeCloseTo(0, 12);
    expect(fitted.yScale).toBe(1);
  });
});
