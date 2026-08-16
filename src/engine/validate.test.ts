import { describe, it, expect } from 'vitest';
import { validateChain } from './validate';
import type { Chain, Stage } from './types';

const stage = (over: Partial<Stage> = {}): Stage => ({
  id: 's',
  label: '1',
  title: 'T',
  narration: 'n',
  show: ['x'],
  camera: 'front',
  ...over,
});

const chain = (stages: Stage[], defaults: Record<string, number> = { a: 1 }): Chain => ({
  id: 'c',
  title: 'C',
  subtitle: 'c',
  defaultParams: defaults,
  stages,
});

describe('validateChain 放行合法的链', () => {
  it('最简链无问题', () => {
    expect(validateChain(chain([stage()]))).toEqual([]);
  });
});

describe('validateChain 抓得到数据错误', () => {
  const has = (problems: string[], re: RegExp) => problems.some((p) => re.test(p));

  it('重复的 stage id', () => {
    const r = validateChain(chain([stage({ id: 'a', label: '1' }), stage({ id: 'a', label: '2' })]));
    expect(has(r, /duplicate stage id/)).toBe(true);
  });

  it('空 narration', () => {
    expect(has(validateChain(chain([stage({ narration: '  ' })])), /empty narration/)).toBe(true);
  });

  it('控件指向未声明的参数(打错参数名是最常见的错)', () => {
    const r = validateChain(
      chain([stage({ controls: [{ param: 'typo', label: 'L', min: 0, max: 1, step: 0.1 }] })]),
    );
    expect(has(r, /not declared in chain.defaultParams/)).toBe(true);
  });

  it('滑块 min >= max', () => {
    const r = validateChain(
      chain([stage({ controls: [{ param: 'a', label: 'L', min: 5, max: 1, step: 0.1 }] })]),
    );
    expect(has(r, /min >= max/)).toBe(true);
  });

  it('参数初值落在自己滑块范围之外(拖之前画面就是错的)', () => {
    const r = validateChain(
      chain([stage({ controls: [{ param: 'a', label: 'L', min: 10, max: 20, step: 1 }] })]),
    );
    expect(has(r, /outside its own range/)).toBe(true);
  });

  it('⭐ autoplay 延迟太短 —— 会违反"相机与物体不同时动"的纪律', () => {
    const r = validateChain(
      chain([
        stage({
          camera: 'three-quarter',
          autoplay: { param: 'a', from: 0, to: 1, delayMs: 100, durationMs: 1000 },
        }),
      ]),
    );
    expect(has(r, /camera may still be moving/)).toBe(true);
  });

  it('steps 不是从 from 开头 / to 结尾', () => {
    const r = validateChain(
      chain([
        stage({
          autoplay: { param: 'a', from: 1, to: 8, steps: [2, 4, 6], delayMs: 900, durationMs: 900 },
        }),
      ]),
    );
    expect(has(r, /steps must start at from/)).toBe(true);
    expect(has(r, /steps must end at to/)).toBe(true);
  });

  it('autoplay from === to(等于什么都不会动)', () => {
    const r = validateChain(
      chain([stage({ autoplay: { param: 'a', from: 1, to: 1, delayMs: 900, durationMs: 500 } })]),
    );
    expect(has(r, /nothing would move/)).toBe(true);
  });

  it('一步里高亮超过一行', () => {
    const r = validateChain(
      chain([stage({ formula: [{ tex: 'a', highlight: true }, { tex: 'b', highlight: true }] })]),
    );
    expect(has(r, /highlighted formula lines/)).toBe(true);
  });

  it('公式超过 4 行(formula dumping)', () => {
    const r = validateChain(
      chain([stage({ formula: [{ tex: 'a' }, { tex: 'b' }, { tex: 'c' }, { tex: 'd' }, { tex: 'e' }] })]),
    );
    expect(has(r, /do not dump formulas/)).toBe(true);
  });

  it('一步既不显示对象也没有公式', () => {
    expect(has(validateChain(chain([stage({ show: [] })])), /would be blank/)).toBe(true);
  });
});
