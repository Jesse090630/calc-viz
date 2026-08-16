import { describe, it, expect } from 'vitest';
import { validateChain } from '../../engine/validate';
import { paramsForStage, resolveTex } from '../../engine/store';
import { SHELL_METHOD_CHAIN as CHAIN, OBJ } from './chain';
import { shellVolumeExact } from '../../math/solids';
import { PARABOLA_DOWN } from '../../math/curves';

describe('Shell Method 链的数据完整性', () => {
  it('通过通用校验,零问题', () => {
    expect(validateChain(CHAIN)).toEqual([]);
  });

  it('有 9 步(8 步主线 + 5b 补充步)', () => {
    expect(CHAIN.stages).toHaveLength(9);
    expect(CHAIN.stages.map((s) => s.label)).toEqual([
      '1', '2', '3', '4', '5', '5b', '6', '7', '8',
    ]);
  });

  it('每一步显示的对象都在约定的对象表里', () => {
    const known = new Set<string>(Object.values(OBJ));
    for (const s of CHAIN.stages) {
      for (const id of s.show) {
        expect(known.has(id), `stage "${s.id}" shows unknown object "${id}"`).toBe(true);
      }
    }
  });

  it('⭐ 相机纪律:凡是有物体自动运动的步,延迟必须够相机先走完', () => {
    for (const s of CHAIN.stages) {
      if (s.autoplay) expect(s.autoplay.delayMs).toBeGreaterThanOrEqual(800);
    }
  });

  it('每一步的公式都能渲染成非空字符串(函数式 tex 不会炸)', () => {
    CHAIN.stages.forEach((s, i) => {
      const params = paramsForStage(CHAIN, i);
      for (const line of s.formula ?? []) {
        const tex = resolveTex(line.tex, params);
        expect(tex.length, `stage "${s.id}" produced an empty formula`).toBeGreaterThan(0);
        expect(tex).not.toMatch(/NaN|undefined|Infinity/);
      }
    });
  });
});

describe('链上显示的数字与 math core 一致', () => {
  it('最后一步显示的体积就是解析解 8π', () => {
    const last = CHAIN.stages[CHAIN.stages.length - 1];
    const tex = (last?.formula ?? []).map((l) => resolveTex(l.tex, {})).join(' ');
    expect(tex).toContain(shellVolumeExact(PARABOLA_DOWN).toFixed(4));
    expect(shellVolumeExact(PARABOLA_DOWN)).toBeCloseTo(8 * Math.PI, 12);
  });

  it('第 5b 步的 slab 与 ring 两个数字必须完全一致(这是该步的全部意义)', () => {
    const s = CHAIN.stages.find((x) => x.id === 'exact');
    const params = paramsForStage(CHAIN, CHAIN.stages.findIndex((x) => x.id === 'exact'));
    const nums = (s?.formula ?? [])
      .map((l) => resolveTex(l.tex, params))
      .map((t) => t.match(/=\s*([\d.]+)$/)?.[1])
      .filter((v): v is string => v !== undefined);
    expect(nums).toHaveLength(2);
    expect(nums[0]).toBe(nums[1]);
  });
});
