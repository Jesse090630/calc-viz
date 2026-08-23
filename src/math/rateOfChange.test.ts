/**
 * `rateOfChange.ts` 的测试。
 *
 * 两个重点:
 * ① **Δx = 0 必须给 null,不许给 NaN**;
 * ② 差商与 `a + b` 恒等式两条独立路径必须处处一致。
 */
import { describe, it, expect } from 'vitest';
import {
  DOMAIN,
  SECANT_FN,
  approachSequence,
  readSecant,
  riseExpression,
  runExpression,
  sampleCurve,
  secantLine,
  showNumber,
  slopeByIdentity,
  slopeExpression,
} from './rateOfChange';

describe('⭐ 提示词里钉死的那组数字', () => {
  // a = 1, b = 3 → f(1) = 1, f(3) = 9, Δy = 8, Δx = 2, 平均变化率 = 4
  const r = readSecant(1, 3)!;

  it('f(1) = 1 且 f(3) = 9', () => {
    expect(r.fa).toBe(1);
    expect(r.fb).toBe(9);
  });

  it('Δy = 8', () => {
    expect(r.rise).toBe(8);
  });

  it('Δx = 2', () => {
    expect(r.run).toBe(2);
  });

  it('平均变化率 = 4', () => {
    expect(r.slope).toBe(4);
  });

  it('屏幕上读出来就是 8 / 2 = 4.00', () => {
    expect(slopeExpression(r)).toBe('8.00 / 2.00 = 4.00');
    expect(riseExpression(r)).toBe('9.00 − 1.00 = 8.00');
    expect(runExpression(r)).toBe('3.00 − 1.00 = 2.00');
  });
});

describe('⚠️ Δx = 0 必须返回 null,而不是 NaN', () => {
  // NaN 不会让任何东西崩,它只会变成屏幕上一个看不见的错。
  it('a === b 时 slope 为 null', () => {
    const r = readSecant(2, 2)!;
    expect(r.run).toBe(0);
    expect(r.rise).toBe(0);
    expect(r.slope).toBeNull();
    expect(Number.isNaN(r.slope as unknown as number)).toBe(false);
  });

  it('恒等式路径在 a === b 时也返回 null', () => {
    expect(slopeByIdentity(2, 2)).toBeNull();
  });

  it('割线在 Δx = 0 时无法确定,返回 null', () => {
    expect(secantLine(readSecant(2, 2)!)).toBeNull();
  });

  it('显示层给出「undefined (0 / 0)」而不是 NaN', () => {
    expect(slopeExpression(readSecant(2, 2)!)).toBe('undefined (0 / 0)');
    expect(slopeExpression(readSecant(2, 2)!)).not.toContain('NaN');
  });

  it('非有限输入返回 null', () => {
    expect(readSecant(Number.NaN, 1)).toBeNull();
    expect(readSecant(1, Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe('⭐ 两条独立路径必须一致:差商 vs a + b', () => {
  // 差商做除法;恒等式一次除法都不做。推理方式完全不重叠。
  it('在整个定义域的网格上都相等', () => {
    for (let i = 0; i <= 64; i += 1) {
      for (let j = 0; j <= 64; j += 1) {
        const a = DOMAIN.a + ((DOMAIN.b - DOMAIN.a) * i) / 64;
        const b = DOMAIN.a + ((DOMAIN.b - DOMAIN.a) * j) / 64;
        if (a === b) continue;
        const quotient = readSecant(a, b)!.slope!;
        const identity = slopeByIdentity(a, b)!;
        expect(quotient, `a=${a} b=${b}`).toBeCloseTo(identity, 9);
      }
    }
  });

  it('a = 1, b = 3 的恒等式答案就是 4', () => {
    expect(slopeByIdentity(1, 3)).toBe(4);
  });

  it('顺序颠倒不改变结果 —— 分子分母一起变号', () => {
    expect(readSecant(3, 1)!.slope).toBeCloseTo(readSecant(1, 3)!.slope!, 12);
    expect(slopeByIdentity(3, 1)).toBe(slopeByIdentity(1, 3));
  });

  it('跨过顶点时平均变化率可以是 0', () => {
    // a = −2, b = 2 → a + b = 0,两端等高
    const r = readSecant(-2, 2)!;
    expect(r.slope).toBe(0);
    expect(r.rise).toBe(0);
    expect(slopeByIdentity(-2, 2)).toBe(0);
  });

  it('两点都在左半支时平均变化率为负', () => {
    expect(readSecant(-3, -1)!.slope).toBeLessThan(0);
    expect(slopeByIdentity(-3, -1)).toBe(-4);
  });
});

describe('割线', () => {
  it('割线恰好经过 A 与 B 两点', () => {
    const r = readSecant(1, 3)!;
    const line = secantLine(r)!;
    expect(line.at(r.a)).toBeCloseTo(r.fa, 12);
    expect(line.at(r.b)).toBeCloseTo(r.fb, 12);
  });

  it('割线的斜率就是平均变化率(图与数必须是同一件事)', () => {
    for (const [a, b] of [[1, 3], [-2, 0.5], [0.2, 2.9], [-3, -0.4]] as const) {
      const r = readSecant(a, b)!;
      expect(secantLine(r)!.slope).toBeCloseTo(r.slope!, 12);
    }
  });

  it('遍历整个拖动行程,割线值始终有限', () => {
    for (let i = 0; i <= 200; i += 1) {
      const b = DOMAIN.a + ((DOMAIN.b - DOMAIN.a) * i) / 200;
      const r = readSecant(1, b)!;
      if (r.slope === null) continue;
      const line = secantLine(r)!;
      expect(Number.isFinite(line.at(0))).toBe(true);
      expect(Number.isFinite(line.at(DOMAIN.b))).toBe(true);
    }
  });
});

describe('把两点靠近', () => {
  it('每一步都更近,但**永远不重合**', () => {
    const a = 1;
    const seq = approachSequence(a, 3);
    expect(seq.length).toBeGreaterThan(3);
    let previous = Math.abs(3 - a);
    for (const b of seq) {
      const gap = Math.abs(b - a);
      expect(gap).toBeLessThan(previous);
      expect(gap).toBeGreaterThan(0); // 关键:不许到达
      expect(b).not.toBe(a);
      previous = gap;
    }
  });

  it('每一步都还能算出斜率(没有一步掉进 0/0)', () => {
    for (const b of approachSequence(1, 3)) {
      expect(readSecant(1, b)!.slope).not.toBeNull();
    }
  });

  it('读数向 2a 靠拢 —— 但这一节【不】声称取到了它', () => {
    const a = 1;
    const seq = approachSequence(a, 3, 40);
    const last = readSecant(a, seq[seq.length - 1]!)!.slope!;
    expect(Math.abs(last - 2 * a)).toBeLessThan(0.1);
    expect(last).not.toBe(2 * a); // 靠近,不等于
  });

  it('从左侧靠近同样有效', () => {
    const seq = approachSequence(1, -2);
    expect(seq.length).toBeGreaterThan(3);
    for (const b of seq) expect(b).toBeLessThan(1);
  });

  it('起点与 a 重合时返回空序列而不是死循环', () => {
    expect(approachSequence(1, 1)).toHaveLength(0);
  });

  // ⚠️ 变异测试逼出来的。去掉实现里那条 `if (Math.abs(gap) < 0.02) break;`,原本的测试全绿 ——
  // 因为 gap *= 0.82 在有限步内永远到不了 0,"不许重合"这条根本没被考验。
  // 那条 break 真正在防的**不是** 0/0,而是**两点靠到肉眼分不开**:
  // 屏幕上两个点糊成一个,割线的方向看不出来,这一幕就白演了。
  // 所以要断言的是"最后一步仍然分得开",不是"不等于零"。
  it('⚠️ 靠到最近时两点仍然在屏幕上分得开', () => {
    for (const steps of [26, 40, 80]) {
      const seq = approachSequence(1, 3, steps);
      const last = seq[seq.length - 1]!;
      expect(Math.abs(last - 1), `steps=${steps} 时两点已经糊在一起`).toBeGreaterThanOrEqual(0.02);
    }
  });

  it('步数再多也不会把间隔压到看不见', () => {
    const long = approachSequence(-1, 2.5, 200);
    for (const b of long) expect(Math.abs(b - -1)).toBeGreaterThanOrEqual(0.02);
  });
});

describe('取样与显示', () => {
  it('曲线端点精确、无 NaN', () => {
    const pts = sampleCurve(DOMAIN.a, DOMAIN.b, 80);
    expect(pts[0]!.x).toBeCloseTo(DOMAIN.a, 12);
    expect(pts.every((p) => Number.isFinite(p.y))).toBe(true);
  });

  it('f(x) = x² 确实是平方', () => {
    for (const x of [-3, -0.5, 0, 1, 2.5]) expect(SECANT_FN.at(x)).toBeCloseTo(x * x, 12);
  });

  it('减号用的是 U+2212,不是连字符', () => {
    // 等宽字体里连字符太短,读起来像别的符号
    expect(riseExpression(readSecant(1, 3)!)).toContain('−');
  });

  it('showNumber 不产生 -0.00', () => {
    expect(showNumber(-0.0001)).toBe('0.00');
  });

  it('遍历整个行程,三个显示字符串都不含 NaN', () => {
    for (let i = 0; i <= 120; i += 1) {
      const b = DOMAIN.a + ((DOMAIN.b - DOMAIN.a) * i) / 120;
      const r = readSecant(1, b)!;
      for (const text of [riseExpression(r), runExpression(r), slopeExpression(r)]) {
        expect(text).not.toContain('NaN');
      }
    }
  });
});
