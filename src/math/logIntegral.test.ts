/**
 * ⚠️ 这是**唯一**允许出现 `Math.log` 的地方。
 * 它在这里的身份是【第二条独立验证路径】:
 * 生产代码用数值积分算面积,测试用标准库的对数来核对。
 * 两条完全不同的路径给出同一个数,才算验证过。
 *
 * 如果哪天有人为了"省事"把 `Math.log` 挪进 `logIntegral.ts`,
 * 这些测试仍然会绿 —— 但它们就变成了自己核对自己。
 * 所以架构测试另有一条规则盯着主路径不许 import 它。
 */
import { describe, it, expect } from 'vitest';
import { adaptiveSimpson } from './quadrature';
import {
  powerAntiderivativeAt,
  powerTable,
  POWER_STEPS,
  areaUnderReciprocal,
  multiplicativeDefect,
  stretchSquash,
  staysOnReciprocal,
  baseWhereAreaIsOne,
} from './logIntegral';

describe('① 幂法则在 n = −1 处是坏掉的,不是给出别的答案', () => {
  // 这张表已由独立脚本验算,见 docs/ROADMAP.md W7
  const TABLE: ReadonlyArray<readonly [number, number]> = [
    [-0.5, 0.828427],
    [-0.9, 0.717735],
    [-0.99, 0.695555],
    [-0.999, 0.693387],
    [-0.9999, 0.693171],
  ];

  for (const [n, expected] of TABLE) {
    it(`n = ${n} → ${expected}`, () => {
      expect(powerAntiderivativeAt(n, 2)).toBeCloseTo(expected, 5);
    });
  }

  it('⭐ n = −1 返回 null(0/0),不是 NaN,也不是某个数', () => {
    expect(powerAntiderivativeAt(-1, 2)).toBeNull();
    expect(powerAntiderivativeAt(-1, 5)).toBeNull();
  });

  it('分子分母确实同时为 0 —— 公式是真的坏掉了', () => {
    const b = 2;
    const p = -1 + 1;
    expect(p).toBe(0);
    expect(Math.pow(b, p) - 1).toBe(0);
  });

  it('远离 −1 的地方幂法则照常好用(与数值积分互证)', () => {
    for (const n of [2, 1, 0, -0.5, -2, 3]) {
      const closed = powerAntiderivativeAt(n, 3);
      expect(closed).not.toBeNull();
      // 第二条路径:直接数值积分 xⁿ
      expect(closed!).toBeCloseTo(adaptiveSimpson((x) => Math.pow(x, n), 1, 3), 8);
    }
  });

  it('powerTable 的最后一档正是无定义的那个', () => {
    const rows = powerTable(2);
    expect(rows).toHaveLength(POWER_STEPS.length);
    expect(rows[rows.length - 1]!.n).toBe(-1);
    expect(rows[rows.length - 1]!.value).toBeNull();
  });

  it('⭐ 极限方向明确:n 越接近 −1,值越靠近 0.693147', () => {
    const target = 0.693147;
    const distances = [-0.5, -0.9, -0.99, -0.999, -0.9999].map((n) =>
      Math.abs(powerAntiderivativeAt(n, 2)! - target),
    );
    for (let i = 1; i < distances.length; i++) {
      expect(distances[i]!).toBeLessThan(distances[i - 1]!);
    }
  });
});

describe('② 面积:两条独立路径互证', () => {
  const TABLE: ReadonlyArray<readonly [number, number]> = [
    [2, 0.693147],
    [4, 1.386294],
    [8, 2.079442],
    [16, 2.772589],
  ];

  for (const [t, expected] of TABLE) {
    it(`A(${t}) = ${expected}`, () => {
      expect(areaUnderReciprocal(t)).toBeCloseTo(expected, 5);
    });
  }

  it('⭐ 数值积分路径与 Math.log 路径一致(第二条独立路径)', () => {
    for (const t of [1.2, 2, 3, 4, 8, 16, 0.5, 0.25]) {
      expect(areaUnderReciprocal(t)).toBeCloseTo(Math.log(t), 9);
    }
  });

  it('A(1) 恰为 0', () => {
    expect(areaUnderReciprocal(1)).toBe(0);
  });

  it('t < 1 时面积为负(积分方向反了)', () => {
    expect(areaUnderReciprocal(0.5)).toBeLessThan(0);
    expect(areaUnderReciprocal(0.5)).toBeCloseTo(-areaUnderReciprocal(2)!, 9);
  });

  it('⚠️ t ≤ 0 返回 null —— 积分路径会穿过极点', () => {
    expect(areaUnderReciprocal(0)).toBeNull();
    expect(areaUnderReciprocal(-1)).toBeNull();
    expect(areaUnderReciprocal(Number.NaN)).toBeNull();
  });

  it('绝不返回 NaN', () => {
    for (const t of [0.01, 0.5, 1, 2, 100]) {
      expect(Number.isFinite(areaUnderReciprocal(t)!)).toBe(true);
    }
  });
});

describe('③ ⭐ 支点:[1,2] 与 [2,4] 面积完全相等', () => {
  it('后者更宽更矮,面积却一样', () => {
    const first = areaUnderReciprocal(2)!;
    const second = areaUnderReciprocal(4)! - areaUnderReciprocal(2)!;
    expect(second).toBeCloseTo(first, 9);
    // 宽度确实翻倍
    expect(4 - 2).toBe(2 * (2 - 1));
    // 高度确实减半(在右端点比)
    expect(1 / 4).toBeCloseTo((1 / 2) / 2, 12);
  });

  it('对任意 b 都成立,不只是 b = 2', () => {
    for (const b of [1.5, 3, 5]) {
      const first = areaUnderReciprocal(b)!;
      const next = areaUnderReciprocal(b * b)! - areaUnderReciprocal(b)!;
      expect(next).toBeCloseTo(first, 8);
    }
  });
});

describe('④ 横拉 b、纵压 1/b 时 1/x 回到自己', () => {
  it('变换后的点仍在曲线上', () => {
    for (const x of [0.5, 1, 2, 3.7]) {
      for (const b of [0.5, 1.5, 2, 7]) {
        expect(staysOnReciprocal(x, b)).toBe(true);
      }
    }
  });

  it('stretchSquash 的具体数值', () => {
    expect(stretchSquash([1, 1], 2)).toEqual([2, 0.5]);
    expect(stretchSquash([2, 0.5], 2)).toEqual([4, 0.25]);
  });

  it('⚠️ 别的幂函数【不】具备这个性质 —— 这才是 1/x 特殊的原因', () => {
    // y = x² 上的点 (2,4),变换后 (4,2),但曲线在 4 处的值是 16
    const [x2, y2] = stretchSquash([2, 4], 2);
    expect(y2).not.toBeCloseTo(x2 * x2, 6);
    // y = x 上的点 (2,2) → (4,1),曲线在 4 处是 4
    const [x3, y3] = stretchSquash([2, 2], 2);
    expect(y3).not.toBeCloseTo(x3, 6);
  });
});

describe('⑤ 面积把乘法变成加法', () => {
  it('A(2) + A(4) = A(8)', () => {
    expect(areaUnderReciprocal(2)! + areaUnderReciprocal(4)!).toBeCloseTo(
      areaUnderReciprocal(8)!,
      8,
    );
  });

  it('⭐ A(bc) − (A(b)+A(c)) 只剩浮点噪声', () => {
    for (const [b, c] of [[2, 4], [3, 5], [1.5, 6], [2, 2], [7, 1.3]] as const) {
      expect(Math.abs(multiplicativeDefect(b, c)!)).toBeLessThan(1e-8);
    }
  });

  it('A(2ⁿ) 恰为 n 倍的 A(2)', () => {
    const unit = areaUnderReciprocal(2)!;
    for (const k of [1, 2, 3, 4]) {
      expect(areaUnderReciprocal(2 ** k)!).toBeCloseTo(k * unit, 7);
    }
  });

  it('输入非法时返回 null 而不是 NaN', () => {
    expect(multiplicativeDefect(-1, 2)).toBeNull();
    expect(multiplicativeDefect(2, 0)).toBeNull();
  });
});

describe('⑥ 底数是被面积定出来的,不是选出来的', () => {
  it('⭐ 二分法找到的 A(t)=1 之处就是 e(不是写死 Math.E)', () => {
    const base = baseWhereAreaIsOne();
    expect(base).toBeCloseTo(2.718282, 5);
    // 第二条独立路径
    expect(base).toBeCloseTo(Math.E, 9);
  });

  it('在那一点面积确实等于 1', () => {
    expect(areaUnderReciprocal(baseWhereAreaIsOne())!).toBeCloseTo(1, 9);
  });
});
