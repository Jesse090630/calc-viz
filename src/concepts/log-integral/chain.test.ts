import { describe, it, expect } from 'vitest';
import { validateChain } from '../../engine/validate';
import { paramsForStage, resolveTex } from '../../engine/store';
import { LOG_INTEGRAL_CHAIN as CHAIN, OBJ, DISPLAY, LIMIT_VALUE, E_BASE } from './chain';
import { areaUnderReciprocal, powerAntiderivativeAt, stretchSquash } from '../../math/logIntegral';

describe('log-integral 链的数据完整性', () => {
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

  it('每一步都有 altText(W5 无障碍要求)', () => {
    for (const s of CHAIN.stages) {
      expect(s.altText, `stage "${s.id}" 缺 altText`).toBeTruthy();
      expect(s.altText!.length).toBeGreaterThan(55);
    }
  });

  it('narration 都是单句(AGENTS.md 文案纪律)', () => {
    for (const s of CHAIN.stages) {
      const sentences = s.narration.split(/[.!?](\s|$)/).filter((x) => x.trim().length > 0);
      expect(sentences.length, `stage "${s.id}" narration 超过一句`).toBeLessThanOrEqual(2);
    }
  });

  it('相机纪律:自动运动的步延迟 ≥ 800ms', () => {
    for (const s of CHAIN.stages) {
      if (s.autoplay) expect(s.autoplay.delayMs).toBeGreaterThanOrEqual(800);
    }
  });

  it('只用了 engine 认识的字段', () => {
    const allowed = new Set([
      'id', 'label', 'title', 'narration', 'altText', 'show', 'camera', 'params', 'controls', 'formula', 'autoplay',
    ]);
    for (const s of CHAIN.stages) {
      for (const key of Object.keys(s)) {
        expect(allowed.has(key), `stage "${s.id}" 用了未知字段 "${key}"`).toBe(true);
      }
    }
  });

  it('⭐ 所有滑块档位渲染出的公式都不含 NaN', () => {
    CHAIN.stages.forEach((s, i) => {
      const base = paramsForStage(CHAIN, i);
      for (const control of s.controls ?? []) {
        for (let v = control.min; v <= control.max + 1e-9; v += control.step) {
          const tex = (s.formula ?? [])
            .map((l) => resolveTex(l.tex, { ...base, [control.param]: v }))
            .join(' ');
          expect(tex, `stage "${s.id}" ${control.param}=${v}`).not.toMatch(/NaN|Infinity/);
        }
      }
    });
  });
});

describe('链上的数字与 math core 一致', () => {
  const texAt = (id: string, extra: Record<string, number> = {}): string => {
    const i = CHAIN.stages.findIndex((s) => s.id === id);
    const params = { ...paramsForStage(CHAIN, i), ...extra };
    return (CHAIN.stages[i]?.formula ?? []).map((l) => resolveTex(l.tex, params)).join(' ');
  };

  it('第 2 步逐档显示 0.828427 → 0.717735 → 0.695555 → 0.693387 → 0.693171', () => {
    const expected = ['0.828427', '0.717735', '0.695555', '0.693387', '0.693171'];
    expected.forEach((v, ni) => expect(texAt('watch-it-break', { ni })).toContain(v));
  });

  it('⭐ 第 2 步最后一档(n = −1)显示 undefined,不是某个数', () => {
    const tex = texAt('watch-it-break', { ni: 5 });
    expect(tex).toContain('undefined');
    expect(powerAntiderivativeAt(-1, 2)).toBeNull();
  });

  it('第 3 步点明 0/0 并给出极限 0.693147', () => {
    const tex = texAt('zero-over-zero');
    expect(tex).toContain('\\frac{0}{0}');
    expect(tex).toContain('0.693147');
  });

  it('⭐ 第 4 步的 A(2) 与第 3 步的极限是同一个数', () => {
    expect(texAt('that-number')).toContain(LIMIT_VALUE.toFixed(6));
    expect(texAt('zero-over-zero')).toContain(LIMIT_VALUE.toFixed(6));
    expect(LIMIT_VALUE).toBeCloseTo(0.693147, 6);
  });

  it('⭐ 第 5 步两块面积显示同一个值(整条链的支点)', () => {
    const tex = texAt('stretch-squash');
    const first = areaUnderReciprocal(2)!;
    const second = areaUnderReciprocal(4)! - areaUnderReciprocal(2)!;
    expect(first.toFixed(6)).toBe(second.toFixed(6));
    expect(tex).toContain(first.toFixed(6));
  });

  it('第 6 步给出代换证明与 A(2)+A(4)=A(8)', () => {
    const tex = texAt('times-becomes-plus');
    expect(tex).toContain('x=bu');
    expect(tex).toContain((areaUnderReciprocal(2)! + areaUnderReciprocal(4)!).toFixed(6));
  });

  it('第 7 步的 e 来自 A(t)=1,与 2.718282 吻合', () => {
    expect(texAt('only-logs')).toContain(E_BASE.toFixed(6));
    expect(E_BASE).toBeCloseTo(2.718282, 5);
  });

  it('第 8 步把 n = −1 那一格填上 ln|x|', () => {
    expect(texAt('that-is-why')).toContain('\\ln|x| + C');
  });
});

describe('⚠️ 显示坐标必须是纯缩放,不许平移', () => {
  it('原点映射到原点', () => {
    expect(DISPLAY.toX(0)).toBe(0);
  });

  it('⭐ 横拉 b 在显示坐标里仍然是关于原点的伸缩', () => {
    // 一旦 toX 里混进平移,这条就会崩 —— 而第 5 步的支点正建立在它上面
    for (const b of [1.5, 2, 3]) {
      for (const x of [1, 1.7, 2.4]) {
        expect(DISPLAY.toX(x * b)).toBeCloseTo(DISPLAY.toX(x) * b, 12);
      }
    }
  });

  it('显示高度按 1/b 压缩,与 stretchSquash 一致', () => {
    for (const b of [1.5, 2]) {
      for (const x of [1, 2]) {
        const [, y] = stretchSquash([x, DISPLAY.toY(x)], b);
        expect(DISPLAY.toY(x * b)).toBeCloseTo(y, 12);
      }
    }
  });

  it('面积只被乘上一个常数,相等关系保留', () => {
    const k = DISPLAY.xScale * DISPLAY.yScale;
    const first = areaUnderReciprocal(2)! * k;
    const second = (areaUnderReciprocal(4)! - areaUnderReciprocal(2)!) * k;
    expect(first).toBeCloseTo(second, 9);
  });
});
