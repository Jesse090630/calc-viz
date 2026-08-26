/**
 * `indeterminate.ts` 的测试。
 *
 * ⭐⭐ 这一节的**全部说服力**压在一条断言上:
 *   四个例子的「直接代入」结果**完全相同**,而四个例子的「结局」**两两不同**。
 * 这不是文案,是一个可以被机器验证的事实 —— 也正因为它可验证,
 * 「`0/0` 不告诉你任何事」才不是一句口号。
 */
import { describe, it, expect } from 'vitest';
import {
  A,
  BAR_SCALE_NOTE,
  CASES,
  HOLE_GAP,
  barLength,
  NOT_ENOUGH,
  VIEW,
  OTHER_FORMS,
  RACE_COPY,
  SETTLE,
  answerOf,
  denominator,
  isIndeterminate,
  ladder,
  limitByRates,
  limitTex,
  numerator,
  partsOf,
  probe,
  quotient,
  raceBars,
  raceBySampling,
  raceOf,
  ratesOf,
  sampleQuotient,
  showValue,
  showX,
  sideDirection,
  sideValue,
  substitutionForm,
  substitutionFormOf,
  verdictByRates,
  verdictBySampling,

  type Side,
} from './indeterminate';

const SIDES: readonly Side[] = ['left', 'right'];

describe('⭐⭐ 同一个代入结果,四个不同的结局', () => {
  it('四个例子的直接代入给出**同一个字符串**', () => {
    const forms = CASES.map(substitutionForm);
    expect(new Set(forms).size, `代入结果并不相同:${forms.join(' , ')}`).toBe(1);
    expect(forms[0]).toBe('0/0');
  });

  it('而四个结局**两两不同**', () => {
    // 这才是那句「WE NEED MORE INFORMATION」的依据。
    const answers = CASES.map((id) => answerOf(id));
    const shown = answers.map((a) => `${a.verdict}:${a.value}`);
    expect(new Set(shown).size, `结局撞了:${shown.join(' , ')}`).toBe(CASES.length);
    expect(answers.map((a) => a.verdict)).toEqual(['value', 'value', 'unbounded', 'jump']);
    expect(answers.map((a) => a.value)).toEqual([1, 0, null, null]);
  });

  it('⭐ 代入这一步确实**丢掉了**区分它们的信息', () => {
    // 形式化说法:`substitutionForm` 是常值函数,`answerOf` 不是。
    // 于是从代入结果**不可能**反推出结局 —— 那就是「不定式」的定义。
    const byForm = new Map<string, Set<string>>();
    for (const id of CASES) {
      const key = substitutionForm(id);
      const bucket = byForm.get(key) ?? new Set<string>();
      bucket.add(answerOf(id).verdict + String(answerOf(id).value));
      byForm.set(key, bucket);
    }
    expect(byForm.size).toBe(1);
    expect([...byForm.values()][0]!.size).toBe(4);
  });

  it('四个都真的落在不定式里(不是随手挑的四个例子)', () => {
    for (const id of CASES) {
      expect(isIndeterminate(id), id).toBe(true);
      expect(numerator(id, A)).toBe(0);
      expect(denominator(id, A)).toBe(0);
    }
  });

  it('⭐ 代入结果不是写死的常量 —— 用非零的输入钉住拼字符串那一步', () => {
    // ⚠️ 光看这四个例子**测不出**写死与算出来的区别:它们的结果本来就都是 0/0。
    //    (变异测试确认过:把 `substitutionForm` 改成 `return '0/0'`,整套测试全绿。)
    //    所以钉的是抽出来的 `substitutionFormOf`,喂它一对非零的输入。
    expect(substitutionFormOf(3, 0)).toBe('3/0');
    expect(substitutionFormOf(0, 5)).toBe('0/5');
    expect(substitutionFormOf(2, 7)).toBe('2/7');
    expect(substitutionFormOf(0, 0)).toBe('0/0');
    // 而四个例子确实是走这条路算出来的
    for (const id of CASES) {
      expect(substitutionForm(id), id).toBe(substitutionFormOf(numerator(id, A), denominator(id, A)));
    }
  });
});

describe('⭐⭐ 0/0 作为算术是没有定义的', () => {
  it('JS 里 0/0 是 NaN 且不报错 —— 先证明这个坑存在', () => {
    expect(0 / 0).toBeNaN();
    expect(Number.isNaN(0 / 0)).toBe(true);
  });

  it('四个例子在 x = 0 处都返回 null,不返回 NaN', () => {
    for (const id of CASES) {
      expect(quotient(id, A), id).toBeNull();
      expect(showValue(quotient(id, A))).toBe('undefined');
    }
  });

  it('非有限的输入也返回 null', () => {
    for (const id of CASES) {
      for (const x of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
        expect(quotient(id, x), `${id} @ ${x}`).toBeNull();
      }
    }
  });

  it('⚠️ 次正规数不会漏出 Infinity', () => {
    // x/x² 在 1e-200 处是 1e200(还好),1e-320 处会溢出。
    expect(quotient('faster-bottom', 1e-320)).toBeNull();
  });
});

describe('⭐ 两条独立路径给出同一个结局', () => {
  it('幂次算术 vs 取样', () => {
    for (const id of CASES) {
      expect(verdictBySampling(id), id).toBe(verdictByRates(id));
    }
  });

  it('竞速:幂次 vs 取样', () => {
    for (const id of CASES) {
      expect(raceBySampling(id), id).toBe(raceOf(id));
    }
  });

  it('收敛的两个例子,取样值确实趋向推理值', () => {
    for (const id of ['same', 'faster-top'] as const) {
      const target = limitByRates(id)!;
      for (const side of SIDES) {
        const values = probe(id, side);
        const last = values[values.length - 1]!;
        expect(Math.abs(last - target), `${id} ${side}`).toBeLessThan(SETTLE);
      }
    }
  });

  it('⚠️ 容差不能比阶梯还紧 —— 这条挡住一个真出现过的误判', () => {
    // x²/x 在 10⁻⁸ 处两侧读到 ±10⁻⁸,差 2×10⁻⁸。
    const left = probe('faster-top', 'left');
    const right = probe('faster-top', 'right');
    const gap = Math.abs(left[left.length - 1]! - right[right.length - 1]!);
    expect(gap).toBeGreaterThan(1e-9); // 曾经的容差
    expect(gap).toBeLessThan(SETTLE); // 现在的容差
    expect(verdictBySampling('faster-top')).toBe('value');
  });
});

describe('四个例子各自的行为', () => {
  it('A：x/x 对每个 x ≠ 0 都精确地是 1', () => {
    for (const x of [-2, -0.3, -1e-7, 1e-7, 0.3, 2]) {
      expect(quotient('same', x)).toBe(1);
    }
    expect(limitByRates('same')).toBe(1);
  });

  it('B：x²/x 化简成 x,于是极限是 0', () => {
    for (const x of [-2, -0.3, 0.75, 2]) {
      expect(quotient('faster-top', x)).toBeCloseTo(x, 12);
    }
    expect(limitByRates('faster-top')).toBe(0);
  });

  it('C：x/x² 化简成 1/x,两侧跑向相反方向且无界', () => {
    for (const x of [-0.5, 0.5, 0.01]) {
      expect(quotient('faster-bottom', x)).toBeCloseTo(1 / x, 9);
    }
    expect(verdictByRates('faster-bottom')).toBe('unbounded');
    expect(sideDirection('faster-bottom', 'left')).toBe('down');
    expect(sideDirection('faster-bottom', 'right')).toBe('up');
    // ⚠️ 无界时**没有数**可显示。
    for (const side of SIDES) expect(sideValue('faster-bottom', side)).toBeNull();
  });

  it('D：|x|/x 左边 −1、右边 +1', () => {
    expect(quotient('sign-jump', -3)).toBe(-1);
    expect(quotient('sign-jump', 3)).toBe(1);
    expect(sideValue('sign-jump', 'left')).toBe(-1);
    expect(sideValue('sign-jump', 'right')).toBe(1);
    expect(verdictByRates('sign-jump')).toBe('jump');
  });

  it('⚠️ B 的两侧显示值是 0,不是 −0.0000', () => {
    for (const side of SIDES) {
      expect(sideValue('faster-top', side)).toBe(0);
      expect(showValue(sideValue('faster-top', side))).toBe('0.0000');
      expect(showValue(sideValue('faster-top', side)).startsWith('-')).toBe(false);
    }
  });

  it('化简式只在 x ≠ 0 时等于原式 —— 两者在别处必须一致', () => {
    for (const id of CASES) {
      const { simplified } = partsOf(id);
      for (const x of [-1.7, -0.4, 0.25, 1.9]) {
        expect(quotient(id, x)!, `${id} @ ${x}`).toBeCloseTo(simplified(x), 12);
      }
    }
  });

  it('⚠️ 但化简式在 0 处**有**值,原式没有 —— 这就是那个洞', () => {
    for (const id of ['same', 'faster-top', 'sign-jump'] as const) {
      expect(Number.isFinite(partsOf(id).simplified(A)), id).toBe(true);
      expect(quotient(id, A), id).toBeNull();
    }
  });
});

describe('竞速条', () => {
  it('两根条按同一个起点归一化,起点处都是满的', () => {
    for (const id of CASES) {
      const start = raceBars(id, 1);
      expect(start.topFraction, id).toBeCloseTo(1, 12);
      expect(start.bottomFraction, id).toBeCloseTo(1, 12);
    }
  });

  it('条长一路单调缩短,不会反弹', () => {
    for (const id of CASES) {
      let previousTop = Number.POSITIVE_INFINITY;
      let previousBottom = Number.POSITIVE_INFINITY;
      for (const x of [1, 0.7, 0.4, 0.2, 0.05, 0.01]) {
        const bars = raceBars(id, x);
        expect(bars.topFraction, `${id} top @ ${x}`).toBeLessThanOrEqual(previousTop + 1e-12);
        expect(bars.bottomFraction, `${id} bottom @ ${x}`).toBeLessThanOrEqual(previousBottom + 1e-12);
        previousTop = bars.topFraction;
        previousBottom = bars.bottomFraction;
      }
    }
  });

  it('⭐ 显示长度保序,而且**小 x 处两根条仍然分得开**', () => {
    expect(barLength(1)).toBe(1);
    expect(barLength(0)).toBe(0);
    expect(barLength(-1)).toBe(0);
    expect(barLength(Number.NaN)).toBe(0);
    // 保序
    let previous = Number.POSITIVE_INFINITY;
    for (const f of [1, 0.5, 0.1, 0.01, 1e-4, 1e-6]) {
      const length = barLength(f);
      expect(length).toBeLessThan(previous);
      expect(length).toBeGreaterThan(0);
      previous = length;
    }
    // ⚠️ 这才是压缩存在的理由:x = 0.01 时按比例画,两根条差 0.0099 ——
    //    在一条 200 px 的轨道上是**两个像素**。压缩之后差 0.17,看得见。
    const bars = raceBars('faster-top', 0.01);
    expect(Math.abs(bars.topFraction - bars.bottomFraction)).toBeLessThan(0.01);
    expect(Math.abs(barLength(bars.topFraction) - barLength(bars.bottomFraction))).toBeGreaterThan(0.1);
  });

  it('⚠️ 压缩过就要在界面上说出来', () => {
    expect(BAR_SCALE_NOTE).toContain('cube-rooted');
    expect(BAR_SCALE_NOTE).toContain('exact');
  });

  it('⭐ 竞速的结论与结局对得上', () => {
    expect(raceOf('faster-top')).toBe('top-faster');
    expect(verdictByRates('faster-top')).toBe('value');
    expect(limitByRates('faster-top')).toBe(0);

    expect(raceOf('faster-bottom')).toBe('bottom-faster');
    expect(verdictByRates('faster-bottom')).toBe('unbounded');

    expect(raceOf('same')).toBe('same-rate');
    expect(limitByRates('same')).toBe(1);
  });

  it('三句解说各不相同,而且都不许说出「等于无穷」', () => {
    const words = Object.values(RACE_COPY).map((c) => `${c.words} ${c.then}`);
    expect(new Set(words).size).toBe(3);
    for (const w of words) expect(w.toLowerCase()).not.toContain('equals infinity');
    expect(RACE_COPY['bottom-faster'].then).toContain('without bound');
  });
});

describe('画曲线', () => {
  it('⚠️ 取样点里没有 0 —— 踩中它会得到 NaN,而 NaN 不报错', () => {
    for (const id of CASES) {
      const points = sampleQuotient(id);
      expect(points.some((p) => p.x === 0), id).toBe(false);
      expect(points.every((p) => p.y !== null), id).toBe(true);
    }
  });

  it('⚠️ 换成任何点数都不许踩中 0(第一版就是在某个点数上踩中的)', () => {
    for (const count of [7, 8, 100, 101, 400, 401]) {
      for (const id of CASES) {
        const points = sampleQuotient(id, VIEW.from, VIEW.to, count);
        expect(points.some((p) => p.x === 0), `${id} @ count=${count}`).toBe(false);
        expect(points.every((p) => p.y !== null), `${id} @ count=${count}`).toBe(true);
      }
    }
  });

  it('原点两侧各自停在缝边上,缝里一个点都没有', () => {
    for (const id of CASES) {
      const xs = sampleQuotient(id).map((p) => p.x);
      expect(xs.some((x) => x > -HOLE_GAP && x < HOLE_GAP), id).toBe(false);
      expect(Math.max(...xs.filter((x) => x < 0))).toBeCloseTo(-HOLE_GAP, 12);
      expect(Math.min(...xs.filter((x) => x > 0))).toBeCloseTo(HOLE_GAP, 12);
    }
  });

  it('⚠️ 取样跨过原点两侧 —— 否则 D 的跳跃根本不在画面里', () => {
    for (const id of CASES) {
      const points = sampleQuotient(id);
      expect(points.some((p) => p.x < 0), id).toBe(true);
      expect(points.some((p) => p.x > 0), id).toBe(true);
    }
  });

  it('D 的取样值只有 ±1,中间没有过渡', () => {
    const ys = sampleQuotient('sign-jump').map((p) => p.y!);
    expect(new Set(ys.map((y) => Math.round(y)))).toEqual(new Set([-1, 1]));
    for (const y of ys) expect(Math.abs(Math.abs(y) - 1)).toBeLessThan(1e-12);
  });
});

describe('阶梯与显示', () => {
  it('十进位必须精确 —— 10 ** -k 不是', () => {
    for (const side of SIDES) {
      ladder(side).forEach((x, i) => {
        expect(Math.abs(x)).toBe(Number(`1e-${i + 1}`));
        expect(Math.sign(x)).toBe(side === 'left' ? -1 : 1);
      });
    }
  });

  it('极小的 x 用科学记数,不显示成 0.0000', () => {
    expect(showX(1e-6)).not.toBe('0.0000');
    expect(showX(1e-6)).toContain('10');
    expect(showX(-0.25)).toBe('-0.2500');
  });

  it('四个 TeX 式子互不相同', () => {
    const texs = CASES.map(limitTex);
    expect(new Set(texs).size).toBe(4);
    for (const t of texs) expect(t).toContain('\\lim');
  });
});

describe('别的不定式:只列形状,不给答案', () => {
  it('七个形状都在', () => {
    expect(OTHER_FORMS).toHaveLength(7);
    const texs = OTHER_FORMS.map((f) => f.tex);
    expect(new Set(texs).size).toBe(7);
    for (const want of ['\\frac{0}{0}', '\\frac{\\infty}{\\infty}', '0 \\cdot \\infty', '\\infty - \\infty', '1^{\\infty}', '0^{0}', '\\infty^{0}']) {
      expect(texs).toContain(want);
    }
  });

  it('⭐ 结构上写不出「某个不定式 = 某个数」', () => {
    // 这张表**没有** answer / value / limit 字段。这条断言守的是那个缺席。
    for (const form of OTHER_FORMS) {
      expect(Object.keys(form).sort()).toEqual(['name', 'tex']);
    }
  });
});

describe('那句结论', () => {
  it('页面上的落点是「还需要更多信息」,不是某个数', () => {
    expect(NOT_ENOUGH).toBe('WE NEED MORE INFORMATION');
    expect(NOT_ENOUGH).not.toMatch(/\d/);
  });

  it('无界的那一档不说「等于无穷」', () => {
    const answer = answerOf('faster-bottom');
    expect(answer.headline).toContain('without bound');
    expect(answer.headline.toLowerCase()).not.toContain('equals');
    expect(answer.tex).not.toContain('\\infty');
  });

  it('文案是从 verdict 推出来的 —— 同一个 verdict 给同一句话', () => {
    // A 与 B 都是 'value',句式必须一致,只有那个数不同。
    const a = answerOf('same');
    const b = answerOf('faster-top');
    expect(a.headline.replace(String(a.value), '#')).toBe(b.headline.replace(String(b.value), '#'));
  });
});

describe('幂次表描述形状,不藏答案', () => {
  it('⚠️ 表里只有幂次与符号 —— 没有任何一处写着 1 / 0 / DNE', () => {
    // 结论是 `verdictByRates` **算**出来的。如果表里直接存了答案,
    // 「两条独立路径」就退化成一条。这条断言守的是那个结构。
    for (const id of CASES) {
      expect(Object.keys(ratesOf(id)).sort()).toEqual([
        'bottomPower', 'coefficient', 'signFlips', 'topPower',
      ]);
    }
  });

  it('幂次确实描述了这四个函数 —— 用比值的增长率反查', () => {
    for (const id of CASES) {
      const r = ratesOf(id);
      // |f(x)| ≈ |x|^(top − bottom)。取两个十进位档,看比值差了几个数量级。
      const near = Math.abs(quotient(id, 1e-4)!);
      const far = Math.abs(quotient(id, 1e-2)!);
      const decades = -Math.log10(near / far) / 2;
      expect(decades, id).toBeCloseTo(r.topPower - r.bottomPower, 6);
    }
  });
});
