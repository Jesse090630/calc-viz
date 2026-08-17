import { describe, it, expect } from 'vitest';
import { validateChain } from '../../engine/validate';
import { paramsForStage, resolveTex } from '../../engine/store';
import { DERIVATIVE_CHAIN as CHAIN, OBJ } from './chain';
import { PARABOLA_UP } from '../../math/curves';
import { clampH, secantSlope } from '../../math/derivative';

describe('Derivative 链的数据完整性', () => {
  it('通过通用校验,零问题', () => {
    expect(validateChain(CHAIN)).toEqual([]);
  });

  it('8 步,编号 1..8', () => {
    expect(CHAIN.stages).toHaveLength(8);
    expect(CHAIN.stages.map((s) => s.label)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
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
});

describe('⚠️ h 滑块的每一个可达值都不能炸', () => {
  const control = CHAIN.stages
    .flatMap((s) => s.controls ?? [])
    .find((c) => c.param === 'h');

  it('h 控件存在', () => {
    expect(control).toBeDefined();
  });

  it('⭐ 滑块整个行程(含正好落在 0 上)渲染出的公式都不含 NaN', () => {
    const c = control!;
    const stages = CHAIN.stages
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => (s.controls ?? []).some((x) => x.param === 'h'));

    for (let v = c.min; v <= c.max + 1e-9; v += c.step) {
      const h = Math.round(v * 1e6) / 1e6;
      for (const { s, i } of stages) {
        const params = { ...paramsForStage(CHAIN, i), h };
        for (const line of s.formula ?? []) {
          const tex = resolveTex(line.tex, params);
          expect(tex, `stage "${s.id}" at h=${h}`).not.toMatch(/NaN|Infinity|undefined/);
        }
      }
    }
  });

  it('h = 0 落进滑块时被 clampH 推开,secantSlope 不抛', () => {
    expect(() => secantSlope(PARABOLA_UP, 1, clampH(0))).not.toThrow();
  });
});

describe('链上显示的数字与 math core 一致', () => {
  it('第 1 步 h=1 时 Q = (2.00, 4.00)', () => {
    const i = 0;
    const tex = (CHAIN.stages[i]?.formula ?? [])
      .map((l) => resolveTex(l.tex, paramsForStage(CHAIN, i)))
      .join(' ');
    expect(tex).toContain('2.00');
    expect(tex).toContain('4.00');
  });

  it('⭐ 第 4 步的恒等式在每个 h 上都成立:显示值 = 2 + h', () => {
    const i = CHAIN.stages.findIndex((s) => s.id === 'identity');
    for (const h of [1, 0.5, 0.25, 0.1, -0.1, -0.5]) {
      const params = { ...paramsForStage(CHAIN, i), h };
      const tex = (CHAIN.stages[i]?.formula ?? []).map((l) => resolveTex(l.tex, params)).join(' ');
      expect(tex).toContain((2 + h).toFixed(6));
    }
  });

  it('第 7 步给出 f\'(1) = 2', () => {
    const s = CHAIN.stages.find((x) => x.id === 'tangent');
    const tex = (s?.formula ?? []).map((l) => resolveTex(l.tex, {})).join(' ');
    expect(tex).toContain("f'(1) = 2");
    expect(PARABOLA_UP.df(1)).toBe(2);
  });

  it('第 8 步的斜率读数等于解析导数 2x', () => {
    const i = CHAIN.stages.findIndex((s) => s.id === 'everywhere');
    for (const x0 of [0.5, 1.2, 1.9]) {
      const tex = (CHAIN.stages[i]?.formula ?? [])
        .map((l) => resolveTex(l.tex, { ...paramsForStage(CHAIN, i), x0 }))
        .join(' ');
      expect(tex).toContain((2 * x0).toFixed(6));
    }
  });
});
