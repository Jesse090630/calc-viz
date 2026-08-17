import type { ExpressionCurveInput } from './expression';

export interface ExpressionPreset extends ExpressionCurveInput {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
}

export type ExpressionPresetMethod = 'riemann' | 'shell' | 'disk';

/** 全部预设的数字由 presets.test.ts 中独立手算值钉死。 */
export const EXPRESSION_PRESETS: Readonly<Record<ExpressionPresetMethod, readonly ExpressionPreset[]>> = {
  riemann: [
    { id: 'riemann-cap', label: 'Parabola cap', hint: 'A decreasing area', expression: '4-x^2', a: 0, b: 2 },
    { id: 'riemann-rise', label: 'Quadratic rise', hint: 'Watch midpoint error', expression: 'x^2', a: 0, b: 2 },
    { id: 'riemann-sine', label: 'Sine arch', hint: 'One smooth hump', expression: 'sin(x)', a: 0, b: Math.PI },
    { id: 'riemann-root', label: 'Square root', hint: 'Steep near zero', expression: 'sqrt(x)', a: 0, b: 4 },
  ],
  shell: [
    { id: 'shell-cap', label: 'Parabola cap', hint: 'The original bowl', expression: '4-x^2', a: 0, b: 2 },
    { id: 'shell-cone', label: 'Cone side', hint: 'A linear height', expression: '2-x', a: 0, b: 2 },
    { id: 'shell-cylinder', label: 'Cylinder', hint: 'Constant height', expression: '2', a: 0, b: 2 },
  ],
  disk: [
    { id: 'disk-bowl', label: 'Bowl radius', hint: 'The original solid', expression: 'sqrt(4-x)', a: 0, b: 4 },
    { id: 'disk-cone', label: 'Cone radius', hint: 'A linear radius', expression: '2-x', a: 0, b: 2 },
    { id: 'disk-cylinder', label: 'Cylinder', hint: 'Constant radius', expression: '2', a: 0, b: 3 },
  ],
};
