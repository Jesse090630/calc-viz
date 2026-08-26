import { describe, expect, it } from 'vitest';
import { formatCoordinate, showCompact, showNumber, showScientific } from './format';

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

describe('⭐⭐ 科学记数法:指数必须是真上标', () => {
  it('⚠️ 先把那三个假数摆出来 —— 它们都是**截图**抓到的,不是测试抓到的', () => {
    // 各处原先手写的那串 replace 会写出:
    expect((1).toExponential(1).replace('e+', '×10')).toBe('1.0×100'); // 一 → 写成一百
    expect((1e5).toExponential(0).replace('e+', '×10')).toBe('1×105'); // 十万 → 写成一百零五
    expect((1e-4).toExponential(0).replace('e-', '×10⁻')).toBe('1×10⁻4'); // 上标只有一半
  });

  it('而 showScientific 三个都写对', () => {
    expect(showScientific(1)).toBe('1.0');
    expect(showScientific(1e5, 0)).toBe('1×10⁵');
    expect(showScientific(1e-4, 0)).toBe('1×10⁻⁴');
    expect(showScientific(2.5e-13, 1)).toBe('2.5×10⁻¹³');
    expect(showScientific(-3e7, 0)).toBe('-3×10⁷');
  });

  it('⭐ 输出里不许再出现半截的指数(纯 ASCII 数字紧跟在 ×10 后面)', () => {
    for (const v of [1, 12, 1e5, 1e-4, 6.02e23, -1.6e-19, 5e-17, 1e300, 1e-300]) {
      const shown = showScientific(v, 1);
      expect(shown, `${v} → ${shown}`).not.toMatch(/×10-?\d/);
      expect(shown).not.toContain('e+');
      expect(shown).not.toContain('e-');
    }
  });

  it('指数是 0 就不写指数部分 —— 1×10⁰ 没人这么读', () => {
    expect(showScientific(3.7)).toBe('3.7');
    expect(showScientific(-3.7)).toBe('-3.7');
    expect(showScientific(0)).toBe('0');
    expect(showScientific(Number.NaN)).toBe('—');
    expect(showScientific(Infinity)).toBe('—');
  });

  it('showCompact:中间用定点,两头用科学记数', () => {
    expect(showCompact(0.5)).toBe(showNumber(0.5, 3));
    expect(showCompact(0)).toBe(showNumber(0, 3));
    expect(showCompact(1e-6)).toBe('1.0×10⁻⁶');
    expect(showCompact(1e6)).toBe('1.0×10⁶');
    // 边界:恰好在阈值上走定点
    expect(showCompact(1e-3)).toBe(showNumber(1e-3, 3));
    expect(showCompact(Number.NaN)).toBe('—');
  });

  it('⚠️ 往回读得回原来的数(上标不是装饰,是内容)', () => {
    const unSuper = (s: string) =>
      s.replace('×10', 'e').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, (c) => '0123456789-'['⁰¹²³⁴⁵⁶⁷⁸⁹⁻'.indexOf(c)]!);
    for (const v of [1e5, 1e-4, 2.5e-13, -3e7, 6.02e23]) {
      expect(Number(unSuper(showScientific(v, 2))), `${v}`).toBeCloseTo(v, Math.abs(v) < 1 ? 20 : -Math.floor(Math.log10(Math.abs(v))) + 2);
    }
  });
});
