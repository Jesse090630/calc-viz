import { describe, it, expect } from 'vitest';
import { validateChain } from '../../engine/validate';
import { paramsForStage, resolveTex } from '../../engine/store';
import { DISK_METHOD_CHAIN as CHAIN, OBJ } from './chain';
import { SHELL_METHOD_CHAIN } from '../shell-method/chain';
import { diskVolumeExact, shellVolumeExact } from '../../math/solids';
import { PARABOLA_DOWN, PARABOLA_INVERSE } from '../../math/curves';

describe('Disk 链的数据完整性', () => {
  it('通过通用校验,零问题', () => {
    expect(validateChain(CHAIN)).toEqual([]);
  });

  it('每一步显示的对象都在约定的对象表里', () => {
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

  it('所有公式都能渲染,不出现 NaN / undefined', () => {
    CHAIN.stages.forEach((s, i) => {
      const params = paramsForStage(CHAIN, i);
      for (const line of s.formula ?? []) {
        const tex = resolveTex(line.tex, params);
        expect(tex.length).toBeGreaterThan(0);
        expect(tex).not.toMatch(/NaN|undefined|Infinity/);
      }
    });
  });

  it('两条链的 id 不冲突(路由靠它区分)', () => {
    expect(CHAIN.id).not.toBe(SHELL_METHOD_CHAIN.id);
  });
});

describe('⭐ 引擎通用性验收 —— 第二个概念不许改 engine', () => {
  it('Disk 链只用了 Stage 已有的字段,没有出现新字段', () => {
    const allowed = new Set([
      'id', 'label', 'title', 'narration', 'altText', 'show', 'camera', 'params', 'controls', 'formula', 'autoplay',
    ]);
    for (const s of CHAIN.stages) {
      for (const key of Object.keys(s)) {
        expect(allowed.has(key), `stage "${s.id}" 用了 engine 不认识的字段 "${key}"`).toBe(true);
      }
    }
  });

  it('两条链结构同构 —— 说明 Chain 这个类型确实够用', () => {
    for (const c of [CHAIN, SHELL_METHOD_CHAIN]) {
      expect(Object.keys(c).sort()).toEqual(
        ['defaultParams', 'id', 'stages', 'subtitle', 'title'].sort(),
      );
    }
  });
});

describe('链上的数字与 math core 一致', () => {
  it('⭐ 最后一步的落点成立:两种切法同一个 8π', () => {
    expect(diskVolumeExact(PARABOLA_INVERSE)).toBeCloseTo(
      shellVolumeExact(PARABOLA_DOWN),
      10,
    );
    const last = CHAIN.stages[CHAIN.stages.length - 1];
    const tex = (last?.formula ?? []).map((l) => resolveTex(l.tex, {})).join(' ');
    expect(tex).toContain(diskVolumeExact(PARABOLA_INVERSE).toFixed(4));
  });

  it('5b 步在任意 n 下显示的误差都是 0.0000%', () => {
    const i = CHAIN.stages.findIndex((s) => s.id === 'exact');
    const stage = CHAIN.stages[i];
    for (const n of [1, 2, 7, 40]) {
      const tex = (stage?.formula ?? [])
        .map((l) => resolveTex(l.tex, { ...paramsForStage(CHAIN, i), n }))
        .join(' ');
      expect(tex).toContain('0.0000\\%');
    }
  });
});
