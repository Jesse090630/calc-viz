import { describe, it, expect } from 'vitest';
import { CURVES, PARABOLA_DOWN, getCurve } from './curves';
import { numericDerivative, adaptiveSimpson } from './quadrature';

describe('CurveSpec 自洽性(每条曲线都要过)', () => {
  for (const c of CURVES) {
    describe(c.label, () => {
      // 在定义域内部取样,避开端点(如 √x 在 0 处导数发散,那是数学事实不是 bug)
      const [a, b] = c.domain;
      const xs = Array.from({ length: 9 }, (_, i) => a + ((b - a) * (i + 1)) / 10);

      it('解析导数 df 与数值微分一致', () => {
        for (const x of xs) {
          expect(c.df(x)).toBeCloseTo(numericDerivative(c.f, x), 6);
        }
      });

      it('原函数 F 满足 F(b) − F(a) = ∫ f', () => {
        const closed = c.F(b) - c.F(a);
        const numeric = adaptiveSimpson(c.f, a, b);
        expect(closed).toBeCloseTo(numeric, 9);
      });

      it('原函数 xF 满足 xF(b) − xF(a) = ∫ x·f(x)  ← Shell 解析解的地基', () => {
        const closed = c.xF(b) - c.xF(a);
        const numeric = adaptiveSimpson((x) => x * c.f(x), a, b);
        expect(closed).toBeCloseTo(numeric, 9);
      });

      it('原函数 sqF 满足 sqF(b) − sqF(a) = ∫ f(x)²  ← Disk 解析解的地基', () => {
        const closed = c.sqF(b) - c.sqF(a);
        const numeric = adaptiveSimpson((x) => c.f(x) * c.f(x), a, b);
        expect(closed).toBeCloseTo(numeric, 9);
      });

      it('定义域是非退化区间', () => {
        expect(b).toBeGreaterThan(a);
      });
    });
  }
});

describe('PARABOLA_DOWN 的具体数值(pilot 用曲线,手算钉死)', () => {
  it('f(0)=4, f(1)=3, f(1.2)=2.56, f(2)=0', () => {
    expect(PARABOLA_DOWN.f(0)).toBe(4);
    expect(PARABOLA_DOWN.f(1)).toBe(3);
    expect(PARABOLA_DOWN.f(1.2)).toBeCloseTo(2.56, 12);
    expect(PARABOLA_DOWN.f(2)).toBe(0);
  });

  it('xF(2) − xF(0) = 2·4 − 16/4 = 4', () => {
    expect(PARABOLA_DOWN.xF(2) - PARABOLA_DOWN.xF(0)).toBeCloseTo(4, 12);
  });
});

describe('getCurve', () => {
  it('能按 id 取到曲线', () => {
    expect(getCurve('parabola-down').label).toBe('y = 4 − x²');
  });
  it('未知 id 要报错,不要静默返回 undefined', () => {
    expect(() => getCurve('nope')).toThrow(/Unknown curve/);
  });
});
