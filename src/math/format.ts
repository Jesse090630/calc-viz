/** 把坐标值格式化成适合轴标签与 KaTeX 边界的短字符串。 */
export function formatCoordinate(value: number, syntax: 'plain' | 'tex' = 'plain'): string {
  const pi = syntax === 'tex' ? '\\pi' : 'π';
  const ratios: ReadonlyArray<readonly [number, number]> = [
    [-2, 1], [-3, 2], [-1, 1], [-1, 2],
    [0, 1],
    [1, 2], [1, 1], [3, 2], [2, 1],
  ];
  for (const [numerator, denominator] of ratios) {
    if (Math.abs(value - (numerator / denominator) * Math.PI) > 1e-12) continue;
    if (numerator === 0) return '0';
    const sign = numerator < 0 ? '-' : '';
    const magnitude = Math.abs(numerator);
    const coefficient = magnitude === 1 ? '' : String(magnitude);
    return denominator === 1
      ? `${sign}${coefficient}${pi}`
      : `${sign}${coefficient}${pi}/${denominator}`;
  }
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toFixed(6)));
}
