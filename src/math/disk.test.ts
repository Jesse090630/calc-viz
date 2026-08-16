import { describe, it, expect } from 'vitest';
import { PARABOLA_DOWN, PARABOLA_INVERSE } from './curves';
import { relativeError } from './riemann';
import {
  diskVolumeExact,
  diskVolumeNumeric,
  diskRiemann,
  diskSlice,
  diskSlices,
  diskVolume,
  shellVolumeExact,
  shellRiemann,
} from './solids';

const G = PARABOLA_INVERSE; // x = √(4 − y),y ∈ [0, 4]
const EXACT = 8 * Math.PI;

describe('Disk 解析解', () => {
  it('V = π∫₀⁴ (4 − y) dy = 8π', () => {
    expect(diskVolumeExact(G)).toBeCloseTo(EXACT, 12);
  });

  it('交叉验证:解析解 vs 自适应 Simpson', () => {
    expect(diskVolumeExact(G)).toBeCloseTo(diskVolumeNumeric(G), 10);
  });

  it('⭐ 同一个立体、两种切法、同一个答案 —— 这是整条 Disk 链的落点', () => {
    // 竖着切(Shell,对 x 积分) 与 横着切(Disk,对 y 积分) 描述的是同一个旋转体
    expect(diskVolumeExact(G)).toBeCloseTo(shellVolumeExact(PARABOLA_DOWN), 10);
  });

  it('反函数确实是同一条曲线:g(f(x)) = x', () => {
    for (const x of [0.2, 0.7, 1.2, 1.8]) {
      expect(G.f(PARABOLA_DOWN.f(x))).toBeCloseTo(x, 10);
    }
  });
});

describe('Disk 黎曼和(中点法)', () => {
  it('n = 1 给出 50% 相对误差(与 Shell 巧合无关,是各自的几何决定的)', () => {
    const v = diskRiemann(G, 1, 'mid');
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBeGreaterThan(0);
  });

  it('⭐ 中点法对本例【任意 n 都精确】—— 被积函数 πr² = π(4−y) 是线性的', () => {
    // 中点法对线性被积函数零误差:中点两侧的高估与低估严格抵消。
    for (const n of [1, 2, 5, 17, 100]) {
      expect(diskRiemann(G, n, 'mid')).toBeCloseTo(EXACT, 10);
      expect(relativeError(diskRiemann(G, n, 'mid'), EXACT)).toBeCloseTo(0, 8);
    }
  });

  it('⭐ 同一个立体,Shell 有误差而 Disk 没有 —— 差别只在切法', () => {
    // 这不是"哪个方法更好",而是切法决定了被积函数的次数:
    //   Shell: 2πx(4−x²) 是三次 → 中点法有 O(n⁻²) 误差
    //   Disk : π(4−y)    是一次 → 中点法精确
    for (const n of [4, 16]) {
      expect(relativeError(shellRiemann(PARABOLA_DOWN, n), EXACT)).toBeGreaterThan(0.1);
      expect(relativeError(diskRiemann(G, n), EXACT)).toBeLessThan(1e-9);
    }
  });

  it('⚠️ 体积精确 ≠ 形状正确:n 个圆盘堆出来是阶梯,不是光滑抛物面', () => {
    // 阶梯与真实曲面之间处处有误差,只是正负恰好抵消。
    // 这是 Disk 链要讲的那个"啊哈":屏幕上明明看着不像,数字却是对的。
    const n = 4;
    const slices = diskSlices(G, n);
    const worstGap = Math.max(
      ...slices.map((s) => Math.abs(s.r - G.f(s.t + s.dt / 2))), // 片顶处的半径落差
    );
    expect(worstGap).toBeGreaterThan(0.1); // 形状明显对不上
    expect(relativeError(diskRiemann(G, n), EXACT)).toBeLessThan(1e-9); // 体积却分毫不差
  });
});

describe('单个圆盘', () => {
  it('diskSlice 取中点', () => {
    const s = diskSlice(G, 4, 0); // [0,4] 分 4 段,第 0 段中点 = 0.5
    expect(s.t).toBeCloseTo(0.5, 12);
    expect(s.dt).toBeCloseTo(1, 12);
    expect(s.r).toBeCloseTo(Math.sqrt(3.5), 12);
  });

  it('越界索引报错', () => {
    expect(() => diskSlice(G, 4, 4)).toThrow(/out of range/);
  });

  it('所有圆盘体积之和 = 中点黎曼和', () => {
    for (const n of [1, 5, 20]) {
      const sum = diskSlices(G, n).reduce((t, s) => t + diskVolume(s), 0);
      expect(sum).toBeCloseTo(diskRiemann(G, n, 'mid'), 10);
    }
  });
});
