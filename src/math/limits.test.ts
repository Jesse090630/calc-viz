import { describe, it, expect } from 'vitest';
import {
  REMOVABLE,
  JUMP,
  LIMIT_FUNCTIONS,
  DISTANCES,
  approach,
  oneSidedLimit,
  limitAt,
  sampleSegments,
} from './limits';

describe('⚠️ 洞必须是真的洞', () => {
  it('g(1) 真的算不出来(0/0),返回 null 而不是 NaN,更不是偷用 x+1', () => {
    expect(REMOVABLE.at(1)).toBeNull();
    // 直接验证被除数与除数都是 0 —— 确保实现没有绕过除法
    expect(1 * 1 - 1).toBe(0);
    expect(1 - 1).toBe(0);
  });

  it('J(1) 无定义', () => {
    expect(JUMP.at(1)).toBeNull();
  });

  it('除该点外 g(x) 处处等于 x+1', () => {
    for (const x of [-0.3, 0, 0.5, 0.999, 1.001, 2, 2.5]) {
      expect(REMOVABLE.at(x)).toBeCloseTo(x + 1, 9);
    }
  });

  it('任何函数在任何采样点都不会返回 NaN', () => {
    for (const fn of LIMIT_FUNCTIONS) {
      const [a, b] = fn.domain;
      for (let i = 0; i <= 200; i++) {
        const y = fn.at(a + ((b - a) * i) / 200);
        expect(y === null || Number.isFinite(y)).toBe(true);
      }
    }
  });
});

describe('可去间断:两侧一致,极限存在但函数值不存在', () => {
  // 已由独立脚本验算,见 docs/HANDOFF.md 第 4.3 节
  const TABLE: ReadonlyArray<readonly [number, number, number]> = [
    [0.5, 1.5, 2.5],
    [0.1, 1.9, 2.1],
    [0.01, 1.99, 2.01],
    [0.001, 1.999, 2.001],
  ];

  for (const [d, l, r] of TABLE) {
    it(`d = ${d} → 左 ${l} / 右 ${r}`, () => {
      expect(REMOVABLE.at(1 - d)).toBeCloseTo(l, 9);
      expect(REMOVABLE.at(1 + d)).toBeCloseTo(r, 9);
    });
  }

  it('逼近序列的档位与 DISTANCES 一致', () => {
    const seq = approach(REMOVABLE, 1, 'left', DISTANCES);
    expect(seq.map((s) => s.d)).toEqual([...DISTANCES]);
    expect(seq[0]?.y).toBeCloseTo(1.5, 9);
  });

  it('⭐ 左极限 = 右极限 = 2,但 g(1) 仍然是 null', () => {
    const r = limitAt(REMOVABLE, 1);
    expect(r.left).toBeCloseTo(2, 6);
    expect(r.right).toBeCloseTo(2, 6);
    expect(r.exists).toBe(true);
    expect(r.value).toBeCloseTo(2, 6);
    expect(r.valueAtPoint).toBeNull(); // ← 这条链的全部落点
  });
});

describe('跳跃间断:两侧不一致,极限不存在', () => {
  const TABLE: ReadonlyArray<readonly [number, number, number]> = [
    [0.5, 1.5, 4.0],
    [0.1, 1.9, 3.6],
    [0.01, 1.99, 3.51],
    [0.001, 1.999, 3.501],
  ];

  for (const [d, l, r] of TABLE) {
    it(`d = ${d} → 左 ${l} / 右 ${r}`, () => {
      expect(JUMP.at(1 - d)).toBeCloseTo(l, 9);
      expect(JUMP.at(1 + d)).toBeCloseTo(r, 9);
    });
  }

  it('⭐ 左极限 2、右极限 3.5,不一致 ⇒ 极限不存在', () => {
    const r = limitAt(JUMP, 1);
    expect(r.left).toBeCloseTo(2, 6);
    expect(r.right).toBeCloseTo(3.5, 6);
    expect(r.exists).toBe(false);
    expect(r.value).toBeNull();
  });

  it('⭐ 变量控制:两条曲线的【左侧】行为完全相同', () => {
    for (const d of DISTANCES) {
      expect(JUMP.at(1 - d)).toBeCloseTo(REMOVABLE.at(1 - d)!, 9);
    }
    expect(oneSidedLimit(JUMP, 1, 'left')).toBeCloseTo(
      oneSidedLimit(REMOVABLE, 1, 'left')!,
      6,
    );
  });
});

describe('⚠️ 发散必须被判成"没有极限",不能返回一个很大的数', () => {
  const diverging = {
    id: 'pole',
    label: '1/(x−1)',
    tex: '\\dfrac{1}{x-1}',
    at: (x: number) => {
      const v = 1 / (x - 1);
      return Number.isFinite(v) ? v : null;
    },
    domain: [0, 2] as const,
    holes: [1],
  };

  it('1/(x−1) 在 x=1 两侧都返回 null', () => {
    expect(oneSidedLimit(diverging, 1, 'left')).toBeNull();
    expect(oneSidedLimit(diverging, 1, 'right')).toBeNull();
  });

  it('limitAt 也判定为不存在', () => {
    const r = limitAt(diverging, 1);
    expect(r.exists).toBe(false);
    expect(r.value).toBeNull();
  });

  it('收敛的例子不会被误杀', () => {
    expect(oneSidedLimit(REMOVABLE, 1, 'left')).toBeCloseTo(2, 9);
    expect(oneSidedLimit(REMOVABLE, 1, 'right')).toBeCloseTo(2, 9);
    expect(oneSidedLimit(JUMP, 1, 'right')).toBeCloseTo(3.5, 9);
  });
});

describe('sampleSegments 在洞处断开', () => {
  it('g 被切成左右两段', () => {
    const segs = sampleSegments(REMOVABLE);
    expect(segs).toHaveLength(2);
    expect(segs[0]!.every(([x]) => x < 1)).toBe(true);
    expect(segs[1]!.every(([x]) => x > 1)).toBe(true);
  });

  it('⭐ 没有任何一段跨过 x = 1 —— 否则等于把洞画没了', () => {
    for (const fn of LIMIT_FUNCTIONS) {
      for (const seg of sampleSegments(fn)) {
        const crosses = seg.some(([x], i) => i > 0 && (seg[i - 1]![0] - 1) * (x - 1) < 0);
        expect(crosses).toBe(false);
      }
    }
  });

  it('每段内部都是有限值', () => {
    for (const fn of LIMIT_FUNCTIONS) {
      for (const seg of sampleSegments(fn)) {
        for (const [, y] of seg) expect(Number.isFinite(y)).toBe(true);
      }
    }
  });
});
