import { describe, expect, it } from 'vitest';
import { validateChain } from '../../engine/validate';
import { paramsForStage, resolveTex } from '../../engine/store';
import { circlePoint } from '../../math/trig';
import { UNIT_CIRCLE_CHAIN as CHAIN, OBJ } from './chain';

const texAt = (id: string, overrides: Record<string, number> = {}): string => {
  const i = CHAIN.stages.findIndex((s) => s.id === id);
  const params = { ...paramsForStage(CHAIN, i), ...overrides };
  return (CHAIN.stages[i]?.formula ?? []).map((line) => resolveTex(line.tex, params)).join(' ');
};

describe('Unit Circle 链的数据完整性', () => {
  it('通过通用校验,零问题', () => {
    expect(validateChain(CHAIN)).toEqual([]);
  });

  it('严格是 HANDOFF 4.4 的 7 步', () => {
    expect(CHAIN.stages).toHaveLength(7);
  });

  it('显示的对象都在约定表里', () => {
    const known = new Set<string>(Object.values(OBJ));
    for (const stage of CHAIN.stages) {
      for (const id of stage.show) {
        expect(known.has(id), `stage "${stage.id}" shows unknown object "${id}"`).toBe(true);
      }
    }
  });

  it('⭐ 不新增相机预设:整条链只使用现有 wide', () => {
    expect(CHAIN.stages.every((stage) => stage.camera === 'wide')).toBe(true);
  });

  it('相机纪律:自动运动全部延迟至少 1100ms', () => {
    for (const stage of CHAIN.stages) {
      if (stage.autoplay) expect(stage.autoplay.delayMs).toBeGreaterThanOrEqual(1100);
    }
  });

  it('动画纪律:每幕 narration 严格一句', () => {
    for (const stage of CHAIN.stages) {
      const sentences = stage.narration.match(/[.!?](?:\s|$)/g) ?? [];
      expect(sentences, `stage "${stage.id}" narration must be one sentence`).toHaveLength(1);
    }
  });

  it('⭐ 角度滑块以 π/12 为档位,浏览器里能精确落在全部特殊角', () => {
    const control = CHAIN.stages.find((stage) => stage.id === 'trace')?.controls?.[0];
    expect(control?.step).toBeCloseTo(Math.PI / 12, 12);
    expect(control?.format?.(Math.PI / 6)).toBe('π/6');
    expect(control?.format?.(Math.PI / 4)).toBe('π/4');
    expect(control?.format?.(2 * Math.PI)).toBe('2π');
  });

  it('每个滑块档位与自动播放终点的公式都没有 NaN / Infinity / -0.000000', () => {
    for (const [i, stage] of CHAIN.stages.entries()) {
      const values = new Set<number>([0, Math.PI / 6, Math.PI / 3, Math.PI, 2 * Math.PI]);
      if (stage.autoplay) values.add(stage.autoplay.to);
      for (const theta of values) {
        const params = { ...paramsForStage(CHAIN, i), theta, lapTheta: theta };
        for (const line of stage.formula ?? []) {
          expect(resolveTex(line.tex, params)).not.toMatch(/NaN|Infinity|-0\.000000/);
        }
      }
    }
  });
});

describe('链上显示的数字与 math core 一致', () => {
  it('第 2 步 θ=π/3 显示弧长 1.047198', () => {
    expect(texAt('arc-length', { theta: Math.PI / 3 })).toContain('1.047198');
  });

  it('⭐ 第 3–5 步 θ=π/6 都显示 sin θ = 0.500000', () => {
    for (const id of ['drop', 'carry', 'trace']) {
      expect(texAt(id, { theta: Math.PI / 6 })).toContain('0.500000');
    }
    expect(circlePoint(Math.PI / 6)[1].toFixed(6)).toBe('0.500000');
  });

  it('第 6 步 θ=π/3 同时显示 sin=0.866025 与 cos=0.500000', () => {
    const tex = texAt('cosine', { theta: Math.PI / 3 });
    expect(tex).toContain('0.866025');
    expect(tex).toContain('0.500000');
    expect(tex).toContain('pi}{2}');
  });

  it('第 7 步把第二圈写成相同相位,周期明确为 2π', () => {
    const tex = texAt('repeat', { lapTheta: Math.PI / 3 });
    expect(tex).toContain('2\\pi');
    expect(tex).toContain('sin(\\theta + 2\\pi) = \\sin\\theta');
  });
});
