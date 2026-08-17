import { describe, expect, it } from 'vitest';
import { formatCoordinate } from './format';

describe('formatCoordinate', () => {
  it('常见 π 倍数用学生可读的符号显示', () => {
    expect(formatCoordinate(Math.PI)).toBe('π');
    expect(formatCoordinate(Math.PI, 'tex')).toBe('\\pi');
    expect(formatCoordinate(Math.PI / 2)).toBe('π/2');
    expect(formatCoordinate(2 * Math.PI, 'tex')).toBe('2\\pi');
  });

  it('普通整数与小数保持简洁，不制造长尾', () => {
    expect(formatCoordinate(0)).toBe('0');
    expect(formatCoordinate(2)).toBe('2');
    expect(formatCoordinate(1 / 3)).toBe('0.333333');
  });
});
