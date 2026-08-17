/**
 * MATH CORE — 用户表达式编译与可视化前验证。
 *
 * 解析和求导只交给 mathjs；本文件负责把它的宽泛返回值收窄成项目可用的
 * number | null，并在任何数据进入场景之前处理区间、定义域和显示范围。
 */
import { derivative, parse, type MathNode } from 'mathjs';
import { adaptiveSimpson } from './quadrature';
import type { CurveSpec, Interval } from './types';

export const INPUT_DEBOUNCE_MS = 350;
export const DISPLAY_VALUE_LIMIT = 8;

const ALLOWED_SYMBOLS = new Set([
  'x', 'e', 'pi',
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'sqrt', 'abs', 'exp', 'log', 'ln',
  'sinh', 'cosh', 'tanh', 'floor', 'ceil', 'round',
]);
const ALLOWED_NODE_TYPES = new Set([
  'OperatorNode', 'ConstantNode', 'SymbolNode', 'FunctionNode', 'ParenthesisNode',
]);

export type ExpressionErrorCode =
  | 'parse'
  | 'unsupported'
  | 'interval'
  | 'domain'
  | 'negative'
  | 'divergent';

export interface ExpressionError {
  readonly code: ExpressionErrorCode;
  readonly message: string;
}

type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ExpressionError };

export interface CompiledExpression {
  readonly expression: string;
  readonly tex: string;
  /** 无定义或非实数时返回 null，绝不返回 NaN。 */
  readonly f: (x: number) => number | null;
  readonly df: (x: number) => number | null;
}

export interface ExpressionCurveInput {
  readonly expression: string;
  readonly a: number;
  readonly b: number;
}

export interface ExpressionRange {
  readonly min: number;
  readonly max: number;
  readonly displayMax: number;
  readonly clamped: boolean;
}

export type ExpressionCurveResult =
  | {
      readonly ok: true;
      readonly curve: CurveSpec;
      readonly interval: Interval;
      readonly integral: number;
      readonly range: ExpressionRange;
    }
  | { readonly ok: false; readonly error: ExpressionError };

function error(code: ExpressionErrorCode, message: string): { ok: false; error: ExpressionError } {
  return { ok: false, error: { code, message } };
}

function realNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function assertSupported(node: MathNode): void {
  node.traverse((child) => {
    if (!ALLOWED_NODE_TYPES.has(child.type)) {
      throw new Error(`Unsupported syntax: ${child.type}`);
    }
    if (child.type === 'SymbolNode') {
      const name = (child as MathNode & { name: string }).name;
      if (!ALLOWED_SYMBOLS.has(name)) throw new Error(`Unsupported symbol: ${name}`);
    }
  });
}

/** 编译表达式与解析导数。mathjs 的异常统一转换成可展示结果。 */
export function compileExpression(expression: string): Result<CompiledExpression> {
  const source = expression.trim();
  if (!source) return error('parse', 'Enter an expression in x, such as 4 - x^2.');

  let node: MathNode;
  try {
    node = parse(source);
  } catch {
    return error('parse', 'Check the expression syntax and try again.');
  }

  try {
    assertSupported(node);
  } catch {
    return error('unsupported', 'Use x, numbers, arithmetic, and standard functions such as sin or sqrt.');
  }

  try {
    const compiled = node.compile();
    const derivativeNode = derivative(node, 'x');
    assertSupported(derivativeNode);
    const compiledDerivative = derivativeNode.compile();
    return {
      ok: true,
      value: {
        expression: source,
        tex: node.toTex(),
        f: (x) => {
          try {
            return realNumber(compiled.evaluate({ x }));
          } catch {
            return null;
          }
        },
        df: (x) => {
          try {
            return realNumber(compiledDerivative.evaluate({ x }));
          } catch {
            return null;
          }
        },
      },
    };
  } catch {
    return error('unsupported', 'This expression cannot be differentiated safely yet.');
  }
}

export interface SamplePoint {
  readonly x: number;
  readonly y: number;
}

/**
 * 把连续的有限采样组成线段。null 会结束当前线段，因此不会把奇点两侧硬连起来。
 */
export function sampleExpressionSegments(
  evaluate: (x: number) => number | null,
  [a, b]: Interval,
  samples = 240,
): SamplePoint[][] {
  if (!Number.isInteger(samples) || samples < 1) throw new Error('samples must be a positive integer');
  const segments: SamplePoint[][] = [];
  let current: SamplePoint[] = [];
  for (let i = 0; i <= samples; i++) {
    const x = a + ((b - a) * i) / samples;
    const y = evaluate(x);
    if (y === null) {
      if (current.length > 0) segments.push(current);
      current = [];
    } else {
      current.push({ x, y });
    }
  }
  if (current.length > 0) segments.push(current);
  return segments;
}

/** 编译并验证一条可用于面积/旋转体场景的非负实函数。 */
export function compileExpressionCurve(input: ExpressionCurveInput): ExpressionCurveResult {
  const { expression, a, b } = input;
  if (!Number.isFinite(a) || !Number.isFinite(b) || a >= b) {
    return error('interval', 'The interval must use finite numbers with a < b.');
  }

  const compiled = compileExpression(expression);
  if (!compiled.ok) return compiled;

  const interval: Interval = [a, b];
  const points = Array.from({ length: 513 }, (_, i) => {
    const x = a + ((b - a) * i) / 512;
    return { x, y: compiled.value.f(x) };
  });
  const invalid = points.filter((point) => point.y === null);
  if (invalid.length > 0) {
    const interiorInvalid = invalid.some((point) => point.x !== a && point.x !== b);
    if (interiorInvalid || invalid.length > 2) {
      return error('domain', 'The function is not real and defined throughout this interval.');
    }
    return error(
      'divergent',
      'The function is undefined at an endpoint, so this integral may diverge; choose a finite interval.',
    );
  }

  const values = points.map((point) => point.y as number);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min < -1e-10) {
    return error(
      'negative',
      'This derivation treats the integral as ordinary area, so use a function that stays at or above zero.',
    );
  }

  const strictF = (x: number): number => {
    const value = compiled.value.f(x);
    if (value === null) throw new Error(`Function is undefined at x=${x}`);
    return value;
  };
  const strictDf = (x: number): number => {
    const value = compiled.value.df(x);
    if (value === null) throw new Error(`Derivative is undefined at x=${x}`);
    return value;
  };

  let integral: number;
  try {
    integral = adaptiveSimpson(strictF, a, b);
  } catch {
    return error('divergent', 'The numerical integral did not converge on this interval.');
  }
  if (!Number.isFinite(integral)) {
    return error('divergent', 'The numerical integral did not converge on this interval.');
  }

  const clamped = max > DISPLAY_VALUE_LIMIT;
  const curve: CurveSpec = {
    id: `user-${sourceId(compiled.value.expression)}-${a}-${b}`,
    label: `y = ${compiled.value.expression}`,
    tex: `f(x) = ${compiled.value.tex}`,
    f: strictF,
    df: strictDf,
    domain: interval,
  };

  return {
    ok: true,
    curve,
    interval,
    integral,
    range: {
      min,
      max,
      displayMax: clamped ? DISPLAY_VALUE_LIMIT : Math.max(1, max),
      clamped,
    },
  };
}

function sourceId(source: string): string {
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export interface DebouncedTask<T> {
  schedule(value: T): void;
  cancel(): void;
}

export interface ViewportCurve {
  readonly curve: CurveSpec;
  readonly interval: Interval;
  readonly yScale: number;
}

/**
 * 在不改相机预设的前提下，把任意输入区间放进固定 2D 视口。
 * x 轴只做仿射映射；y 超过安全上限时先裁切，再等比缩放到 4 个世界单位。
 * 真实计算仍全部使用原 curve，这个返回值只给场景绘制。
 */
export function fitCurveForDisplay(curve: CurveSpec, range: ExpressionRange): ViewportCurve {
  const [a, b] = curve.domain;
  const interval: Interval = [0, 2];
  const yScale = Math.max(1, range.displayMax / 4);
  const sourceX = (displayX: number): number => a + (displayX / 2) * (b - a);
  const displayY = (value: number): number => Math.min(DISPLAY_VALUE_LIMIT, value) / yScale;

  return {
    interval,
    yScale,
    curve: {
      id: `${curve.id}-viewport`,
      label: curve.label,
      tex: curve.tex,
      f: (displayX) => displayY(curve.f(sourceX(displayX))),
      df: (displayX) => (curve.df(sourceX(displayX)) * (b - a)) / (2 * yScale),
      domain: interval,
    },
  };
}

/** UI 与单测共用的 trailing-edge 防抖器。 */
export function createDebouncedTask<T>(run: (value: T) => void, delayMs: number): DebouncedTask<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    schedule(value) {
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        run(value);
      }, delayMs);
    },
    cancel() {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    },
  };
}
