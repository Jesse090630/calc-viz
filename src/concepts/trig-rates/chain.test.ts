import { describe, expect, it } from 'vitest';
import { validateChain } from '../../engine/validate';
import { paramsForStage, resolveTex } from '../../engine/store';
import { circleVelocity } from '../../math/trigRates';
import { OBJ, TRIG_RATES_CHAIN as CHAIN } from './chain';

const texAt = (id: string, overrides: Record<string, number> = {}): string => {
  const index = CHAIN.stages.findIndex((stage) => stage.id === id);
  const params = { ...paramsForStage(CHAIN, index), ...overrides };
  return (CHAIN.stages[index]?.formula ?? []).map((line) => resolveTex(line.tex, params)).join(' ');
};

describe('Trig rates 链的数据完整性', () => {
  it('通过通用校验且严格八步', () => {
    expect(validateChain(CHAIN)).toEqual([]);
    expect(CHAIN.stages).toHaveLength(8);
  });

  it('不新增相机预设,整条链只使用现有 front', () => {
    expect(CHAIN.stages.every((stage) => stage.camera === 'front')).toBe(true);
  });

  it('对象 id、动画延迟与单句 narration 全部守纪律', () => {
    const known = new Set<string>(Object.values(OBJ));
    for (const stage of CHAIN.stages) {
      expect(stage.show.every((id) => known.has(id))).toBe(true);
      if (stage.autoplay) expect(stage.autoplay.delayMs).toBeGreaterThanOrEqual(1100);
      expect(stage.narration.match(/[.!?](?:\s|$)/g) ?? []).toHaveLength(1);
      expect((stage.formula ?? []).filter((line) => line.highlight)).toHaveLength(1);
    }
  });

  it('全部滑块档位不会把 NaN / Infinity / -0.000000 写上屏', () => {
    for (const stage of CHAIN.stages) {
      for (let deltaTheta = 0.05; deltaTheta <= 0.80001; deltaTheta += 0.05) {
        for (const line of stage.formula ?? []) {
          expect(resolveTex(line.tex, { theta: Math.PI / 3, deltaTheta })).not.toMatch(/NaN|Infinity|-0\.000000/);
        }
      }
    }
  });
});

describe('链上确定性数字', () => {
  it('第 5 步 θ=π/3 显示 (-0.866025, 0.500000)', () => {
    const [x, y] = circleVelocity(Math.PI / 3);
    expect(x.toFixed(6)).toBe('-0.866025');
    expect(y.toFixed(6)).toBe('0.500000');
    expect(texAt('tangent-vector')).toContain('-0.866025');
    expect(texAt('tangent-vector')).toContain('0.500000');
  });

  it('第 6–8 步依次写出两条导数与反向积分', () => {
    expect(texAt('sine-rate')).toContain('sin\\theta=\\cos\\theta');
    expect(texAt('cosine-rate')).toContain('cos\\theta=-\\sin\\theta');
    expect(texAt('reverse-arrows')).toContain('int\\cos\\theta');
    expect(texAt('reverse-arrows')).toContain('int\\sin\\theta');
    expect(texAt('reverse-arrows')).toContain('+C');
  });
});
