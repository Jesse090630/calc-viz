import { describe, it, expect } from 'vitest';
import { PARABOLA_DOWN } from './curves';
import { adaptiveSimpson } from './quadrature';
import { relativeError } from './riemann';
import {
  shellVolumeExact,
  shellVolumeNumeric,
  shellRiemann,
  shellSlice,
  shellSlices,
  slabVolume,
  ringVolume,
} from './solids';

const C = PARABOLA_DOWN;
const EXACT = 8 * Math.PI; // 25.132741228718345

describe('Shell 解析解', () => {
  it('V = 2π∫₀² x(4−x²)dx = 8π', () => {
    expect(shellVolumeExact(C)).toBeCloseTo(EXACT, 12);
  });

  it('交叉验证 ①:解析解 vs 自适应 Simpson 数值积分', () => {
    expect(shellVolumeExact(C)).toBeCloseTo(shellVolumeNumeric(C), 10);
  });

  it('交叉验证 ②:换一种方法 —— Disk 法对 y 积分 π∫₀⁴(4−y)dy 也应得 8π', () => {
    // x² = 4 − y  ⇒  半径² = 4 − y,y 从 0 到 4
    const disk = Math.PI * adaptiveSimpson((y) => 4 - y, 0, 4);
    expect(disk).toBeCloseTo(EXACT, 10);
  });
});

describe('Shell 黎曼和(中点法)', () => {
  // 这张表由独立的 Python 脚本算出,再与本实现比对 —— 不采信任何单一来源
  const TABLE: ReadonlyArray<readonly [number, number]> = [
    [1, 37.699112],
    [2, 28.274334],
    [4, 25.918139],
    [8, 25.329091],
    [16, 25.181829],
    [32, 25.145013],
    [64, 25.135809],
    [128, 25.133508],
  ];

  for (const [n, expected] of TABLE) {
    it(`n = ${n} → ${expected}`, () => {
      expect(shellRiemann(C, n, 'mid')).toBeCloseTo(expected, 5);
    });
  }

  it('n = 1 不崩溃,给出 50% 相对误差', () => {
    expect(relativeError(shellRiemann(C, 1, 'mid'), EXACT)).toBeCloseTo(50, 4);
  });

  it('二阶收敛:n 翻倍,误差缩到约 1/4', () => {
    const e = (n: number) => Math.abs(shellRiemann(C, n, 'mid') - EXACT);
    for (const n of [4, 8, 16, 32, 64]) {
      expect(e(n) / e(2 * n)).toBeCloseTo(4, 1);
    }
  });

  it('n → 大时收敛到 8π', () => {
    expect(shellRiemann(C, 20000, 'mid')).toBeCloseTo(EXACT, 6);
  });
});

describe('单个壳的几何量', () => {
  it('shellSlice 取的是中点半径', () => {
    const s = shellSlice(C, 4, 0); // [0,2] 分 4 段,第 0 段中点 = 0.25
    expect(s.x).toBeCloseTo(0.25, 12);
    expect(s.dx).toBeCloseTo(0.5, 12);
    expect(s.h).toBeCloseTo(C.f(0.25), 12);
  });

  it('越界索引要报错', () => {
    expect(() => shellSlice(C, 4, 4)).toThrow(/out of range/);
    expect(() => shellSlice(C, 4, -1)).toThrow(/out of range/);
  });

  it('⭐ 取中点半径时 2πrhΔx 与真实圆环体积 π(R²−r²)h 完全相等(不是近似)', () => {
    for (const n of [1, 3, 8, 25]) {
      for (const s of shellSlices(C, n)) {
        expect(slabVolume(s)).toBeCloseTo(ringVolume(s), 12);
      }
    }
  });

  it('⭐ pilot 的具体数字:x=1.2, Δx=0.3 → 5.790584', () => {
    const s = { x: 1.2, dx: 0.3, h: C.f(1.2) };
    expect(slabVolume(s)).toBeCloseTo(5.790584, 5);
    expect(ringVolume(s)).toBeCloseTo(5.790584, 5);
    expect(Math.abs(slabVolume(s) - ringVolume(s))).toBeLessThan(1e-12);
  });

  it('所有壳的 slabVolume 之和 = 中点黎曼和(两条路径必须一致)', () => {
    for (const n of [1, 5, 20]) {
      const sum = shellSlices(C, n).reduce((t, s) => t + slabVolume(s), 0);
      expect(sum).toBeCloseTo(shellRiemann(C, n, 'mid'), 10);
    }
  });
});
