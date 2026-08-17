import { describe, it, expect } from 'vitest';
import { validateChain } from '../../engine/validate';
import { paramsForStage, resolveTex } from '../../engine/store';
import { LIMITS_CHAIN as CHAIN, OBJ } from './chain';
import { DISTANCES, JUMP, REMOVABLE, limitAt } from '../../math/limits';

describe('Limits 链的数据完整性', () => {
  it('通过通用校验,零问题', () => {
    expect(validateChain(CHAIN)).toEqual([]);
  });

  it('7 步', () => {
    expect(CHAIN.stages).toHaveLength(7);
  });

  it('显示的对象都在约定表里', () => {
    const known = new Set<string>(Object.values(OBJ));
    for (const s of CHAIN.stages) {
      for (const id of s.show) {
        expect(known.has(id), `stage "${s.id}" shows unknown object "${id}"`).toBe(true);
      }
    }
  });

  it('相机纪律:自动运动的步延迟 ≥ 800ms', () => {
    for (const s of CHAIN.stages) {
      if (s.autoplay) expect(s.autoplay.delayMs).toBeGreaterThanOrEqual(800);
    }
  });

  it('⭐ 滑块每一个档位渲染出的公式都不含 NaN', () => {
    CHAIN.stages.forEach((s, i) => {
      for (let di = 0; di < DISTANCES.length; di++) {
        const params = { ...paramsForStage(CHAIN, i), di };
        for (const line of s.formula ?? []) {
          const tex = resolveTex(line.tex, params);
          expect(tex, `stage "${s.id}" at di=${di}`).not.toMatch(/NaN|Infinity/);
        }
      }
    });
  });
});

describe('链上显示的数字与 math core 一致', () => {
  const texAt = (id: string, di: number): string => {
    const i = CHAIN.stages.findIndex((s) => s.id === id);
    const params = { ...paramsForStage(CHAIN, i), di };
    return (CHAIN.stages[i]?.formula ?? []).map((l) => resolveTex(l.tex, params)).join(' ');
  };

  it('第 2 步逐档显示 1.500000 → 1.900000 → 1.990000 → 1.999000', () => {
    const expected = ['1.500000', '1.900000', '1.990000', '1.999000'];
    expected.forEach((v, di) => expect(texAt('from-left', di)).toContain(v));
  });

  it('第 3 步逐档显示 2.500000 → 2.100000 → 2.010000 → 2.001000', () => {
    const expected = ['2.500000', '2.100000', '2.010000', '2.001000'];
    expected.forEach((v, di) => expect(texAt('from-right', di)).toContain(v));
  });

  it('⭐ 第 5 步同时断言"极限 = 2"和"g(1) 无定义"', () => {
    const t = texAt('not-the-value', 0);
    expect(t).toContain('\\lim_{x \\to 1} g(x) = 2');
    expect(t).toContain('undefined');
    expect(REMOVABLE.at(1)).toBeNull();
  });

  it('⭐ 第 6 步左侧读数与可去间断那条完全相同(变量控制)', () => {
    for (let di = 0; di < DISTANCES.length; di++) {
      const d = DISTANCES[di]!;
      expect(JUMP.at(1 - d)).toBeCloseTo(REMOVABLE.at(1 - d)!, 9);
    }
  });

  it('第 6 步右侧逐档显示 4.000000 → 3.600000 → 3.510000 → 3.501000', () => {
    const expected = ['4.000000', '3.600000', '3.510000', '3.501000'];
    expected.forEach((v, di) => expect(texAt('disagree', di)).toContain(v));
  });

  it('第 7 步给出左 2 / 右 3.5 / 极限不存在', () => {
    const t = texAt('no-limit', 0);
    expect(t).toContain('2.000000');
    expect(t).toContain('3.500000');
    expect(t).toContain('does not exist');
    expect(limitAt(JUMP, 1).exists).toBe(false);
  });
});
