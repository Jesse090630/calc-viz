import { describe, expect, it } from 'vitest';
import { validateChain } from '../../engine/validate';
import { paramsForStage, resolveTex } from '../../engine/store';
import { PARABOLA_DOWN } from '../../math/curves';
import { adaptiveSimpson } from '../../math/quadrature';
import {
  definiteIntegralExact,
  leftRightGap,
  riemannSum,
} from '../../math/riemann';
import { OBJ, RIEMANN_SUM_CHAIN as CHAIN } from './chain';

describe('Riemann Sum 链的数据完整性', () => {
  it('通过通用校验,零问题', () => {
    expect(validateChain(CHAIN)).toEqual([]);
  });

  it('严格为分镜规定的 8 步', () => {
    expect(CHAIN.stages).toHaveLength(8);
    expect(CHAIN.stages.map((stage) => stage.label)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
  });

  it('每一步显示的对象都在约定对象表里', () => {
    const known = new Set<string>(Object.values(OBJ));
    for (const stage of CHAIN.stages) {
      for (const id of stage.show) expect(known.has(id)).toBe(true);
    }
  });

  it('自动运动延迟给相机留足时间', () => {
    for (const stage of CHAIN.stages) {
      if (stage.autoplay) expect(stage.autoplay.delayMs).toBeGreaterThanOrEqual(800);
    }
  });

  it('所有公式在各步初值下都可渲染且没有脏数值', () => {
    CHAIN.stages.forEach((stage, index) => {
      const params = paramsForStage(CHAIN, index);
      for (const line of stage.formula ?? []) {
        const tex = resolveTex(line.tex, params);
        expect(tex.length).toBeGreaterThan(0);
        expect(tex).not.toMatch(/NaN|undefined|Infinity/);
      }
    });
  });
});

describe('链上的钉死数字与 math core 一致', () => {
  const expected = [
    [1, 8, 0],
    [2, 7, 3],
    [4, 6.25, 4.25],
    [8, 5.8125, 4.8125],
    [16, 5.578125, 5.078125],
    [32, 5.45703125, 5.20703125],
    [64, 5.3955078125, 5.2705078125],
  ] as const;

  it('HANDOFF 的左右端点表逐项吻合', () => {
    for (const [n, left, right] of expected) {
      expect(riemannSum(PARABOLA_DOWN.f, [0, 2], n, 'left')).toBeCloseTo(left, 6);
      expect(riemannSum(PARABOLA_DOWN.f, [0, 2], n, 'right')).toBeCloseTo(right, 6);
    }
  });

  it('n=4 显示 6.250000 / 4.250000 / 5.333333', () => {
    const stage = CHAIN.stages.find((item) => item.id === 'squeezed');
    const tex = (stage?.formula ?? []).map((line) => resolveTex(line.tex, { n: 4, morph: 0 })).join(' ');
    expect(tex).toContain('6.250000');
    expect(tex).toContain('4.250000');
    expect(tex).toContain('5.333333');
  });

  it('n=64 的夹缝显示 0.125000', () => {
    expect(leftRightGap(PARABOLA_DOWN, 64, [0, 2])).toBeCloseTo(0.125, 12);
    const stage = CHAIN.stages.find((item) => item.id === 'gap');
    const tex = (stage?.formula ?? []).map((line) => resolveTex(line.tex, { n: 64, morph: 0 })).join(' ');
    expect(tex).toContain('0.125000');
  });

  it('精确值由解析原函数与独立自适应 Simpson 两条路径互证', () => {
    const exact = definiteIntegralExact(PARABOLA_DOWN, [0, 2]);
    const numeric = adaptiveSimpson(PARABOLA_DOWN.f, 0, 2);
    expect(exact).toBeCloseTo(16 / 3, 12);
    expect(numeric).toBeCloseTo(exact, 10);
  });
});
